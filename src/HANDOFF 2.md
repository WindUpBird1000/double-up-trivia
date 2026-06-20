# Double Up Trivia — Handoff Update

This document picks up where the original `HANDOFF.md` left off. It covers everything added, changed, or decided since that document was written — features, schema changes, bugs fixed, and design decisions that aren't obvious from the code alone. Read this alongside the original handoff, not instead of it; the original is still accurate for the foundational architecture, scoring algorithms, and token system.

---

## Stack additions since original handoff

- **Vercel Analytics** (`@vercel/analytics`) — wired up via `src/index.js` (NOT `App.jsx`), added through a merged GitHub PR
- **Vercel Speed Insights** (`@vercel/speed-insights`) — wired up via `App.jsx`, wrapped around the main component (see below)
- **Custom domain**: `doubleuptrivia.com`, registered through Vercel
- **Tabler Icons webfont** — loaded via CDN in `index.html` (`@tabler/icons-webfont`), used for the `ti-photo` image icon throughout the app

### How Speed Insights is wired into App.jsx
`QuizApp` (the original massive component) is no longer the default export. It's wrapped:
```js
const App = () => (
  <>
    <QuizApp />
    <SpeedInsights />
  </>
);
export default App;
```
This was deliberately done as a wrapper rather than touching `QuizApp`'s internals, since `QuizApp` has dozens of early `return` statements based on `mode` — injecting `<SpeedInsights/>` into each one (which an automated PR attempted and got wrong) risks bugs like accidentally replacing a fallback `return null` with `return <SpeedInsights/>`, which would render a blank screen. **If asked to add similar global components in the future, use this wrapper pattern, not per-branch insertion.**

### Vercel Agent / PR workflow gotcha
If the user uses "install automatically with Vercel Agent" features, it creates a **GitHub Pull Request**, not a direct change to `main`. It often defaults to **Draft** status. The user must manually: open the PR → click "Ready for review" if draft → "Merge pull request" → wait for Vercel to auto-redeploy. This caused real confusion once (the agent reported "Successfully installed" when it had only opened a PR). A second PR (Speed Insights) had merge conflicts with `App.jsx` and contained a dangerous bug (see above) — it was closed without merging, and Speed Insights was added manually instead. **If the user mentions a Vercel Agent installation, check whether it actually merged to `main` before assuming it's live.**

---

## Major features added since original handoff

### 1. Additional Context / "Why?" links
Each question (OR, DD, MN) can have an optional `additionalContext` field, shown as a "(Why?)" link on the scoreboard that expands inline to show the explanation text. Toggled via `whyOpenIndex` state.

### 2. Data Dash comma-formatted answers
`correctAnswerDisplay` field stores the *exact string* the admin typed (e.g., `"150,000"` vs `"1978"`), separate from `correctAnswer` (the parsed number used for math). A top-level `ddDisplay(q)` function handles this everywhere. **Important**: the user's own typed answer was originally displayed without commas in several places (the comma-stripped parsing string was reused for display) — this has been fixed everywhere it was found, but if a new DD display location is added, remember to format with `.toLocaleString()` for display while keeping the raw parsed value for math.

### 3. Punctuation-insensitive answer matching
`normalizeAnswer()` (top-level function) now strips common punctuation (periods, commas, apostrophes, quotes, hyphens, colons, semicolons, `!`, `?`) before comparing answers, while protecting decimal points between digits (`3.14` stays `3.14`). This applies everywhere OR/MN answers are matched, including the standalone Scoring Grid tool (which has its own duplicate `normalize()` function — see below).

### 4. B/I/U formatting tags + Image tags + Center tag
- Quiz prompts support `{{b:text}}`, `{{i:text}}`, `{{u:text}}`, `{{image:filename.jpg}}`, `{{center:text}}`
- Rendered via top-level `renderPrompt()` (block-level, handles images/center) and `renderInlineFormatting()` (inline b/i/u only)
- `FormatToolbar` component provides B/I/U buttons above prompt textareas in the quiz builder (select text, click button, wraps it)
- **Author's Note and admin Messages use plain HTML tags instead** (`<b>`, `<i>`, `<u>`), rendered via `dangerouslySetInnerHTML` — this is a different system from the `{{}}` tags. Don't confuse the two.
- `getPromptPreview()` strips/converts tags for truncated previews (audit tables, dispute tables); `getPromptPreviewPlain()` fully strips to plain text (used in places like the old dispute email)

### 5. Image popups
- `extractImages(text)` — top-level function, regex-extracts all `{{image:...}}` filenames from a string, returns `/images/filename` paths
- Image icon (`ti-photo` from Tabler) appears in a dedicated narrow column wherever questions are listed (dispute screen, audit tables, scoreboards) — only when that question actually has an image
- Clicking opens a centered popup (max 580px container, images capped at 500px wide), dark backdrop, click-to-close
- `ScoreboardScreen` has its own local `imagePopupUrls` state (separate from `QuizApp`'s) since it's a different component

### 6. Question reordering (Swap dropdown)
- Quiz builder shows a "Swap with…" dropdown between the question counter and the chevron navigation
- **Only visible when quiz status is `Inactive`** — deliberately hidden for Active/Scored quizzes, since reordering questions on a live or scored quiz could create confusion among users who took it at different times, or subtly change difficulty via clue-adjacency
- Swapping is instant (no save required), and the editor follows the *content* you were editing to its new position, not the position number

### 7. Dispute resolution system (replaced email-based disputes)
This is the biggest system added. Originally disputes were emailed to the admin with a link back to the Score Auditor. **This has been fully replaced** with an in-app system:

- **`disputes` table** (Supabase) — one row per disputed question per user. Columns: `id`, `created_at`, `quiz_key`, `user_id`, `display_name`, `question_index`, `question_text`, `user_answer`, `correct_answer_display`, `reason`, `status` (`pending`/`resolved`), `resolution` (`accepted`/`denied`, null until resolved), `resolved_at`
- When a user submits a dispute (Dispute screen, post-quiz), it inserts directly into `disputes` — **no email is sent anymore**, this was a deliberate decision after confirming the in-app flow worked well
- Admin sees a red "⚠ X unresolved disputes" badge under any quiz's title in Existing Quizzes (`disputeCounts` state, refreshed via `fetchDisputeCounts()` on admin login)
- Clicking the badge opens a resolution popup (`disputeResolutionQuizKey`, `disputeQueue`, `disputeQueueIndex` state) showing one dispute at a time: question, their answer, correct answer, their reason, and an optional admin reason textarea
- **Accept** appends the answer to that question's `acceptedAnswers` (or denies — does nothing to quiz data, just records the decision); **Deny** just marks resolved with no data change
- **Auto-cascade**: resolving one dispute automatically resolves any other *pending* dispute on the same question with the same (normalized) answer — both Accept and Deny cascade this way, since the underlying decision is about the answer, not the individual disputer
- **Scored-status gate**: `saveQuizLocally` blocks changing a quiz's status to Scored if it has pending disputes — shows a `window.confirm` and either opens the resolution popup or resets the status dropdown to Active
- **DD-specific behavior**: DD questions have no `acceptedAnswers` array (just `correctAnswer`, a number), so Accept/Deny on a DD dispute never touches quiz data — it's purely a communication mechanism. This was confirmed correct by the user; whatever manual fix is needed for a DD dispute (changing the answer, throwing out the question) is done separately via the Quiz Editor.

### 8. Resolution notification messages (`resolutions` table)
When a dispute is resolved, a personal message is generated and shown to that specific user **only**, the next time they log in:
- **`resolutions` table**: `id`, `user_id`, `title` (always "Dispute Resolution"), `body`, `resolved_at`
- Message text varies by accepted/denied and quiz type (DD gets a vaguer "will be communicated later" message since there's no automatic data change to point to)
- Optional admin reason is appended as "Reason: ..." if provided, omitted entirely if blank
- These merge into the same login-time interstitial as broadcast messages (see below)

### 9. Login-time message check now runs on session restore, not just explicit login
**This was a real bug fix.** Originally, `last_login_at` only updated and the unread-message check only ran during explicit `handleLogin()` (i.e., typing in email/password and submitting). But Supabase Auth sessions persist silently across browser restarts — a user could stay "logged in" for days via session restore (`getSession()`), during which they'd never see new broadcast messages or dispute resolutions, and `last_login_at` would stay stale, making the admin's profiles table look like users weren't active when they actually were.

**Fix**: extracted a shared `checkUnreadMessagesAndAdvance(loginUser)` function, called from both `handleLogin()` and the `getSession()` session-restore callback in the main mount `useEffect`. Now `last_login_at` advances and unread messages/resolutions surface on every app load with a valid session, not just explicit logins. **`last_login_at` in `profiles` is now a much more reliable "last time the app was opened" signal** — if checking user engagement, prefer this, or even better, `MAX(started_at)` from `quiz_attempts` for genuine usage evidence.

### 10. Audit deep-link from disputes (now partially obsolete)
There's a `?audit=quizKey&season=Season1` URL param handler that auto-navigates an admin straight to a specific quiz in the Score Auditor after login. This was built to support a dispute-email link. **Since disputes no longer email**, this deep-link mechanism is currently unused but still functional — it doesn't hurt anything, just isn't triggered by anything anymore. Could be removed or repurposed.

### 11. "Important" messages + `message_status` table
Solves the gap where a new user, on their very first login, would never see any broadcast messages (since `last_login_at` defaults to "now" specifically to avoid burying new users in old messages).

- **`messages` table gained a new column**: `important` (bool, default `false`)
- **New `message_status` table**: `id`, `user_id`, `message_id`, `created_at` — existence of a row means "this user has seen this message"
- Admin Messages screen: "Important?" checkbox, top-right of the compose card, unchecked by default, **toggleable at any time, including after publishing**
- **Messages are now fully editable after publishing** — this was a deliberate decision change from the original design (which locked published messages as read-only). The admin explicitly accepted the tradeoff that different users might see different versions of an edited message, and that there's no historical record of exactly what version someone saw.
- On every login, in addition to the normal `last_login_at`-based check, the app separately queries all `important=true` messages and cross-references `message_status` for that user — anyone not yet recorded as having seen it gets shown it (and a `message_status` row is inserted immediately, optimistically, before they finish clicking through the interstitial)
- **One-time manual backfill was needed**: when the admin flagged their first message Important, they had to manually insert `message_status` rows for all existing users (`insert into message_status (user_id, message_id) select id, '<msg-uuid>' from auth.users;`) so existing users who'd already seen the message wouldn't see it again. This was a one-time gap-closing step, not something that should recur.

### 12. Scoreboard answer-display unification
**Significant refactor.** The admin-facing "[User]'s Answers" drill-down (click any name on a scoreboard) and the player's own "Your Results" view used to be two separate, drifting code blocks — the admin one was noticeably older/uglier (raw `{{tags}}` showing, no icon columns, different layout). They are now **one shared function**, `renderAnswerBreakdown(answers, attempt, userId)`, defined inline in `ScoreboardScreen` and called by both blocks with their respective data (`selectedAnswers`/`selectedAttempt`/`selectedUserId` for admin, `myAnswers`/`myAttempt`/`currentUser?.id` for the player). **Any future visual or logic change to how answers are displayed only needs to happen once now** — this was explicitly requested by the user specifically to prevent future drift between the two views.

Layout convention established for all three quiz types' answer rows: token icon column (far left, fixed width, centered) → image icon column (centered) → question text → right-side stat block. The right-side stat block's line order matters for visual coherence: **uncolored stats first** (count, value, correct answer), **then the colored pair adjacent to each other** (Your Answer, Your Score) — this avoids a "random-looking" effect where two color-coded lines are separated by an uncolored line.

### 13. Scoring Grid — now supports all three quiz types
The standalone "Scoring Grid" tool (opens in a new browser tab via Blob URL, generated by `openScoringGrid()`) was originally **OR-only** and would throw `Cannot read properties of undefined (reading 'some')` on DD or MN quizzes, because it assumed every question has `q.acceptedAnswers` (an array) — DD questions only have `q.correctAnswer` (a number).

Now branches on `quizType` fetched from Supabase:
- **OR** (and FITB/combination by extension): unchanged — difficulty ranking, all four tokens, ✓/✗
- **DD**: rank-by-closeness scoring (mirrors `computeQuizResults`'s DD branch exactly), only Doubler applies, no ✓/✗ concept, shows answer + difference. **No per-question point-value header** — DD has no fixed point value per question (it's rank-dependent on submissions), so showing one was a bug (it was accidentally showing one specific user's personal score as if it were a shared max) — now removed for DD only.
- **MN**: clue-tier fixed scoring (20/15/10/5), no tokens, no difficulty ranking, shows clue-used badge + ✓/✗

**Critical implementation note**: this tool's logic lives inside a giant JS template literal (the generated HTML page's `<script>` tag), nested inside the React `App.jsx` file. Escaping is double-layered — when editing this function, after making changes, **extract and parse the actual generated script as standalone JS** to verify correctness, rather than trusting that the outer template literal "looks right." There's a known-good extraction technique used repeatedly in this project:
```js
// 1. Extract the template literal from App.jsx source
// 2. Pull out the <script>...</script> content
// 3. Unescape one level of backslash-escaping (since it's nested in a JS template literal)
// 4. Parse the result with @babel/parser as sourceType: 'script'
```
This caught a real bug once (a `q` vs `_` parameter naming mismatch, see below) that wasn't visible from reading the source — the bug only manifested as a runtime `ReferenceError` in `runAudit`, a *different* function, not the Scoring Grid itself, illustrating how easy it is to miss scope bugs in this kind of code without actually testing the generated output.

### 14. Quiz Archiving
Solves the long-term growth problem of the Scored quiz list (Active/Inactive are self-limiting, Scored only accumulates).

- `archived` is a boolean field stored inside each quiz's `data` JSON blob (not a new column, not a new table) — same pattern as `activeNotificationSent`
- **Purely a display-layer flag with zero effect on `status`-driven behavior.** Archiving an Active quiz (an edge case the user explicitly tested) does not affect whether it's takeable, shows in dropdowns, etc. — confirmed by grepping every reference to `.archived` in the codebase.
- One-click toggle button (file cabinet icon, `Archive` from lucide-react) in each quiz row of Existing Quizzes, between Edit and Delete
- "Show Archives?" checkbox in the filter row, **unchecked by default**, independent of the Status dropdown
- Score Auditor's quiz dropdown **unconditionally excludes archived quizzes** — no checkbox, no override. If an archived quiz genuinely needs auditing, the admin must find it in Existing Quizzes and unarchive it first. This was an intentional design choice (archiving implies "100% done with this").
- **Does NOT affect the Scoreboards page** — that page already paginates/buckets by recency (5 most recent + a year/month accordion), so it doesn't have the same long-list problem and archived quizzes still show there normally
- `saveQuizLocally`'s flag-preservation logic (see notification flags above) was extended to also preserve `archived` across edits, since `buildQuizJSON()` rebuilds the data object fresh each save and would otherwise silently un-archive a quiz the moment its content was edited

---

## Bugs found and fixed (notable ones with non-obvious root causes)

- **`runAudit` crashed on any OR quiz with the (now-removed) Bonus Points feature** due to a parameter named `_` (discarded) instead of `q` in a `.map()` call — the function referenced `q.hasBonusPoints` etc. a few lines later, causing a silent `ReferenceError` that left `auditLoading` stuck `true` forever (fixed generally by wrapping `runAudit` in try/catch/finally, which is good defensive practice that remains even though BP itself was reverted)
- **Color contrast bugs**: a few UI additions used inline hex colors intended to be "slightly darker than the card" but picked colors that were actually lighter (`#324A5F` is lighter than the `#1B2A41` card background, not darker, despite being "the next color up" in the documented palette order) — when picking a darker shade in this theme, verify against actual RGB values, not just palette position
- **MN quiz "resume after exit" never saved progress mid-question** — `mnCluesRevealed` and `mnCurrentQ` were pure React state, never persisted. Fixed by embedding them as `__mnCluesRevealed`/`__mnCurrentQ` keys inside the same `answers` JSONB object (stripped back out before scoring/submission, so scoring never sees them)
- **New-user session leak**: `supabase.auth.signUp()` automatically signs the new account in on the admin's current browser as a side effect. After creating a user via the admin's Add User flow, a page refresh would silently log the admin in as that brand-new user. Fixed with `await supabase.auth.signOut()` immediately after the profile insert in `addUser()`.

---

## Feature explored and reverted: Bonus Points

A feature called "Bonus Points" (BP) was designed and substantially implemented, then **fully reverted** after the user decided the cost (significant complexity across the builder, quiz-taking flow, summary screen, dispute screen, scoreboards, audit tool, and Scoring Grid) outweighed the benefit (a minor "extra credit" mechanic on OR questions). 

**The current `App.jsx` has zero BP code in it** — confirmed by grep before the revert was accepted. If BP is ever revisited, do not assume any of the old implementation is salvageable from memory; it was removed cleanly via reverting to a pre-BP saved file, not by manually undoing changes, so there's no partial state to find. The concept (an optional secondary mini-question tied to a main OR question, scored independently of tokens/difficulty) is sound and was technically working by the end, but real implementation bugs were found in nearly every surface it touched, and the user lost confidence that all edge cases had been caught. If rebuilding, recommend designing it in from the start of a quiz type rather than retrofitting onto the existing OR pipeline, since retrofitting was specifically what made it costly.

---

## Known minor issues / deferred items

- **`getAnswerDisplayForAnswers()`** (used in the admin scoreboard drill-down before the unification, now mostly superseded by `renderAnswerBreakdown`) still has the old DD comma-formatting bug if called directly elsewhere — verify before reusing
- **Admin dashboard dark theme** — admin sections still use light Tailwind defaults per the original handoff; this has not changed
- **Forgot password** still emails the admin rather than automated reset (per original handoff, unchanged)
- The audit deep-link (`?audit=...`) mechanism is now vestigial since disputes don't email anymore (see above) — harmless but unused

---

## Things NOT to change without care (additions to the original list)

7. **`renderAnswerBreakdown` in `ScoreboardScreen`** is now the single source of truth for both admin and player answer displays — changes here affect both views simultaneously, which is the point, but be aware of the blast radius
8. **The Scoring Grid's embedded `<script>` logic** must be validated by extracting and parsing the actual generated script, not just visually inspecting the template literal — escaping bugs here are easy to introduce and hard to spot by eye
9. **`archived` and notification flags (`activeNotificationSent`, `scoredNotificationSent`) must be explicitly preserved** in `saveQuizLocally`'s flag-preservation block whenever a new "sticky" quiz-level flag is added — `buildQuizJSON()` always rebuilds the data object fresh from form state and will silently drop anything not in that preservation list
10. **`disputes` and `resolutions` are separate tables for a reason** — disputes track the admin-facing pending/resolved workflow; resolutions are the one-way notification sent to the disputing user. Don't conflate them or try to merge them into one table.

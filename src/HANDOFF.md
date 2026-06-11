# Double Up Trivia — Project Handoff

## Overview
A React single-page trivia app for ~30 friends and family. Users take quizzes, assign scoring tokens, see leaderboards, and compete across seasons. Admin manages quizzes, scores them, sends messages, and monitors responses via an audit tool.

## Stack
- **Frontend:** React (single `App.jsx`, ~4500 lines), Tailwind CSS via CDN
- **Backend:** Supabase (auth + database)
- **Email:** EmailJS
- **Hosting:** Vercel
- **Repo:** GitHub at `C:\Users\eltig\OneDrive\Documents\GitHub\double-up-trivia` (WindUpBird1000)

---

## Credentials & Config

### Supabase
- **URL:** `https://jcsoyacjqjfznsprmxcj.supabase.co`
- **Anon key:** `sb_publishable_zGvjNAiBtoaRersumsUjWA_OGLXkrJz`
- **RLS:** Disabled on all tables (private app, deferred for now)

### EmailJS
- **Service ID:** `service_u91y3sw`
- **Public key:** `0k_9ewelPuyyBY1HX`
- **Template 1:** `template_mrur50g` — Forgot password (sends to doubleuptrivia@gmail.com)
- **Template 2:** `template_dcdqon6` — Generic notification (disputes, new quiz posted, quiz scored)
  - Variables: `{{to_email}}`, `{{subject}}`, `{{message}}`

### Admin login
- **Email:** `doubleuptrivia@gmail.com`
- **Password:** `doubleup1000` (hardcoded in App.jsx, not Supabase auth)

---

## Supabase Tables

### `quizzes`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| quiz_key | text | slug generated from title |
| title | text | |
| category | text | season name or "Offseason" |
| status | text | Active / Inactive / Closed / Scored |
| type | text | openresponse / datadash / mysterynoun |
| data | jsonb | full quiz data including questions, tokenSlots, etc. |
| created_at | timestamptz | |

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | FK to auth.users |
| email | text | |
| display_name | text | |
| password | text | reference only, not used for auth |
| notify_new_quiz | boolean | default false |
| notify_scored | boolean | default false |
| last_login_at | timestamptz | tracked manually for message interstitial |
| created_at | timestamptz | |

### `quiz_attempts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | |
| quiz_key | text | |
| status | text | in_progress / submitted |
| answers | jsonb | {questionIndex: answer} — MN answers are {answer, cluesUsed} objects |
| doubles | jsonb | array of question indices with doubler token (legacy) |
| token_assignments | jsonb | {questionIndex: tokenType} |
| started_at | timestamptz | |
| submitted_at | timestamptz | |

### `quiz_results`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| quiz_key | text | unique |
| quiz_title | text | |
| posted_at | timestamptz | |
| scores | jsonb | {pointValues, userScores, correctnessByUser, correctCounts, ddPointsByUser (DD only)} |

### `season_standings`
| Column | Type | Notes |
|--------|------|-------|
| season | text PK | |
| updated_at | timestamptz | |
| standings | jsonb | {userId: {display_name, seasonPoints}} |

### `messages`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| title | text | |
| body | text | supports \n line breaks and HTML tags like \<b\>, \<i\> |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| published_at | timestamptz | null = draft |

---

## Key Constants (App.jsx)
```javascript
const SNIPER_POINTS = 8;
const MN_POINTS = [20, 15, 10, 5]; // Mystery Noun points per clue 1/2/3/4
const DEFAULT_TOKEN_SLOTS = ['doubler','doubler','doubler','none','none','none'];
```

---

## Quiz Types

### Open Response (`openresponse`)
- Text answer, multiple accepted answers, one marked as primary
- `showOthersCount` optional (show "+X others" in results)
- Scoring: difficulty-based (harder questions worth more points)
- Tokens: all four (Doubler, Insurance, Parasite, Sniper)

### Data Dash (`datadash`)
- Numeric answers only (commas allowed, e.g. 1,234.5)
- Scoring: rank by absolute difference from correct answer; closest = most points
- Points stored per-user per-question in `ddPointsByUser` within `quiz_results.scores`
- Tokens: Doubler only
- Default token slots: `['doubler','none','none','none','none','none']`

### Mystery Noun (`mysterynoun`)
- 4 progressive clues per question; user answers after any clue
- Answers stored as `{answer: string, cluesUsed: number}` objects
- Scoring: 20/15/10/5 pts for correct after clue 1/2/3/4; incorrect = 0
- No tokens; token assignment page is bypassed
- Default token slots: all none

---

## Tokens
| Token | Effect (correct) | Effect (incorrect) |
|-------|-----------------|-------------------|
| Doubler | pts × 2 | 0 |
| Insurance | no effect | pts ÷ 2 |
| Sniper | flat 8 pts | 0 |
| Parasite | no effect | correctCount × pts ÷ totalParticipants |

---

## Scoring Algorithms

### Open Response
1. For each question, count how many users answered correctly
2. Sort questions hardest→easiest (fewest correct = hardest)
3. Rank: hardest = N pts (N = number of questions), next = N-1, ... easiest = 1
4. Ties: average the tied point values
5. Apply token effects per user

### Data Dash
1. For each question, compute absolute difference between each user's answer and correct answer
2. Rank by difference (smallest = best = most points)
3. Best = X pts (X = total participants), next = X-1, ... worst = 1
4. Ties: average the tied point values
5. **Critical:** points are stored keyed by `user_id` in `ddPointsByUser` — NOT by array index (earlier bug fixed)
6. Apply Doubler token if assigned

### Mystery Noun
- Scored immediately during quiz-taking (no post-scoring needed)
- Points per question: `correct ? MN_POINTS[cluesUsed - 1] : 0`
- No token effects

### Season Standings
- Direct sum of all quiz scores for quizzes in that season
- Offseason quizzes never contribute
- Updated via `updateSeasonStandings()` whenever a quiz is scored

---

## Application Modes (mode state)
```
login → messages (if unread) → setup (Available Quizzes)
setup → assessment → summary (token assignment, skipped for MN) → submitted
setup → scoreboards → scoreboard (individual quiz) / season-scoreboard
setup → settings (Profile Settings)
admin (separate auth, hardcoded credentials)
```

---

## Admin Features
- **Existing Quizzes:** list with filters (season, status), edit, delete, view questions
- **New Quiz:** create OR/DD/MN quizzes with full builder
- **Score Auditor:** select Active or Scored quiz; see submitted responses with per-question answers; auto-runs scoring for Scored quizzes; delete individual user attempts (rescores if Scored)
- **Messages:** compose/publish messages to users; draft/publish workflow; delete with confirmation
- **Manage Users:** (separate section, not fully detailed here)

---

## Notification System
- `notify_new_quiz`: email when a quiz goes Active for the first time (`activeNotificationSent` flag stored in quiz data prevents repeats)
- `notify_scored`: email when a quiz they participated in is scored
- Both use `template_dcdqon6` via `sendNotification(to_email, subject, message)`
- Dispute emails also use same template, sent to `doubleuptrivia@gmail.com`

---

## Message Interstitial
- On login: reads `last_login_at` from profiles BEFORE updating it
- Queries messages with `published_at > last_login_at`
- If unread messages exist: shows interstitial page (`mode='messages'`)
- Multiple messages: chevron navigation; "Go to Available Quizzes" disabled until all viewed
- First-ever login: `last_login_at` defaults to `now()` so no historical messages shown

---

## UI / Styling
- **File:** `public/index.html` — all CSS overrides live here
- **Palette:**
  - `#0C1821` Ink Black — page backgrounds
  - `#1B2A41` Prussian Blue — cards/panels
  - `#324A5F` Charcoal Blue — borders, buttons
  - `#CCC9DC` Lavender — body text
  - `#8899aa` — muted text
  - `#556677` — dimmed text
- **Fonts:** Playfair Display (text-3xl, text-4xl headings) + Inter (body)
- **Corners:** Asymmetric Option D — `border-radius: 12px 0 12px 0` on cards, 8px on buttons
- **Token bin:** `border-radius: 12px 12px 0 0` (both top corners rounded, flush bottom)
- **Modal backdrops:** use `style={{background:"rgba(0,0,0,0.4)"}}` NOT Tailwind bg-black classes (bg-black has !important in stylesheet that breaks opacity)
- **Help modal body:** uses `dangerouslySetInnerHTML` to render `<b>` and `<i>` tags

---

## Known Issues / Deferred
- **RLS:** Disabled on all tables. Fine for private 30-person app but should be enabled before any public expansion
- **Admin dark theme:** Admin dashboard still uses default light Tailwind theme. User-facing is dark.
- **Autofill font size:** Chrome autofill briefly shows small font in login email field before user clicks. Cosmetic only, not fixed.
- **Forgot password:** Currently sends email to admin (doubleuptrivia@gmail.com) rather than automated reset. Uses `template_mrur50g`.

---

## File Locations
- **App:** `src/App.jsx`
- **Stylesheet:** `public/index.html`
- **Quiz images:** `public/images/` (referenced in prompts as `{{image:filename.jpg}}`)
- **Deployed:** `https://double-up-trivia.vercel.app` (or similar)

---

## Fake Test Users (in Supabase profiles)
April, Bobby, Chuck, Donna, Eddie, Fiona, Gary, Harriet, Ivan, Jade
- April = "smartest" (highest scores), Jade = "least smart"
- All have valid user_id values in profiles table
- Have submitted attempts for various Active quizzes via seeder tool

---

## Things NOT to Change Without Care
1. **`ddPointsByUser` must be saved to `quiz_results.scores`** — if missing, DD scoreboard shows 0 pts for everyone
2. **`last_login_at` must be read BEFORE updating** in login flow — otherwise message interstitial never fires
3. **`normalizeAnswer()`** is used for OR and MN answer matching — changes affect scoring
4. **`prepareActiveQuestions()`** needs a branch for every quiz type or Load Quiz silently fails
5. **`computeQuizResults()`** needs a branch for every quiz type or scoring crashes
6. **Session state must be cleared on LOGIN** (not just logout) — `mnAnswered`, `mnCluesRevealed`, `studentAnswers`, etc. — browser close without logout is common

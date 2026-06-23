# Automation Changes — Double Up Trivia

A reference document describing planned automation features for the Double Up Trivia platform, discussed but not yet implemented. Intended to be provided to a developer (or Claude) as a starting point when the time comes to build these features.

---

## Overview

The goal is to allow the site to run largely unattended once content is pre-loaded — publishing quizzes on a fixed schedule, scoring them automatically, and sending admin notifications when attention is needed. The only piece that will always require human judgment is reviewing disputed answers.

---

## Feature 1: Scheduled Quiz Status Changes

### What it does
Automatically transitions a quiz from `Inactive` → `Active` and then from `Active` → `Scored` at admin-specified dates and times, without requiring manual intervention in the admin dashboard.

### Why it matters
A predictable publishing cadence (e.g. new quiz every Tuesday and Friday, scoring on alternating days) is key to building regular user habits. Automation also means the site can run during vacations or busy periods as long as content has been pre-loaded.

### How it works
Uses **pg_cron**, a PostgreSQL extension built into Supabase, to run scheduled SQL `UPDATE` statements that flip a quiz's `status` column at the right time.

Creating pg_cron jobs requires the **service role key** (admin-level Supabase access), which must never be exposed in client-side code. A **Supabase Edge Function** acts as a secure intermediary: the app calls the Edge Function, which holds the service role key server-side and creates the pg_cron entries.

### Components needed

**1. Quiz Builder UI changes (`App.jsx`)**
- Add a "Go Live" datetime picker to the quiz builder form
- Add a "Score On" datetime picker
- On quiz save, if either datetime is set, call the Edge Function to schedule the status changes
- Optionally: display scheduled times on the Existing Quizzes admin list so the admin can see what's queued

**2. Supabase Edge Function (new)**
- Name: e.g. `schedule-quiz-status`
- Accepts: `{ quiz_key, go_live_at, score_on_at }`
- Creates two pg_cron jobs:
  - At `go_live_at`: `UPDATE quizzes SET status = 'Active' WHERE quiz_key = '...'`
  - At `score_on_at`: runs the full scoring logic (or transitions status to trigger it — see note below)
- Should also handle cancellation/rescheduling if the quiz is edited after scheduling

**Note on scoring:** The current app's scoring logic lives in client-side React (`computeQuizResults`). For fully automated scoring, this logic would need to be either duplicated in the Edge Function or refactored into a shared Supabase database function. This is the most complex part of the implementation.

**3. Supabase setup**
- Enable pg_cron extension (via Supabase dashboard → Database → Extensions)
- Grant appropriate permissions to the Edge Function's service role

---

## Feature 2: Daily Dispute Digest Email

### What it does
Once per day, checks whether there are any open (pending) disputes in the `disputes` table. If there are, sends an email to the admin (`doubleuptrivia@gmail.com`) summarizing how many are waiting. If there are none, no email is sent.

### Why it matters
Currently, dispute notifications are sent immediately when a user files a dispute (via EmailJS). A daily digest is a cleaner backup — useful if individual dispute emails are missed, and avoids the need to manually check the admin dashboard.

### How it works
A **second Supabase Edge Function** runs on a daily pg_cron schedule (e.g. 8am). It queries the `disputes` table for rows with `status = 'pending'`. If any exist, it sends an email via a transactional email service.

**EmailJS is not suitable here** — it is designed to be called from a browser and requires user interaction context. A background server-side process needs a proper transactional email API instead.

### Recommended email service
**Resend** (`resend.com`) — has a native Supabase integration, a generous free tier (3,000 emails/month), and is straightforward to call from an Edge Function.

### Components needed

**1. Supabase Edge Function (new)**
- Name: e.g. `daily-dispute-digest`
- Queries: `SELECT COUNT(*) FROM disputes WHERE status = 'pending'`
- If count > 0: sends email to admin via Resend API with subject like "Double Up Trivia — X dispute(s) awaiting review"
- If count = 0: exits silently

**2. pg_cron job**
- Calls the `daily-dispute-digest` Edge Function once per day at a configured time
- Can be set up alongside the quiz-scheduling pg_cron work

**3. Resend account**
- Free tier is sufficient
- Add API key to Edge Function environment variables (never in client-side code)

---

---

## Feature 3: Schedule Calendar View (Admin)

### What it does
A calendar or timeline view in the admin dashboard showing all scheduled quizzes — when each one goes live, when it closes for scoring, and any gaps in the schedule. Gives the admin a bird's-eye view of the content pipeline without having to mentally reconstruct it from a flat list.

### Why it matters
Without a visual schedule, it's easy to accidentally double-book a time slot, leave a gap of several days with no active quiz, or lose track of how far out the content backlog extends. A calendar view turns schedule management from a mental exercise into an at-a-glance check.

### What it should show
- Each quiz displayed as a block or entry spanning its active window (go-live date → score-on date)
- Color coding by status: scheduled/upcoming (e.g. blue), currently active (e.g. green), scored/past (e.g. gray)
- Gaps in the schedule clearly visible — days or windows with no active quiz
- Clicking a quiz entry opens it for editing (or at minimum shows its title, status, and scheduled times)
- A reasonable default view of 4–6 weeks forward from today, with the ability to scroll back/forward

### What it does NOT need to be
A full calendar library implementation is not necessary — a simple vertical timeline or week-grid laid out in React is sufficient. The data is already available (`go_live_at` and `score_on_at` stored on each quiz once Feature 1 is built), so this is primarily a display/layout problem, not a data problem.

### Components needed

**1. Admin dashboard section (`App.jsx`)**
- New admin section (e.g. "Schedule" alongside the existing Existing Quizzes / New Quiz / Score Auditor / Messages / Manage Users sections)
- Reads `go_live_at` and `score_on_at` from the `quizzes` table (these fields need to be added as part of Feature 1)
- Renders a timeline or calendar grid with quiz blocks
- Highlights gaps (contiguous days with no scheduled active quiz)
- Links each entry back to the quiz editor

**2. Schema dependency**
- Requires Feature 1 to be in place first, since `go_live_at` and `score_on_at` don't exist on the `quizzes` table yet
- These will likely be stored either as new columns on the `quizzes` table or inside the existing `data` jsonb column (consistent with how `archived`, `activeNotificationSent`, etc. are currently stored)

---

## Summary of New Components

| Component | Type | Purpose |
|-----------|------|---------|
| `schedule-quiz-status` | Supabase Edge Function | Creates pg_cron jobs when admin schedules a quiz |
| `daily-dispute-digest` | Supabase Edge Function | Sends admin email if pending disputes exist |
| pg_cron jobs (per quiz) | Supabase scheduled SQL | Flips quiz status at the right time |
| pg_cron job (daily) | Supabase scheduled SQL | Triggers the dispute digest check |
| Quiz builder datetime pickers | `App.jsx` UI change | Lets admin set go-live and score-on times |
| Schedule Calendar view | `App.jsx` UI change | Shows all scheduled quizzes, gaps, and pipeline |
| Resend account | External service | Transactional email for server-side digest |

## What Does NOT Change

- EmailJS stays in place for all user-facing notifications (new quiz posted, quiz scored, disputes filed, forgot password)
- The existing manual admin workflow continues to work exactly as before — automation is additive, not a replacement
- All existing Supabase tables are unchanged; no schema migration is needed for these features

---

## Implementation Notes

- Build in order: Feature 1 (scheduling) → Feature 3 (calendar) → Feature 2 (digest email). The calendar depends on Feature 1's data; Feature 2 is independent but lower priority.
- The scoring-logic duplication question (client-side React vs. Edge Function) is the biggest design decision to resolve before building Feature 1.
- Both Edge Functions should be deployed to the same Supabase project as the app they serve (separate functions for Double Up Trivia vs. student-trivia).
- Test pg_cron scheduling thoroughly in a non-production window before relying on it for live quizzes.
- The calendar view's gap detection logic should account for the intended cadence (e.g. "a gap is only a problem if it's longer than X days") rather than flagging every day without a quiz.

# Work Log → Career Content App — Build Brief

## One-liner
A personal web app where I log quick freeform notes about each workday, and AI
synthesizes the accumulated notes into polished career content: resume bullets,
STAR interview stories, a brag document, and a skills inventory.

## The problem it solves
By the time I need to update my resume or prep for interviews, I've forgotten
the details of what I actually did — the wins, the metrics, the hard problems.
This app makes capturing accomplishments a low-friction daily habit, then does
the heavy lifting of turning raw notes into interview- and resume-ready material
on demand.

## Who it's for
A single primary user (me) to start, but built with per-user accounts so the
data model is multi-user from day one. I'm a working professional who wants to
continuously bank accomplishments instead of scrambling at review/job-hunt time.

---

## Core features

1. **Daily log entry** — the heart of the app. Fast, freeform, near-zero friction.
2. **Log history** — browse/search past entries by date, project, or keyword.
3. **AI content generation** — turn a selected range of entries into any of the
   four output types below.
4. **Curate & edit outputs** — generated content is a starting point; I can edit,
   keep, regenerate, or discard it, and save the good ones.
5. **Accounts + cloud sync** — log in from any device; entries persist server-side.

---

## Note capture UX (most important to get right)

- A large freeform textarea is the default — I can just brain-dump what happened.
- **Gentle structure via optional prompts/chips**, not required fields. Suggestions like:
  - *What did you ship / accomplish?*
  - *Wins*
  - *Blockers / challenges overcome*
  - *Skills & tools used*
  - *Metrics / impact (numbers, %, time saved, revenue, users)*
- Optional **project tag** per entry (freeform or pick from prior projects).
- Date defaults to today but is editable, so I can **backfill** missed days.
- Autosave; entering a log should take under a minute.

---

## AI-generated outputs

The user selects a **date range** (and optionally a project) and picks an output
type. All generation happens **server-side** via the Claude API so the API key
is never exposed to the browser.

1. **Resume bullets** — achievement-oriented, one line each, strong action verb,
   quantified impact where possible (the "accomplished X by doing Y, measured by
   Z" formula). Grouped by project/theme.
2. **STAR interview stories** — Situation / Task / Action / Result narratives from
   notable entries, written in first person, ready to rehearse for behavioral
   interviews.
3. **Brag document** — a running self-review / accomplishments doc organized by
   theme or quarter, suitable for performance reviews and promotion cases.
4. **Skills inventory** — a deduplicated list of technologies, tools, and
   competencies extracted from the notes, each with evidence (which entries/dates
   demonstrate it) and rough proficiency signal based on frequency/recency.

Each generated artifact can be saved, edited inline, and regenerated.

---

## Data model (starting point)

- **User** — id, email, auth credentials.
- **LogEntry** — id, userId, date, body (freeform text), projectTag (optional),
  createdAt, updatedAt.
- **Project** (optional/derived) — id, userId, name.
- **GeneratedArtifact** — id, userId, type (resume_bullets | star | brag | skills),
  content, sourceDateRange, sourceEntryIds, edited flag, createdAt.

---

## Suggested tech stack (recommendation — swap freely)

- **Framework:** Next.js (React) — one codebase for UI + server routes for the
  Claude API calls.
- **Auth + database:** Supabase (Postgres + hosted auth), or an equivalent
  batteries-included backend. Gives cloud sync and accounts with minimal setup.
- **AI:** Claude API called from the server. Pick a current, capable Claude model
  for generation quality; keep the key in a server-side env var only.
- **Styling:** Tailwind CSS for fast, clean UI.

*Privacy note:* work notes can contain sensitive details. Store them in the
user's own account, don't log prompt contents, and make it clear that generation
sends the selected notes to the AI provider.

---

## Main screen layout (MVP)

The primary screen is a **split workspace** with three regions:

```
┌──┬───────────────────┬──────────────────────────────────────┐
│  │                   │  Top bar: views · dates · stats       │
│N │                   ├───────────────────┬──────────────────┤
│a │   AI OUTPUT       │  [Mon]   [Tue]    │   [Wed]  [Thu]   │
│v │   (resume, STAR,  │                   │                  │
│  │    brag, skills)  │  [Fri]   [Sat]    │   [Sun]          │
│r │                   │                   │                  │
│a │                   │  [ +log ]   Stats │                  │
│i │                   │                   │                  │
│l │   (edit & save)   │  (weekly log grid)                   │
└──┴───────────────────┴──────────────────────────────────────┘
```

1. **Left nav rail** (slim, full-height, far left): persistent icon navigation to
   move between views — weekly log, generated content, overall stats/dashboard,
   settings.

2. **Top bar** (spans the workspace): controls for the current view — switch views,
   navigate which **dates/week** I'm looking at (prev/next week, date picker), and
   a button to open **overall stats**.

3. **Main content — two side-by-side panels:**
   - **Left — AI output panel** (right after the nav rail): where generated content
     appears (resume bullets, STAR stories, brag doc, skills inventory) and where I
     edit and save it. Kept visible next to the logs so I can generate from what I
     see alongside.
   - **Right/center — weekly log grid:** a card per day of the week (Mon–Sun) where
     I log what I did that day. Clicking a day opens its freeform entry (with the
     suggestion chips). A **Stats tile** sits alongside the day cards showing quick
     metrics for the week (entries logged, streak, projects touched, wins captured).

Should collapse gracefully on narrower screens (panels stack; nav rail becomes a
menu) since the app is browser-based and may be used on smaller windows.

## Suggested MVP scope

**Build first:**
- Account sign-up / login
- The split-workspace layout above (nav rail, top bar, weekly log grid + AI panel)
- Create, edit, and browse daily log entries via the weekly grid (freeform + chips)
- Weekly navigation and a stats tile (entries, streak, projects)
- Generate **resume bullets** and **STAR stories** from a date range, shown in the
  right-hand AI output panel
- Save/edit generated outputs

**Add next:**
- Brag document and skills inventory generators
- Search and project filtering
- Export outputs to Markdown/PDF

**Future / nice-to-have:**
- Daily reminder/nudge to log
- Auto-import raw material from GitHub commits/PRs or Jira
- Weekly auto-summary email
- Tone/length controls on generated content

# WorkLog 📓

Log quick notes about each workday, then let Claude turn them into
**resume bullets**, **STAR interview stories**, a **brag doc**, and a
**skills inventory**.

Built with Next.js (App Router), Tailwind CSS, SQLite, and the Claude API.
See [BRIEF.md](./BRIEF.md) for the full product brief.

## Quick start

```bash
npm install
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env.local   # for AI generation
npm run dev                                         # http://localhost:3000
```

Sign up with any email + password (accounts are local to your database),
log a few days from the weekly grid, then hit **Generate** in the right-hand
panel.

Without an API key everything works except generation, which shows a setup
hint instead.

## Layout

```
┌──┬───────────────────┬──────────────────────────────────┐
│  │                   │ Top bar: week nav · dates · stats │
│N │   AI OUTPUT       ├──────────────────────────────────┤
│a │   resume bullets  │  Mon   Tue                        │
│v │   STAR stories    │  Wed   Thu                        │
│  │   brag doc        │  Fri   Sat                        │
│  │   skills          │  Sun   [Stats]                    │
└──┴───────────────────┴──────────────────────────────────┘
```

- **Nav rail** — weekly log, generated content library, overall stats
- **Weekly grid** — one card per day; click to open the editor
  (freeform text + optional structure chips + project tag, autosaves)
- **AI panel** — pick an output type and range (1–12 weeks), generate,
  then edit / copy / save to the library

## Tech notes

- **Storage:** SQLite (`data/worklog.db`, created automatically). The data
  model (users / entries / artifacts) maps 1:1 onto Postgres if you later
  move to a hosted backend like Supabase.
- **Auth:** email + password (scrypt) with httpOnly session cookies.
- **AI:** server-side calls to the Claude API (`claude-opus-4-8` by default;
  override with `ANTHROPIC_MODEL`). The API key never reaches the browser.
- **Generation grounding:** prompts instruct the model to only claim what the
  logs support — no invented metrics.

## Scripts

| Command         | What it does                    |
| --------------- | ------------------------------- |
| `npm run dev`   | Dev server with hot reload      |
| `npm run build` | Production build + type check   |
| `npm start`     | Serve the production build      |

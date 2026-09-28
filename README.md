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

Sign up with any email + password (accounts are local to your database), log a
few days in the **Work log** panel, then open the **Editor** panel and use
*Suggest from logs* to turn them into resume bullets.

Without an API key everything works except the AI features, which show a setup
hint instead.

## The workspace

The app opens on a **dockable workspace**. One panel fills the left column and
the rest stack on the right:

```
┌──┬────────────────────┬──────────────────────────┐
│  │ Layout · presets   ·  hidden-panel chips      │
│N ├────────────────────┼──────────────────────────┤
│a │                    │   Resume (live preview)  │
│v │   Work log         ├──────────────────────────┤
│  │   (week grid)      │   Editor (resume fields) │
└──┴────────────────────┴──────────────────────────┘
```

Panels can be **dragged by their header to swap**, **resized** via the
separators, **expanded** to fill the workspace, and **closed** — a closed panel
comes back from the chips on the right of the layout bar. Two layouts ship
built in (*Log + Resume*, *Focus: Resume*) and `＋` saves the current
arrangement. Layout choices persist per browser.

Four panels are available:

| Panel | What it does |
| --- | --- |
| **Work log** | The Mon–Sun grid. Click a day to log it (freeform + structure chips + project tag, autosaves). |
| **Resume** | Live document preview. Exports to plain text or Google Docs. |
| **Editor** | Structured resume fields — header, experience, projects, education, skills. |
| **AI output** | STAR stories, brag doc, skills inventory. Hidden by default; restore it from the layout bar. |

## Resume

The resume is stored as structured data (entries → bullets), not a blob, so it
stays portable. In the Editor, **Suggest from logs** asks Claude for achievement
bullets grounded in the log entries for a date range; you review them in a tray
and add the ones you want. Accepted bullets are tagged so you can see what came
from your logs versus what you wrote.

**Export** — *Copy as text* puts ATS-friendly plain text on the clipboard.
*Export to Google Doc* copies rich HTML and opens a blank Google Doc to paste
into (no Google OAuth required).

## Scripts

| Command         | What it does                    |
| --------------- | ------------------------------- |
| `npm run dev`   | Dev server with hot reload      |
| `npm run build` | Production build + type check   |
| `npm start`     | Serve the production build      |

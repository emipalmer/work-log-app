---
name: verify
description: Build, launch, and drive the WorkLog app end-to-end to verify changes.
---

# Verifying WorkLog

## Build & launch

```bash
npm install            # once
npm run build          # type-checks + compiles; must be clean
npm start              # production server on http://localhost:3000
```

Gotcha: `pkill -f "next start"` does NOT kill the server — the process is named
`next-server`. Find it with `ps aux | grep next-server` and `kill <pid>`, or a
stale server will keep serving the OLD build on port 3000 and your changes will
appear to have no effect.

SQLite data lives in `data/worklog.db` (gitignored). Delete it for a clean slate.

## Drive the API (fastest smoke)

```bash
JAR=/tmp/cookies.txt
curl -s -c $JAR -X POST localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"t@example.com","password":"password123"}'
curl -s -b $JAR -X PUT localhost:3000/api/entries \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-07-06","body":"Shipped X","projectTag":"Proj"}'
curl -s -b $JAR "localhost:3000/api/entries?start=2026-07-06&end=2026-07-12"
curl -s -b $JAR -X POST localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"resume_bullets","start":"2026-07-06","end":"2026-07-12"}'
# Without ANTHROPIC_API_KEY this must return a friendly 503, never a bare 500.
```

Artifacts CRUD: POST/GET `/api/artifacts`, PATCH/DELETE `/api/artifacts/:id`.

## Drive the UI

Playwright with the preinstalled browser (`npm i playwright-core` in a scratch
dir; executable at `/opt/pw-browsers/chromium-*/chrome-linux/chrome`):
login form → `/week` (grid + stats tile + AI panel) → click a day card (editor
modal) → Generate button (error/result renders in right panel) → `/outputs` →
`/stats`.

## Flows worth probing

- Wrong password (401), duplicate signup (409), unauthenticated API hit (401)
- Bad/inverted date ranges and unknown artifact type on `/api/generate` (400)
- Empty date range → 400 with "No log entries" message
- PATCH/DELETE on a nonexistent artifact id (404)

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Single SQLite connection, cached on globalThis so Next.js dev-mode HMR
// doesn't open a new handle on every reload.
const globalForDb = globalThis as unknown as { __worklogDb?: Database.Database };

function createDb(): Database.Database {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "worklog.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON"); // required for ON DELETE CASCADE below
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      date        TEXT NOT NULL,             -- YYYY-MM-DD
      body        TEXT NOT NULL DEFAULT '',
      project_tag TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, date)
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id),
      type         TEXT NOT NULL,            -- resume_bullets | star_stories | brag_doc | skills_inventory
      content      TEXT NOT NULL,
      start_date   TEXT,
      end_date     TEXT,
      source_count INTEGER NOT NULL DEFAULT 0,
      edited       INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ---- Resume -------------------------------------------------------
    CREATE TABLE IF NOT EXISTS resumes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      name       TEXT NOT NULL DEFAULT 'My resume',
      full_name  TEXT NOT NULL DEFAULT '',
      headline   TEXT NOT NULL DEFAULT '',
      email      TEXT NOT NULL DEFAULT '',
      location   TEXT NOT NULL DEFAULT '',
      links      TEXT NOT NULL DEFAULT '',
      summary    TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- One row per role / project / degree. 'kind' selects the resume section.
    CREATE TABLE IF NOT EXISTS resume_entries (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      resume_id INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
      kind      TEXT NOT NULL,                -- experience | project | education
      org       TEXT NOT NULL DEFAULT '',     -- company / project / school
      title     TEXT NOT NULL DEFAULT '',     -- role / subtitle / degree
      dates     TEXT NOT NULL DEFAULT '',
      position  INTEGER NOT NULL DEFAULT 0
    );

    -- Achievement bullets. 'source' records whether Claude drafted it from logs.
    CREATE TABLE IF NOT EXISTS resume_bullets (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL REFERENCES resume_entries(id) ON DELETE CASCADE,
      text     TEXT NOT NULL,
      source   TEXT NOT NULL DEFAULT 'manual', -- manual | ai
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS resume_skills (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      resume_id INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
      category  TEXT NOT NULL,
      items     TEXT NOT NULL DEFAULT '',
      position  INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries (user_id, date);
    CREATE INDEX IF NOT EXISTS idx_artifacts_user ON artifacts (user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_resume_entries ON resume_entries (resume_id, kind, position);
    CREATE INDEX IF NOT EXISTS idx_resume_bullets ON resume_bullets (entry_id, position);
  `);
  return db;
}

const db = globalForDb.__worklogDb ?? createDb();
globalForDb.__worklogDb = db;

export default db;

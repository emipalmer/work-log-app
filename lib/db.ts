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

    CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries (user_id, date);
    CREATE INDEX IF NOT EXISTS idx_artifacts_user ON artifacts (user_id, created_at);
  `);
  return db;
}

const db = globalForDb.__worklogDb ?? createDb();
globalForDb.__worklogDb = db;

export default db;

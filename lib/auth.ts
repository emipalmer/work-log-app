import crypto from "node:crypto";
import { cookies } from "next/headers";
import db from "./db";

export const SESSION_COOKIE = "wl_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
};

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length &&
    crypto.timingSafeEqual(candidate, expected)
  );
}

export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    Date.now() + SESSION_TTL_MS,
  );
  return token;
}

export function destroySession(token: string): void {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export type SessionUser = { id: number; email: string };

export async function getUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id AS id, u.email AS email, s.expires_at AS expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .get(token) as { id: number; email: string; expires_at: number } | undefined;
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    destroySession(token);
    return null;
  }
  return { id: row.id, email: row.email };
}

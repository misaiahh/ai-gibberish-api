import { db } from "../db";

export interface SessionRow {
  id: string;
  data: string | null;
  created_at: string;
  updated_at: string;
}

export function createSessionRow(id: string): SessionRow {
  const now = new Date().toISOString();
  return { id, data: null, created_at: now, updated_at: now };
}

export function insertSession(data: SessionRow): void {
  db.prepare(
    "INSERT INTO sessions (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ).run(data.id, data.data, data.created_at, data.updated_at);
}

export function upsertSession(id: string, sessionData: Record<string, unknown>): void {
  const now = new Date().toISOString();
  const serialized = JSON.stringify(sessionData);
  db.prepare(
    `INSERT INTO sessions (id, data, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET data = ?, updated_at = ?`
  ).run(id, serialized, now, now, serialized, now);
}

export function getSessionById(id: string): SessionRow | undefined {
  return db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as SessionRow | undefined;
}

export function deleteSession(id: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

// ─── Users ───────────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  cookie_id: string;
  created_at: string;
  updated_at: string;
}

export function createUserRow(id: string, cookieId: string): UserRow {
  const now = new Date().toISOString();
  return { id, cookie_id: cookieId, created_at: now, updated_at: now };
}

export function insertUser(data: UserRow): void {
  db.prepare(
    "INSERT INTO users (id, cookie_id, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ).run(data.id, data.cookie_id, data.created_at, data.updated_at);
}

export function upsertUser(cookieId: string, userId: string): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (id, cookie_id, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(cookie_id) DO UPDATE SET updated_at = ?`
  ).run(userId, cookieId, now, now, now);
}

export function getUserByCookieId(cookieId: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE cookie_id = ?").get(cookieId) as UserRow | undefined;
}

export function deleteUser(userId: string): void {
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
}

export function deleteUserByCookieId(cookieId: string): void {
  db.prepare("DELETE FROM users WHERE cookie_id = ?").run(cookieId);
}

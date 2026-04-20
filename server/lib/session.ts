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

import { db } from "../db";
import { defineEventHandler, createError } from "h3";
import { useSession } from "../lib/sessionHandler";

// GET /api/todos — list all todos
export default defineEventHandler(async (event) => {
  useSession(event);
  const session = (event.context as { session: { sessionId: string } }).session;

  const stmt = db.prepare(
    "SELECT * FROM todos WHERE session_id = ? ORDER BY created_at DESC"
  );
  const todos = stmt.all(session.sessionId) as Array<{
    id: string;
    title: string;
    completed: number;
    created_at: string;
    updated_at: string;
  }>;

  return todos.map((t) => ({
    id: t.id,
    title: t.title,
    completed: t.completed === 1,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));
});

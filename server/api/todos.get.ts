import { db } from "../db";
import { defineEventHandler } from "h3";
import { useSession } from "../lib/sessionHandler";

// GET /api/todos — list all todos
export default defineEventHandler(async (event) => {
  const { userId } = useSession(event);

  const stmt = db.prepare(
    "SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC"
  );
  const todos = stmt.all(userId) as Array<{
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

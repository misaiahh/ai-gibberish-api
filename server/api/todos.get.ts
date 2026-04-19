import { db } from "../db";

// GET /api/todos — list all todos
export default defineEventHandler(async () => {
  const stmt = db.prepare("SELECT * FROM todos ORDER BY created_at DESC");
  const todos = stmt.all() as Array<{
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

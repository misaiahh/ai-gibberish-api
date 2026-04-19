import { db } from "../db";

// POST /api/todos — create a new todo
export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { title } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    throw createError({ statusCode: 400, statusMessage: "Title is required" });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    "INSERT INTO todos (id, title, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, title.trim(), 0, now, now);

  return {
    id,
    title: title.trim(),
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
});

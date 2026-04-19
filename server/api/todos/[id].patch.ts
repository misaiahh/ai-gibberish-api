import { db } from "../../db";

// PATCH /api/todos/:id — update a todo
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  const todo = db
    .prepare("SELECT * FROM todos WHERE id = ?")
    .get(id) as { id: string; title: string; completed: number; created_at: string } | undefined;

  if (!todo) {
    throw createError({ statusCode: 404, statusMessage: "Todo not found" });
  }

  const body = await readBody(event);
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      throw createError({ statusCode: 400, statusMessage: "Title must be a non-empty string" });
    }
    fields.push("title = ?");
    values.push(body.title.trim());
  }

  if (body.completed !== undefined) {
    fields.push("completed = ?");
    values.push(body.completed ? 1 : 0);
  }

  if (fields.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "No valid fields to update" });
  }

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE todos SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  return {
    id: todo.id,
    title: body.title ?? todo.title,
    completed: body.completed !== undefined ? body.completed : todo.completed === 1,
    createdAt: todo.created_at,
    updatedAt: now,
  };
});

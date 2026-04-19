import { db } from "../../db";

// GET /api/todos/:id — get a single todo
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  const stmt = db.prepare("SELECT * FROM todos WHERE id = ?");
  const todo = stmt.get(id) as {
    id: string;
    title: string;
    completed: number;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!todo) {
    throw createError({ statusCode: 404, statusMessage: "Todo not found" });
  }

  return {
    id: todo.id,
    title: todo.title,
    completed: todo.completed === 1,
    createdAt: todo.created_at,
    updatedAt: todo.updated_at,
  };
});

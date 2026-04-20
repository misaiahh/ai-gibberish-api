import { db } from "../../db";
import { defineEventHandler, getRouterParam, createError } from "h3";
import { useSession } from "../../lib/sessionHandler";

// GET /api/todos/:id — get a single todo
export default defineEventHandler(async (event) => {
  const { userId } = useSession(event);

  const id = getRouterParam(event, "id");

  const stmt = db.prepare("SELECT * FROM todos WHERE id = ? AND user_id = ?");
  const todo = stmt.get(id, userId) as {
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

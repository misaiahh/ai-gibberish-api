import { db } from "../../db";
import { defineEventHandler, getRouterParam, createError } from "h3";
import { useSession } from "../../lib/sessionHandler";

// DELETE /api/todos/:id — delete a todo
export default defineEventHandler(async (event) => {
  const { userId } = useSession(event);

  const id = getRouterParam(event, "id");

  const todo = db
    .prepare("SELECT * FROM todos WHERE id = ? AND user_id = ?")
    .get(id, userId) as { id: string } | undefined;

  if (!todo) {
    throw createError({ statusCode: 404, statusMessage: "Todo not found" });
  }

  db.prepare("DELETE FROM todos WHERE id = ? AND user_id = ?").run(id, userId);

  return { id };
});

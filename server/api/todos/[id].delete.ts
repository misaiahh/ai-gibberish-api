import { db } from "../../db";
import { defineEventHandler, getRouterParam, createError } from "h3";
import { useSession } from "../../lib/sessionHandler";

// DELETE /api/todos/:id — delete a todo
export default defineEventHandler(async (event) => {
  useSession(event);
  const session = (event.context as { session: { sessionId: string } }).session;

  const id = getRouterParam(event, "id");

  const todo = db
    .prepare("SELECT * FROM todos WHERE id = ? AND session_id = ?")
    .get(id, session.sessionId) as { id: string } | undefined;

  if (!todo) {
    throw createError({ statusCode: 404, statusMessage: "Todo not found" });
  }

  db.prepare("DELETE FROM todos WHERE id = ? AND session_id = ?").run(id, session.sessionId);

  return { id };
});

import { db } from "../../db";
import { defineEventHandler, getRouterParam, createError } from "h3";
import { useSession } from "../../lib/sessionHandler";
import { getLogger } from "../../lib/logger";

// DELETE /api/todos/:id — delete a todo
export default defineEventHandler(async (event) => {
  const logger = getLogger();
  const { userId } = useSession(event);
  const id = getRouterParam(event, "id");

  const ctx = { endpoint: event.path, user: userId };

  try {
    const todo = db
      .prepare("SELECT * FROM todos WHERE id = ? AND user_id = ?")
      .get(id, userId) as { id: string; title: string } | undefined;

    if (!todo) {
      logger.debug("[deleteTodo]", ctx, { id, message: "not found" });
      throw createError({ statusCode: 404, statusMessage: "Todo not found" });
    }

    db.prepare("DELETE FROM todos WHERE id = ? AND user_id = ?").run(id, userId);

    logger.info("[deleteTodo]", ctx, { id, title: todo.title });

    return { id };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("[deleteTodo]", ctx, err);
    throw createError({ statusCode: 500, statusMessage: "Internal server error" });
  }
});

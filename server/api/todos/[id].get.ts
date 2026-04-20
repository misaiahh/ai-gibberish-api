import { db } from "../../db";
import { defineEventHandler, getRouterParam, createError } from "h3";
import { useSession } from "../../lib/sessionHandler";
import { getLogger } from "../../lib/logger";

// GET /api/todos/:id — get a single todo
export default defineEventHandler(async (event) => {
  const logger = getLogger();
  const { userId } = useSession(event);
  const id = getRouterParam(event, "id");

  const ctx = { endpoint: event.path, user: userId };

  try {
    const stmt = db.prepare("SELECT * FROM todos WHERE id = ? AND user_id = ?");
    const todo = stmt.get(id, userId) as {
      id: string;
      title: string;
      completed: number;
      created_at: string;
      updated_at: string;
    } | undefined;

    if (!todo) {
      logger.debug("[getTodo]", ctx, { id, message: "not found" });
      throw createError({ statusCode: 404, statusMessage: "Todo not found" });
    }

    logger.debug("[getTodo]", ctx, { id, title: todo.title });

    return {
      id: todo.id,
      title: todo.title,
      completed: todo.completed === 1,
      createdAt: todo.created_at,
      updatedAt: todo.updated_at,
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("[getTodo]", ctx, err);
    throw createError({ statusCode: 500, statusMessage: "Internal server error" });
  }
});

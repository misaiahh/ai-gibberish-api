import { db } from "../db";
import { defineEventHandler, getQuery } from "h3";
import { useSession } from "../lib/sessionHandler";
import { getLogger } from "../lib/logger";

// GET /api/todos — list all todos, optionally filtered by place_id
export default defineEventHandler(async (event) => {
  const logger = getLogger();
  const { userId } = useSession(event);
  const query = getQuery(event);
  const placeId = query.place_id ? String(query.place_id) : null;

  const ctx = { endpoint: event.path, user: userId };

  try {
    let todos;
    if (placeId) {
      const stmt = db.prepare(
        "SELECT * FROM todos WHERE user_id = ? AND place_id = ? ORDER BY created_at DESC"
      );
      todos = stmt.all(userId, placeId) as Array<{
        id: string;
        title: string;
        completed: number;
        created_at: string;
        updated_at: string;
        place_id: string | null;
      }>;
    } else {
      const stmt = db.prepare(
        "SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC"
      );
      todos = stmt.all(userId) as Array<{
        id: string;
        title: string;
        completed: number;
        created_at: string;
        updated_at: string;
        place_id: string | null;
      }>;
    }

    logger.debug("[listTodos]", ctx, { count: todos.length });

    return todos.map((t) => ({
      id: t.id,
      title: t.title,
      completed: t.completed === 1,
      placeId: t.place_id,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
  } catch (err) {
    logger.error("[listTodos]", ctx, err);
    throw err;
  }
});

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
     const stmt = db.prepare(
       "SELECT t.*, p.id as place_obj_id, p.name as place_name, p.parent_id as place_parent_id, p.created_at as place_created_at, p.updated_at as place_updated_at FROM todos t LEFT JOIN places p ON t.place_id = p.id WHERE t.id = ? AND t.user_id = ?"
     );
const todo = stmt.get(id, userId) as {
        id: string;
        title: string;
        description: string;
        completed: number;
        created_at: string;
        updated_at: string;
        place_id: string | null;
        place_obj_id: string | null;
        place_name: string | null;
        place_parent_id: string | null;
        place_created_at: string | null;
        place_updated_at: string | null;
      } | undefined;

     if (!todo) {
       logger.debug("[getTodo]", ctx, { id, message: "not found" });
       throw createError({ statusCode: 404, statusMessage: "Todo not found" });
     }

     logger.debug("[getTodo]", ctx, { id, title: todo.title });

return {
        id: todo.id,
        title: todo.title,
        description: todo.description || "",
        completed: todo.completed === 1,
        placeId: todo.place_id,
        place: todo.place_obj_id
          ? {
              id: todo.place_obj_id,
              name: todo.place_name,
              parentId: todo.place_parent_id,
              createdAt: todo.place_created_at || todo.created_at,
              updatedAt: todo.place_updated_at || todo.updated_at,
            }
          : null,
        createdAt: todo.created_at,
        updatedAt: todo.updated_at,
      };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("[getTodo]", ctx, err);
    throw createError({ statusCode: 500, statusMessage: "Internal server error" });
  }
});

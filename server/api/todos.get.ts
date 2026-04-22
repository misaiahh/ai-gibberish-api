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
        "SELECT t.*, p.id as place_obj_id, p.name as place_name, p.parent_id as place_parent_id, p.created_at as place_created_at, p.updated_at as place_updated_at FROM todos t LEFT JOIN places p ON t.place_id = p.id WHERE t.user_id = ? AND t.place_id = ? ORDER BY t.created_at DESC"
      );
      todos = stmt.all(userId, placeId) as Array<{
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
      }>;
    } else {
      const stmt = db.prepare(
        "SELECT t.*, p.id as place_obj_id, p.name as place_name, p.parent_id as place_parent_id, p.created_at as place_created_at, p.updated_at as place_updated_at FROM todos t LEFT JOIN places p ON t.place_id = p.id WHERE t.user_id = ? ORDER BY t.created_at DESC"
      );
      todos = stmt.all(userId) as Array<{
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
      }>;
    }

    logger.debug("[listTodos]", ctx, { count: todos.length });

    return todos.map((t) => {
      const todoPlaceIds = db.prepare(
        "SELECT place_id FROM todo_places WHERE todo_id = ?"
      ).all(t.id) as Array<{ place_id: string }>;

      const placeIds = todoPlaceIds.map((tp) => tp.place_id);

      if (t.place_id && !placeIds.includes(t.place_id)) {
        placeIds.push(t.place_id);
      }

      return {
        id: t.id,
        title: t.title,
        description: t.description || "",
        completed: t.completed === 1,
        placeIds,
        places: placeIds.map((pid) => {
          const place = db.prepare(
            "SELECT id, name, parent_id, created_at, updated_at FROM places WHERE id = ?"
          ).get(pid) as {
            id: string;
            name: string;
            parent_id: string | null;
            created_at: string;
            updated_at: string;
          };
          return {
            id: place.id,
            name: place.name,
            parentId: place.parent_id,
            createdAt: place.created_at,
            updatedAt: place.updated_at,
          };
        }),
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      };
    });
  } catch (err) {
    logger.error("[listTodos]", ctx, err);
    throw err;
  }
});

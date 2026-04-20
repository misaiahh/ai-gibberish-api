import { db } from "../../db";
import { defineEventHandler, getRouterParam, createError } from "h3";
import { useSession } from "../../lib/sessionHandler";
import { getLogger } from "../../lib/logger";

// GET /api/places/:id — get a single place
export default defineEventHandler(async (event) => {
  const logger = getLogger();
  const { userId } = useSession(event);
  const id = getRouterParam(event, "id");

  const ctx = { endpoint: event.path, user: userId };

  try {
    const stmt = db.prepare("SELECT * FROM places WHERE id = ? AND user_id = ?");
    const place = stmt.get(id, userId) as {
      id: string;
      user_id: string;
      name: string;
      parent_id: string | null;
      created_at: string;
      updated_at: string;
    } | undefined;

    if (!place) {
      logger.debug("[getPlace]", ctx, { id, message: "not found" });
      throw createError({ statusCode: 404, statusMessage: "Place not found" });
    }

    const childStmt = db.prepare("SELECT * FROM places WHERE parent_id = ? AND user_id = ? ORDER BY name ASC");
    const children = childStmt.all(id, userId) as Array<{
      id: string;
      name: string;
      parent_id: string | null;
      created_at: string;
      updated_at: string;
    }>;

    logger.debug("[getPlace]", ctx, { id, name: place.name });

    return {
      id: place.id,
      name: place.name,
      parentId: place.parent_id,
      createdAt: place.created_at,
      updatedAt: place.updated_at,
      children: children.map((c) => ({
        id: c.id,
        name: c.name,
        parentId: c.parent_id,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("[getPlace]", ctx, err);
    throw createError({ statusCode: 500, statusMessage: "Internal server error" });
  }
});

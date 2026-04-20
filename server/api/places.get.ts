import { db } from "../db";
import { defineEventHandler } from "h3";
import { useSession } from "../lib/sessionHandler";
import { getLogger } from "../lib/logger";

// GET /api/places — list all places for current user
export default defineEventHandler(async (event) => {
  const logger = getLogger();
  const { userId } = useSession(event);

  const ctx = { endpoint: event.path, user: userId };

  try {
    const stmt = db.prepare(
      "SELECT * FROM places WHERE user_id = ? ORDER BY name ASC"
    );
    const places = stmt.all(userId) as Array<{
      id: string;
      user_id: string;
      name: string;
      parent_id: string | null;
      created_at: string;
      updated_at: string;
    }>;

    const result = places.map((p) => ({
      id: p.id,
      name: p.name,
      parentId: p.parent_id,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    logger.debug("[listPlaces]", ctx, { count: result.length });

    return result;
  } catch (err) {
    logger.error("[listPlaces]", ctx, err);
    throw err;
  }
});

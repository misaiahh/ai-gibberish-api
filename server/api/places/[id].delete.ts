import { db } from "../../db";
import { defineEventHandler, getRouterParam, createError } from "h3";
import { useSession } from "../../lib/sessionHandler";
import { getLogger } from "../../lib/logger";

// DELETE /api/places/:id — delete a place and all its sub-places
export default defineEventHandler(async (event) => {
  const logger = getLogger();
  const { userId } = useSession(event);
  const id = getRouterParam(event, "id");

  const ctx = { endpoint: event.path, user: userId };

  try {
    const place = db
      .prepare("SELECT * FROM places WHERE id = ? AND user_id = ?")
      .get(id, userId) as { id: string; name: string } | undefined;

    if (!place) {
      logger.debug("[deletePlace]", ctx, { id, message: "not found" });
      throw createError({ statusCode: 404, statusMessage: "Place not found" });
    }

    const stmt = db.prepare("DELETE FROM places WHERE id = ? OR parent_id = ? AND user_id = ?");
    stmt.run(id, id, userId);

    logger.info("[deletePlace]", ctx, { id, name: place.name });

    return { id };
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("[deletePlace]", ctx, err);
    throw createError({ statusCode: 500, statusMessage: "Internal server error" });
  }
});

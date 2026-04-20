import { db } from "../db";
import { defineEventHandler } from "h3";
import { useSession } from "../lib/sessionHandler";
import { getLogger } from "../lib/logger";

// GET /api/preferences — get current user's preferences
export default defineEventHandler(async (event) => {
  const logger = getLogger();
  const { userId } = useSession(event);
  const ctx = { endpoint: event.path, user: userId };

  try {
    let prefs = db
      .prepare("SELECT * FROM preferences WHERE user_id = ?")
      .get(userId) as {
        user_id: string;
        client_storage_enabled: number;
        server_storage_enabled: number;
        created_at: string;
        updated_at: string;
      } | undefined;

    // Create defaults if no preferences exist
    if (!prefs) {
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO preferences (user_id, client_storage_enabled, server_storage_enabled, created_at, updated_at)
         VALUES (?, 1, 1, ?, ?)`
      ).run(userId, now, now);

      prefs = db
        .prepare("SELECT * FROM preferences WHERE user_id = ?")
        .get(userId) as typeof prefs;

      logger.info("[getPreferences]", ctx, { action: "created_default" });
    } else {
      logger.debug("[getPreferences]", ctx, {
        clientStorageEnabled: prefs.client_storage_enabled === 1,
        serverStorageEnabled: prefs.server_storage_enabled === 1,
      });
    }

    return {
      clientStorageEnabled: prefs.client_storage_enabled === 1,
      serverStorageEnabled: prefs.server_storage_enabled === 1,
      createdAt: prefs.created_at,
      updatedAt: prefs.updated_at,
    };
  } catch (err) {
    logger.error("[getPreferences]", ctx, err);
    throw err;
  }
});

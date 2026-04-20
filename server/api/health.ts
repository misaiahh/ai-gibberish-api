import { defineEventHandler } from "h3";
import { getLogger } from "../lib/logger";

// GET /api/health — health check
export default defineEventHandler(async (event) => {
  const logger = getLogger();
  const ctx = { endpoint: event.path };

  try {
    logger.debug("[healthCheck]", ctx);
    return { status: "ok" };
  } catch (err) {
    logger.error("[healthCheck]", ctx, err);
    throw err;
  }
});

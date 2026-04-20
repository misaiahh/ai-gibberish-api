import { defineEventHandler, getCookie, deleteCookie } from "h3";
import { deleteUserByCookieId } from "../lib/session";
import { getLogger } from "../lib/logger";

const SESSION_NAME = "todo-session";

export default defineEventHandler(async (event) => {
  const logger = getLogger();
  const ctx = { endpoint: event.path };
  const cookieId = getCookie(event, SESSION_NAME);

  logger.debug("[deleteSession]", ctx, { cookieExists: !!cookieId });

  try {
    if (cookieId) {
      deleteUserByCookieId(cookieId);
      logger.info("[deleteSession]", ctx, { userId: cookieId, action: "deleted" });
    }

    deleteCookie(event, SESSION_NAME);

    return { cleared: true };
  } catch (err) {
    logger.error("[deleteSession]", ctx, err);
    throw err;
  }
});

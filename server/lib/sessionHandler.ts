import type { H3Event } from "h3";
import { getCookie, setCookie, deleteCookie } from "h3";
import { getUserByCookieId, upsertUser, createUserRow, insertUser, deleteUserByCookieId } from "./session";
import { getLogger } from "./logger";

const SESSION_NAME = "todo-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function logSession(action: string, label: string, ctx: { endpoint?: string }, userId: string) {
  const logger = getLogger();
  logger.info(label, { ...ctx, user: userId }, { action });
}

function logSessionError(label: string, ctx: { endpoint?: string }, err: unknown) {
  const logger = getLogger();
  logger.error(label, ctx, err);
}

export function useSession(event: H3Event): { userId: string } {
  const cookieId = getCookie(event, SESSION_NAME);
  const label = "[useSession]";
  const ctx = { endpoint: event.path };

  try {
    if (!cookieId || !getUserByCookieId(cookieId)) {
      const userId = crypto.randomUUID();
      const row = createUserRow(userId, cookieId ?? userId);
      insertUser(row);
      upsertUser(userId, userId);
      setCookie(event, SESSION_NAME, userId, {
        maxAge: SESSION_MAX_AGE,
        httpOnly: true,
        sameSite: "lax",
      });
      (event.context as { user: { userId: string } }).user = { userId };
      logSession("created", label, ctx, userId);
      return { userId };
    }

    upsertUser(cookieId, cookieId);
    setCookie(event, SESSION_NAME, cookieId, {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
    });
    (event.context as { user: { userId: string } }).user = { userId: cookieId };
    logSession("existing", label, ctx, cookieId);

    return { userId: cookieId };
  } catch (err) {
    logSessionError(label, ctx, err);
    throw err;
  }
}

export function clearCurrentSession(event: H3Event): void {
  const logger = getLogger();
  const label = "[clearCurrentSession]";
  const ctx = { endpoint: event.path };
  const user = (event.context as { user?: { userId: string } }).user;

  try {
    if (user) {
      deleteUserByCookieId(user.userId);
      logger.info(label, ctx, { userId: user.userId, action: "deleted" });
    } else {
      logger.debug(label, ctx, { action: "no_user", message: "skipping user deletion" });
    }
    deleteCookie(event, SESSION_NAME);
  } catch (err) {
    logger.error(label, ctx, err);
    throw err;
  }
}

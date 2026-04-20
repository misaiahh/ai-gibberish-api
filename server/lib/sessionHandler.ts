import type { H3Event } from "h3";
import { getCookie, setCookie, deleteCookie } from "h3";
import { getUserByCookieId, upsertUser, createUserRow, insertUser, deleteUserByCookieId } from "./session";

const SESSION_NAME = "todo-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function useSession(event: H3Event): { userId: string } {
  const cookieId = getCookie(event, SESSION_NAME);

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
    return { userId };
  }

  upsertUser(cookieId, cookieId);

  setCookie(event, SESSION_NAME, cookieId, {
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
  });

  (event.context as { user: { userId: string } }).user = { userId: cookieId };

  return { userId: cookieId };
}

export function clearCurrentSession(event: H3Event): void {
  const user = (event.context as { user?: { userId: string } }).user;
  if (user) {
    deleteUserByCookieId(user.userId);
  }
  deleteCookie(event, SESSION_NAME);
}

import { defineEventHandler, getCookie, setCookie } from "h3";
import { getUserByCookieId, upsertUser, createUserRow, insertUser } from "../lib/session";

const SESSION_NAME = "todo-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export default defineEventHandler(async (event) => {
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
});

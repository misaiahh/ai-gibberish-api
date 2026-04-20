import { defineEventHandler, setCookie } from "h3";
import { createUserRow, insertUser, upsertUser } from "../lib/session";

const SESSION_NAME = "todo-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export default defineEventHandler(async (event) => {
  const userId = crypto.randomUUID();
  const row = createUserRow(userId, userId);
  insertUser(row);
  upsertUser(userId, userId);

  setCookie(event, SESSION_NAME, userId, {
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
  });

  (event.context as { user: { userId: string } }).user = { userId };

  return { userId };
});

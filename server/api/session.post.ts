import { defineEventHandler, setCookie } from "h3";
import { createSessionRow, insertSession, upsertSession } from "../lib/session";

const SESSION_NAME = "todo-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export default defineEventHandler(async (event) => {
  const newId = crypto.randomUUID();
  const row = createSessionRow(newId);
  insertSession(row);
  upsertSession(newId, { userId: newId });

  setCookie(event, SESSION_NAME, newId, {
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
  });

  (event.context as { session: { sessionId: string } }).session = { sessionId: newId };

  return { sessionId: newId };
});

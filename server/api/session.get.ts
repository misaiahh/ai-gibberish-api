import { defineEventHandler, getCookie, setCookie, createError } from "h3";
import { getSessionById, upsertSession, createSessionRow, insertSession } from "../lib/session";

const SESSION_NAME = "todo-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export default defineEventHandler(async (event) => {
  let sessionId = getCookie(event, SESSION_NAME);

  if (sessionId && !getSessionById(sessionId)) {
    sessionId = crypto.randomUUID();
    const row = createSessionRow(sessionId);
    insertSession(row);
    upsertSession(sessionId, { userId: sessionId });
  }

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    const row = createSessionRow(sessionId);
    insertSession(row);
    upsertSession(sessionId, { userId: sessionId });
  }

  upsertSession(sessionId, { userId: sessionId });

  setCookie(event, SESSION_NAME, sessionId, {
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
  });

  (event.context as { session: { sessionId: string } }).session = { sessionId };

  return { sessionId };
});

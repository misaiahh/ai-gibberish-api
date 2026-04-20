import type { H3Event } from "h3";
import { getCookie, setCookie, deleteCookie } from "h3";
import { getSessionById, upsertSession, createSessionRow, insertSession, deleteSession } from "./session";

const SESSION_NAME = "todo-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function useSession(event: H3Event): { sessionId: string } {
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
}

export function clearCurrentSession(event: H3Event): void {
  const session = (event.context as { session?: { sessionId: string } }).session;
  if (session) {
    deleteSession(session.sessionId);
  }
  deleteCookie(event, SESSION_NAME);
}

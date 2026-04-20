import { defineEventHandler, getCookie, deleteCookie } from "h3";
import { deleteSession } from "../lib/session";

const SESSION_NAME = "todo-session";

export default defineEventHandler(async (event) => {
  const session = (event.context as { session?: { sessionId: string } }).session;
  if (session) {
    deleteSession(session.sessionId);
  }
  deleteCookie(event, SESSION_NAME);
  return { cleared: true };
});

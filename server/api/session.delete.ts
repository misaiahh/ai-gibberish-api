import { defineEventHandler, getCookie, deleteCookie } from "h3";
import { deleteUserByCookieId } from "../lib/session";

const SESSION_NAME = "todo-session";

export default defineEventHandler(async (event) => {
  const cookieId = getCookie(event, SESSION_NAME);
  if (cookieId) {
    deleteUserByCookieId(cookieId);
  }
  deleteCookie(event, SESSION_NAME);
  return { cleared: true };
});

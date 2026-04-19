export default defineEventHandler(async (event) => {
  const headers = event.req.headers as NodeJS.Dict<string | string[]>;
  const origin = typeof headers.origin === "string" ? headers.origin : undefined;
  if (origin) {
    setHeader(event, "Access-Control-Allow-Origin", origin);
  }
  setHeader(event, "Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  setHeader(event, "Access-Control-Allow-Headers", "Content-Type");
  setHeader(event, "Access-Control-Allow-Credentials", "true");

  if (event.req.method === "OPTIONS") {
    return sendNoContent(event, 204);
  }
});

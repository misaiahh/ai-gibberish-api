export default defineEventHandler(async (event) => {
  const origin = event.headers.get("origin");
  if (origin) {
    setHeader(event, "Access-Control-Allow-Origin", origin);
  }
  setHeader(event, "Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  setHeader(event, "Access-Control-Allow-Headers", "Content-Type");
  setHeader(event, "Access-Control-Allow-Credentials", "true");

  if (event.method === "OPTIONS") {
    event.res.statusCode = 204;
    event.res.end();
    return;
  }
});

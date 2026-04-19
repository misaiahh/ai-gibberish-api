const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Todo App API — Documentation</title>
</head>
<body>
  <script
    id="api-reference"
    type="application/json"
    data-url="/openapi.json"
  ></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`;

export default defineEventHandler((event) => {
  setHeader(event, "Content-Type", "text/html; charset=utf-8");
  return html;
});

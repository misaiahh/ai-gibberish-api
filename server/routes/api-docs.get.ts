const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Todo App API — Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@scalar/api-reference@2.0.0/dist/external/scalar-api-reference-default.css" />
</head>
<body>
  <script
    id="api-reference"
    type="application/json"
    data-url="/openapi.json"
  ></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@2.0.0/dist/external/bundle.js"></script>
</body>
</html>`;

export default defineEventHandler((event) => {
  setHeader(event, "Content-Type", "text/html; charset=utf-8");
  return html;
});

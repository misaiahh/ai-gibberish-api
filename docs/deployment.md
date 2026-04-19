# Deployment

This API runs on port 3001.

## Development

### Local

```bash
npm run dev
```

Server runs on `http://localhost:3001`.

### Docker

```bash
docker compose up --build -d
```

Server runs on `http://localhost:3000`.

> **Note**: `nitro dev` inside Docker doesn't reliably pick up file changes. Use `npm run dev` locally for development with hot-reload.

### Override host port

Edit `docker-compose.yml` to change the host port mapping:

```yaml
ports:
  - "8080:3001"
```

## API Reference

See [docs/api.md](../docs/api.md) for full endpoint documentation.

The OpenAPI spec is available at `/openapi.json`. A Scalar-powered API reference UI is served at `/api-docs`.

Example: `http://localhost:3001/api-docs`

## Build artifact

```bash
npm run build
npm run preview
```

Server runs on `http://localhost:3001`.

# Deployment

This API runs on port 3001.

## Development

### Local

```bash
npm run dev
```

Server runs on `http://localhost:3001`.

### Docker (file watching)

```bash
docker compose up --watch
```

Server runs on `http://localhost:3000`.

File changes in `server/` sync into the container and Nitro hot-reloads automatically. Changes to `package.json` restart the container.

## Production

### Docker

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Server runs on `http://localhost:3000`.

### Docker (override host port)

Edit `docker-compose.prod.yml` to change the host port mapping:

```yaml
ports:
  - "8080:3001"
```

### Build artifact

```bash
npm run build
npm run preview
```

Server runs on `http://localhost:3001`.

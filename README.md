# Todo App API

Lightweight REST API for the Todo App, built with H3 + Nitro and SQLite.

## Tech Stack

- **Framework**: H3 + Nitro (filesystem routing)
- **Language**: TypeScript
- **Database**: SQLite (via `better-sqlite3`, no ORM)
- **Container**: Docker

## Endpoints

### Todos

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/todos` | List all todos |
| POST   | `/api/todos` | Create a new todo |
| GET    | `/api/todos/:id` | Get a single todo |
| PATCH  | `/api/todos/:id` | Update a todo |
| DELETE | `/api/todos/:id` | Delete a todo |

### Todo schema

```ts
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
```

## Getting Started

### Local development

```bash
npm install
PORT=3001 npm run dev
```

Server runs on `http://localhost:3001`.

### Tests

```bash
npm test        # run all tests
npm run test:watch  # watch mode
```

Tests build the server first, then run integration tests against the built output + unit tests for the DB layer.

### Docker

```bash
# Build and start
docker compose up --build -d

# Stop
docker compose down

# View logs
docker compose logs -f
```

Server runs on `http://localhost:3000`. Note: `nitro dev` inside Docker doesn't reliably pick up file changes. Use `npm run dev` locally for development with hot-reload.

The SQLite database is persisted in `./data/`.

## API Reference

See [docs/api.md](docs/api.md) for full endpoint documentation.

An interactive API reference (Scalar UI) is available at `/api-docs`. The raw OpenAPI spec is at `/openapi.json`.

Example: `http://localhost:3001/api-docs`

## API

All endpoints return JSON. Errors return `{ error: "message" }` with the appropriate HTTP status code.

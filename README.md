# Todo App API

Lightweight REST API for the Todo App, built with H3 + Nitro and SQLite.

## Summary of Changes

- Added `/api/preferences` endpoint for storing user preferences (client-side and server-side storage toggles)
- Pinned apt packages in Dockerfile to specific versions for reproducible builds
- Added ESLint with TypeScript recommended rules for code quality

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

### Preferences

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/preferences` | Get current user's preferences (creates defaults if none exist) |
| PATCH  | `/api/preferences` | Update current user's preferences |

### Preferences schema

```ts
interface Preferences {
  clientStorageEnabled: boolean; // Enable/disable client-side storage
  serverStorageEnabled: boolean; // Enable/disable server-side storage
  createdAt: string;             // ISO date string
  updatedAt: string;             // ISO date string
}
```

Users can keep all data locally with no backup by setting both preferences to `false`.

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

### Contract Tests (Pact)

Consumer-driven contract tests validate that the API response shapes match frontend expectations.

```bash
npm run test:contracts   # run all 15 contract tests
```

Tests run in three phases:
1. **Consumer interactions** (9 tests) — generates a pact file via mock server
2. **Provider verification** (1 test) — validates the real Nitro server against the pact file (stateless interactions only)
3. **Integration tests** (5 tests) — covers state-dependent endpoints (GET by id, PATCH, DELETE)

See [docs/contract-testing.md](docs/contract-testing.md) for setup details and troubleshooting.

### Linting

```bash
npm run lint   # lint all .ts, .js, and .json files
```

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

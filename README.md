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

#### Development (file watching)

```bash
# Start with file watching — changes to server/ sync and hot-reload
docker compose up --watch
```

Server runs on `http://localhost:3000`.

#### Production

```bash
# Build and start production container
docker compose -f docker-compose.prod.yml up --build -d

# Stop
docker compose -f docker-compose.prod.yml down

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

Server runs on `http://localhost:3000`.

The SQLite database is persisted in `./data/`.

## API

All endpoints return JSON. Errors return `{ error: "message" }` with the appropriate HTTP status code.

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
npm run dev
```

Server runs on `http://localhost:3001`.

### Docker

```bash
docker compose up --build
```

Server runs on `http://localhost:3001`. The SQLite database file is persisted in `./data/`.

## API

All endpoints return JSON. Errors return `{ error: "message" }` with the appropriate HTTP status code.

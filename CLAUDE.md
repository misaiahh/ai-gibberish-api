# CLAUDE.md

## Always update README.md

When implementing any feature, bug fix, or significant change, always update the "Summary of Changes" section at the bottom of README.md. Describe what changed and why in plain language. Do this before committing.

## API Overview

This is the backend API service for the `todo-app` frontend. It exposes a REST API that the frontend consumes for all data operations.

## Conventions

- **Framework**: Use a lightweight Node.js framework (Express or Fastify)
- **Language**: TypeScript
- **Database**: Choose a simple, local database (SQLite via better-sqlite3 or Prisma + SQLite)
- **Base URL**: The frontend will call `http://localhost:3001/api` (reserve port 3001)
- **CORS**: Allow `http://localhost:5173` (Vite dev server) and production origin
- **Error format**: Always return `{ error: "message" }` with appropriate HTTP status codes
- **Auth**: No auth for now. If added later, use JWT with a secret from env var `JWT_SECRET`

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

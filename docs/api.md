# API Reference

## OpenAPI Spec

The full OpenAPI 3.1.0 spec is served at:

- Local: `http://localhost:3001/openapi.json`
- Docker: `http://localhost:3000/openapi.json`

## Interactive Docs

A Scalar-powered API reference UI is available at:

- Local: `http://localhost:3001/api-docs`
- Docker: `http://localhost:3000/api-docs`

## Endpoints

### List Todos

**GET** `/api/todos`

Returns all todos, ordered by creation date (newest first).

**Response** `200 OK`

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Buy groceries",
    "completed": false,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### Create Todo

**POST** `/api/todos`

**Body**

```json
{
  "title": "Buy groceries"
}
```

**Response** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Buy groceries",
  "completed": false,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**Response** `400 Bad Request`

```json
{
  "error": "Title is required"
}
```

### Get Todo

**GET** `/api/todos/:id`

**Response** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Buy groceries",
  "completed": false,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

**Response** `404 Not Found`

```json
{
  "error": "Todo not found"
}
```

### Update Todo

**PATCH** `/api/todos/:id`

**Body**

```json
{
  "completed": true
}
```

**Response** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Buy groceries",
  "completed": true,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-02T00:00:00.000Z"
}
```

**Response** `400 Bad Request`

```json
{
  "error": "No valid fields to update"
}
```

**Response** `404 Not Found`

```json
{
  "error": "Todo not found"
}
```

### Delete Todo

**DELETE** `/api/todos/:id`

**Response** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Buy groceries",
  "completed": false,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-02T00:00:00.000Z"
}
```

**Response** `404 Not Found`

```json
{
  "error": "Todo not found"
}
```

## Error Format

All errors follow this structure:

```json
{
  "error": "Error message here"
}
```

## Schema

```ts
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
```

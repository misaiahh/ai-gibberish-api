import { registry } from "../openapi";
import { z } from "zod";

// Shared Todo response schema
export const TodoSchema = z
  .object({
    id: z.string().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    title: z.string().openapi({ example: "Buy groceries" }),
    completed: z.boolean().openapi({ example: false }),
    createdAt: z.string().openapi({ example: "2025-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2025-01-01T00:00:00.000Z" }),
  })
  .openapi("Todo");

export const TodoListSchema = z.array(TodoSchema).openapi("TodoList");

export const CreateTodoInputSchema = z
  .object({
    title: z.string().min(1).openapi({
      description: "The todo title",
      example: "Buy groceries",
    }),
  })
  .openapi("CreateTodoInput");

export const UpdateTodoInputSchema = z
  .object({
    title: z.string().min(1).optional().openapi({
      description: "Updated title",
      example: "Buy groceries and more",
    }),
    completed: z.boolean().optional().openapi({
      description: "Completion status",
      example: true,
    }),
  })
  .openapi("UpdateTodoInput");

const IdParam = z.object({
  id: z.string().openapi({
    description: "Todo ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  }),
});

// Preferences schemas
export const PreferencesSchema = z
  .object({
    clientStorageEnabled: z.boolean().openapi({
      description: "Enable/disable client-side storage",
      example: true,
    }),
    serverStorageEnabled: z.boolean().openapi({
      description: "Enable/disable server-side storage",
      example: true,
    }),
    createdAt: z.string().openapi({ example: "2025-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2025-01-01T00:00:00.000Z" }),
  })
  .openapi("Preferences");

export const UpdatePreferencesInputSchema = z
  .object({
    clientStorageEnabled: z.boolean().optional().openapi({
      description: "Enable/disable client-side storage",
      example: false,
    }),
    serverStorageEnabled: z.boolean().optional().openapi({
      description: "Enable/disable server-side storage",
      example: false,
    }),
  })
  .openapi("UpdatePreferencesInput");

export default defineNitroPlugin(() => {
  registry.registerPath({
    method: "get",
    path: "/api/todos",
    summary: "List all todos",
    request: {},
    responses: {
      200: {
        description: "List of all todos",
        content: {
          "application/json": {
            schema: TodoListSchema,
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/todos",
    summary: "Create a todo",
    request: {
      body: {
        description: "Todo data",
        content: {
          "application/json": {
            schema: CreateTodoInputSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Created todo",
        content: {
          "application/json": {
            schema: TodoSchema,
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }).openapi("ErrorResponse"),
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/todos/{id}",
    summary: "Get a todo",
    request: {
      params: IdParam,
    },
    responses: {
      200: {
        description: "Todo details",
        content: {
          "application/json": {
            schema: TodoSchema,
          },
        },
      },
      404: {
        description: "Todo not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }).openapi("ErrorResponse"),
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/api/todos/{id}",
    summary: "Update a todo",
    request: {
      params: IdParam,
      body: {
        description: "Fields to update",
        content: {
          "application/json": {
            schema: UpdateTodoInputSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Updated todo",
        content: {
          "application/json": {
            schema: TodoSchema,
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }).openapi("ErrorResponse"),
          },
        },
      },
      404: {
        description: "Todo not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }).openapi("ErrorResponse"),
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/api/todos/{id}",
    summary: "Delete a todo",
    request: {
      params: IdParam,
    },
    responses: {
      200: {
        description: "Deleted todo",
        content: {
          "application/json": {
            schema: TodoSchema,
          },
        },
      },
      404: {
        description: "Todo not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }).openapi("ErrorResponse"),
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/preferences",
    summary: "Get user preferences",
    request: {},
    responses: {
      200: {
        description: "User preferences",
        content: {
          "application/json": {
            schema: PreferencesSchema,
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "patch",
    path: "/api/preferences",
    summary: "Update user preferences",
    request: {
      body: {
        description: "Preferences to update (at least one required)",
        content: {
          "application/json": {
            schema: UpdatePreferencesInputSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Updated preferences",
        content: {
          "application/json": {
            schema: PreferencesSchema,
          },
        },
      },
      400: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }).openapi("ErrorResponse"),
          },
        },
      },
    },
  });
});

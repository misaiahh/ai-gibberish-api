import { registry } from "../openapi";
import { z } from "zod";

// Shared Todo response schema
export const TodoSchema = z
  .object({
    id: z.string().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    title: z.string().openapi({ example: "Buy groceries" }),
    completed: z.boolean().openapi({ example: false }),
    placeId: z.string().nullable().openapi({ example: null }),
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
    placeId: z.string().nullable().optional().openapi({
      description: "Optional place ID to associate the todo with",
      example: null,
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
    placeId: z.string().nullable().optional().openapi({
      description: "Optional place ID to associate the todo with",
      example: null,
    }),
  })
  .openapi("UpdateTodoInput");

const IdParam = z.object({
  id: z.string().openapi({
    description: "Todo ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  }),
});

// Place schemas
export const PlaceSchema = z
  .object({
    id: z.string().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    name: z.string().openapi({ example: "Home" }),
    parentId: z.string().nullable().openapi({ example: null }),
    createdAt: z.string().openapi({ example: "2025-01-01T00:00:00.000Z" }),
    updatedAt: z.string().openapi({ example: "2025-01-01T00:00:00.000Z" }),
    children: z.array(z.any()).optional().openapi({ example: [] }),
  })
  .openapi("Place");

export const PlaceListSchema = z.array(PlaceSchema).openapi("PlaceList");

export const CreatePlaceInputSchema = z
  .object({
    name: z.string().min(1).openapi({
      description: "The place name",
      example: "Home",
    }),
    parentId: z.string().nullable().optional().openapi({
      description: "Optional parent place ID for sub-places",
      example: null,
    }),
  })
  .openapi("CreatePlaceInput");

export const UpdatePlaceInputSchema = z
  .object({
    name: z.string().min(1).optional().openapi({
      description: "Updated place name",
      example: "Home Office",
    }),
    parentId: z.string().nullable().optional().openapi({
      description: "Optional parent place ID. Set to null to unlink from parent.",
      example: null,
    }),
  })
  .openapi("UpdatePlaceInput");

const PlaceIdParam = z.object({
  id: z.string().openapi({
    description: "Place ID",
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
  // === Todo endpoints ===

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
            schema: z.object({ id: z.string() }).openapi("DeleteResponse"),
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

  // === Place endpoints ===

  registry.registerPath({
    method: "get",
    path: "/api/places",
    summary: "List all places",
    request: {},
    responses: {
      200: {
        description: "List of all places",
        content: {
          "application/json": {
            schema: PlaceListSchema,
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/places",
    summary: "Create a place",
    request: {
      body: {
        description: "Place data",
        content: {
          "application/json": {
            schema: CreatePlaceInputSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Created place",
        content: {
          "application/json": {
            schema: PlaceSchema,
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
    path: "/api/places/{id}",
    summary: "Get a place",
    request: {
      params: PlaceIdParam,
    },
    responses: {
      200: {
        description: "Place details with children",
        content: {
          "application/json": {
            schema: PlaceSchema,
          },
        },
      },
      404: {
        description: "Place not found",
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
    path: "/api/places/{id}",
    summary: "Update a place",
    request: {
      params: PlaceIdParam,
      body: {
        description: "Fields to update",
        content: {
          "application/json": {
            schema: UpdatePlaceInputSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Updated place",
        content: {
          "application/json": {
            schema: PlaceSchema,
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
        description: "Place not found",
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
    path: "/api/places/{id}",
    summary: "Delete a place",
    request: {
      params: PlaceIdParam,
    },
    responses: {
      200: {
        description: "Deleted place and all sub-places",
        content: {
          "application/json": {
            schema: z.object({ id: z.string() }).openapi("DeleteResponse"),
          },
        },
      },
      404: {
        description: "Place not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }).openapi("ErrorResponse"),
          },
        },
      },
    },
  });

  // === Preferences endpoints ===

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

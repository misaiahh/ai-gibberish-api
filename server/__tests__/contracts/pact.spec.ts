import { PactV4, MatchersV3 } from "@pact-foundation/pact";
import { Verifier } from "@pact-foundation/pact";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { startServer, stopServer, api } from "../helper";

// Pact consumer — defines what the frontend expects from the API
const pact = new PactV4({
  dir: "./pacts",
  consumer: "frontend",
  provider: "todo-api",
  log: "./pacts/pact.log",
  logLevel: "warn",
});

const todoId = MatchersV3.regex(
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
);
const isoDateTime = MatchersV3.regex(
  "\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z"
);
const todoSchema = MatchersV3.like({
  id: todoId,
  title: "string",
  completed: false,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
const todoListSchema = MatchersV3.eachLike(todoSchema);

// Response checker — validates real server responses with flexible shape matching
function checkResponse(
  response: Record<string, unknown>,
  body: unknown
): void | false {
  if (response.status === 200) {
    if (Array.isArray(body)) {
      if (body.length > 0) {
        const item = body[0] as Record<string, unknown>;
        if (!item.id || typeof item.title === "undefined") {
          throw new Error("Todo in array missing id or title");
        }
      }
      return;
    }
    if (body && typeof body === "object") {
      const obj = body as Record<string, unknown>;
      if (obj.status === "ok") return;
      if (typeof obj.title !== "undefined" && !obj.id) {
        throw new Error("Todo response missing id");
      }
      return;
    }
  }
  if ([400, 404].includes(response.status) && body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (typeof obj.message === "undefined" && typeof obj.error === "undefined") {
      throw new Error(`Error ${response.status} missing message/error field`);
    }
  }
}

describe("Pact contract tests", () => {
  beforeAll(async () => {
    await startServer();
  });

  afterAll(async () => {
    await stopServer();
  });

  // Phase 1: Consumer interactions — generate pact file against mock server
  describe("consumer interactions (pact file generation)", () => {
    it("GET /api/health returns { status: 'ok' }", () => {
      return pact
        .addInteraction()
        .given("API is healthy")
        .uponReceiving("a health check request")
        .withRequest("GET", "/api/health")
        .willRespondWith(200, { body: { status: "ok" } })
        .executeTest(async (mockserver) => {
          const res = await api("/api/health", {}, mockserver.url);
          expect(res.status).toBe(200);
        });
    });

    it("GET /api/todos returns an array", () => {
      return pact
        .addInteraction()
        .given("No todos exist")
        .uponReceiving("a request for all todos")
        .withRequest("GET", "/api/todos")
        .willRespondWith(200, { body: todoListSchema })
        .executeTest(async (mockserver) => {
          const res = await api("/api/todos", {}, mockserver.url);
          expect(res.status).toBe(200);
        });
    });

    it("POST /api/todos creates a todo with correct shape", () => {
      return pact
        .addInteraction()
        .given("No todos exist")
        .uponReceiving("a request to create a todo")
        .withRequest("POST", "/api/todos", (builder) => {
          builder.jsonBody({ title: "Buy groceries" });
        })
        .willRespondWith(200, { body: todoSchema })
        .executeTest(async (mockserver) => {
          const res = await api(
            "/api/todos",
            { method: "POST", body: JSON.stringify({ title: "Buy groceries" }) },
            mockserver.url
          );
          expect(res.status).toBe(200);
        });
    });

    it("POST /api/todos rejects empty title with 400", () => {
      return pact
        .addInteraction()
        .given("No todos exist")
        .uponReceiving("a request with empty title")
        .withRequest("POST", "/api/todos", (builder) => {
          builder.jsonBody({ title: "" });
        })
        .willRespondWith(400, { body: { message: "Title is required" } })
        .executeTest(async (mockserver) => {
          const res = await api(
            "/api/todos",
            { method: "POST", body: JSON.stringify({ title: "" }) },
            mockserver.url
          );
          expect(res.status).toBe(400);
        });
    });

    const testId = "550e8400-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

    it("GET /api/todos/:id returns a todo", () => {
      return pact
        .addInteraction()
        .given("A todo exists")
        .uponReceiving("a request for a specific todo")
        .withRequest("GET", `/api/todos/${testId}`)
        .willRespondWith(200, { body: todoSchema })
        .executeTest(async (mockserver) => {
          const res = await api(`/api/todos/${testId}`, {}, mockserver.url);
          expect(res.status).toBe(200);
        });
    });

    it("GET /api/todos/:id returns 404 for unknown id", () => {
      return pact
        .addInteraction()
        .given("No todos exist")
        .uponReceiving("a request for a nonexistent todo")
        .withRequest("GET", "/api/todos/nonexistent")
        .willRespondWith(404, { body: { message: "Todo not found" } })
        .executeTest(async (mockserver) => {
          const res = await api("/api/todos/nonexistent", {}, mockserver.url);
          expect(res.status).toBe(404);
        });
    });

    it("PATCH /api/todos/:id updates a todo", () => {
      return pact
        .addInteraction()
        .given("A todo exists")
        .uponReceiving("a request to update a todo")
        .withRequest("PATCH", `/api/todos/${testId}`, (builder) => {
          builder.jsonBody({ completed: true });
        })
        .willRespondWith(200, { body: todoSchema })
        .executeTest(async (mockserver) => {
          const res = await api(
            `/api/todos/${testId}`,
            { method: "PATCH", body: JSON.stringify({ completed: true }) },
            mockserver.url
          );
          expect(res.status).toBe(200);
        });
    });

    it("PATCH /api/todos/:id returns 404 for unknown id", () => {
      return pact
        .addInteraction()
        .given("No todos exist")
        .uponReceiving("a request to update a nonexistent todo")
        .withRequest("PATCH", "/api/todos/nonexistent", (builder) => {
          builder.jsonBody({ title: "nope" });
        })
        .willRespondWith(404, { body: { message: "Todo not found" } })
        .executeTest(async (mockserver) => {
          const res = await api(
            "/api/todos/nonexistent",
            { method: "PATCH", body: JSON.stringify({ title: "nope" }) },
            mockserver.url
          );
          expect(res.status).toBe(404);
        });
    });

    it("DELETE /api/todos/:id removes a todo", () => {
      return pact
        .addInteraction()
        .given("A todo exists")
        .uponReceiving("a request to delete a todo")
        .withRequest("DELETE", `/api/todos/${testId}`)
        .willRespondWith(200, { body: { id: todoId } })
        .executeTest(async (mockserver) => {
          const res = await api(
            `/api/todos/${testId}`,
            { method: "DELETE" },
            mockserver.url
          );
          expect(res.status).toBe(200);
        });
    });
  });

  // Phase 2: Provider verification — validate real Nitro server against pact file
  it("verifies provider pact contract (stateless interactions)", async () => {
    // Filter to stateless interactions (state-dependent ones need DB state)
    const fullPact = JSON.parse(
      readFileSync("./pacts/frontend-todo-api.json", "utf8")
    );
    const statelessDescriptions = [
      "a health check request",
      "a request for all todos",
      "a request to create a todo",
      "a request with empty title",
      "a request for a nonexistent todo",
      "a request to update a nonexistent todo",
    ];
    fullPact.interactions = fullPact.interactions.filter((i: { description: string }) =>
      statelessDescriptions.includes(i.description)
    );
    writeFileSync("./pacts/frontend-todo-api.provider.json", JSON.stringify(fullPact));

    const output = await new Verifier({
      providerBaseUrl: "http://localhost:3001",
      pactUrls: ["./pacts/frontend-todo-api.provider.json"],
      publishVerificationResult: false,
      providerVersion: "1.0.0",
      provider: "todo-api",
      stateless: true,
      checkResponse,
    } as any).verifyProvider();
    console.log(output);
  });

  // Phase 3: Integration tests for state-dependent endpoints
  describe("provider integration (stateful endpoints)", () => {
    it("GET /api/todos/:id returns a todo with correct shape", async () => {
      const createRes = await api("/api/todos", {
        method: "POST",
        body: JSON.stringify({ title: "Contract test todo" }),
      });
      expect(createRes.status).toBe(200);
      const created = (await createRes.json()) as Record<string, unknown>;

      const res = await api(`/api/todos/${created.id}`);
      expect(res.status).toBe(200);
      const todo = (await res.json()) as Record<string, unknown>;

      expect(typeof todo.id).toBe("string");
      expect(todo.title).toBe("Contract test todo");
      expect(typeof todo.completed).toBe("boolean");
      expect(typeof todo.createdAt).toBe("string");
      expect(typeof todo.updatedAt).toBe("string");
    });

    it("GET /api/todos/:id returns 404 for unknown id", async () => {
      const res = await api("/api/todos/nonexistent");
      expect(res.status).toBe(404);
      const body = (await res.json()) as Record<string, unknown>;
      expect(typeof body.message).toBe("string");
    });

    it("PATCH /api/todos/:id updates a todo", async () => {
      const createRes = await api("/api/todos", {
        method: "POST",
        body: JSON.stringify({ title: "Patch me" }),
      });
      const created = (await createRes.json()) as Record<string, unknown>;

      const res = await api(`/api/todos/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: true }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.completed).toBe(true);
      expect(body.id).toBe(created.id);
    });

    it("PATCH /api/todos/:id returns 404 for unknown id", async () => {
      const res = await api("/api/todos/nonexistent", {
        method: "PATCH",
        body: JSON.stringify({ title: "nope" }),
      });
      expect(res.status).toBe(404);
    });

    it("DELETE /api/todos/:id removes a todo", async () => {
      const createRes = await api("/api/todos", {
        method: "POST",
        body: JSON.stringify({ title: "Delete me" }),
      });
      const created = (await createRes.json()) as Record<string, unknown>;

      const res = await api(`/api/todos/${created.id}`, {
        method: "DELETE",
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.id).toBe(created.id);
    });
  });
});

import { PactV4, MatchersV3 } from "@pact-foundation/pact";
import { Verifier } from "@pact-foundation/pact";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { startServer, stopServer, api } from "../helper";

function extractCookieId(setCookieHeader: string): string {
  const match = setCookieHeader.match(/todo-session=([^;]+)/);
  return match ? match[1] : "";
}

function withCookie(userId: string, headers?: Record<string, string>): Record<string, string> {
  return {
    ...headers,
    Cookie: userId ? `todo-session=${userId}` : "",
  };
}

// Pact consumer — defines what the frontend expects from the API
const pact = new PactV4({
  dir: "./pacts",
  consumer: "frontend",
  provider: "todo-api",
  log: "./pacts/pact.log",
  logLevel: "warn",
});

const idMatcher = MatchersV3.regex(
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
);
const isoDateTime = MatchersV3.regex(
  "\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z"
);

// ── Schemas ──────────────────────────────────────────────────────────────────

const todoSchema = MatchersV3.like({
  id: idMatcher,
  title: "string",
  completed: false,
  placeId: null,
  place: null,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
const todoListSchema = MatchersV3.eachLike(todoSchema);

const placeSchema = MatchersV3.like({
  id: idMatcher,
  name: "string",
  parentId: null,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
const placeListSchema = MatchersV3.eachLike(placeSchema);

const placeDetailSchema = MatchersV3.like({
  id: idMatcher,
  name: "string",
  parentId: null,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  children: MatchersV3.eachLike({
    id: idMatcher,
    name: "string",
    parentId: null,
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  }),
});

const sessionSchema = MatchersV3.like({
  userId: idMatcher,
});

const preferencesSchema = MatchersV3.like({
  clientStorageEnabled: false,
  serverStorageEnabled: false,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

// ── Response checker ─────────────────────────────────────────────────────────

function checkResponse(
  response: Record<string, unknown>,
  body: unknown,
): void | false {
  if (response.status === 200) {
    if (Array.isArray(body)) {
      if (body.length > 0) {
        const item = body[0] as Record<string, unknown>;
        // Could be todos, places, or other list items
        if (typeof item.id !== "undefined" && typeof item.title !== "undefined") {
          return;
        }
        if (typeof item.id !== "undefined" && typeof item.name !== "undefined") {
          return;
        }
        throw new Error("Array item missing id and title/name");
      }
      return;
    }
    if (body && typeof body === "object") {
      const obj = body as Record<string, unknown>;
      if (obj.status === "ok") return;
      if (typeof obj.userId !== "undefined" && typeof obj.id === "undefined") {
        // Session response
        return;
      }
      if (typeof obj.id !== "undefined" && typeof obj.title !== "undefined") {
        // Todo response
        return;
      }
      if (typeof obj.id !== "undefined" && typeof obj.name !== "undefined") {
        // Place response
        return;
      }
      if (typeof obj.cleared !== "undefined") {
        // Session delete response
        return;
      }
      if (typeof obj.clientStorageEnabled !== "undefined") {
        // Preferences response
        return;
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

  // ── Phase 1: Consumer interactions — generate pact file against mock server ──

  describe("consumer interactions (pact file generation)", () => {
    // ── Health ────────────────────────────────────────────────────────────────

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

    // ── Todos ─────────────────────────────────────────────────────────────────

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
            mockserver.url,
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
        .willRespondWith(400, { body: { message: "Title is required and must be a non-empty string" } })
        .executeTest(async (mockserver) => {
          const res = await api(
            "/api/todos",
            { method: "POST", body: JSON.stringify({ title: "" }) },
            mockserver.url,
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
            mockserver.url,
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
            mockserver.url,
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
        .willRespondWith(200, { body: { id: idMatcher } })
        .executeTest(async (mockserver) => {
          const res = await api(
            `/api/todos/${testId}`,
            { method: "DELETE" },
            mockserver.url,
          );
          expect(res.status).toBe(200);
        });
    });

    // ── Places ────────────────────────────────────────────────────────────────

    it("GET /api/places returns an array", () => {
      return pact
        .addInteraction()
        .given("No places exist")
        .uponReceiving("a request for all places")
        .withRequest("GET", "/api/places")
        .willRespondWith(200, { body: placeListSchema })
        .executeTest(async (mockserver) => {
          const res = await api("/api/places", {}, mockserver.url);
          expect(res.status).toBe(200);
        });
    });

    it("POST /api/places creates a place with correct shape", () => {
      return pact
        .addInteraction()
        .given("No places exist")
        .uponReceiving("a request to create a place")
        .withRequest("POST", "/api/places", (builder) => {
          builder.jsonBody({ name: "Kitchen" });
        })
        .willRespondWith(200, { body: placeSchema })
        .executeTest(async (mockserver) => {
          const res = await api(
            "/api/places",
            { method: "POST", body: JSON.stringify({ name: "Kitchen" }) },
            mockserver.url,
          );
          expect(res.status).toBe(200);
        });
    });

    it("POST /api/places rejects empty name with 400", () => {
      return pact
        .addInteraction()
        .given("No places exist")
        .uponReceiving("a request with empty place name")
        .withRequest("POST", "/api/places", (builder) => {
          builder.jsonBody({ name: "" });
        })
        .willRespondWith(400, { body: { message: "Name is required and must be a non-empty string" } })
        .executeTest(async (mockserver) => {
          const res = await api(
            "/api/places",
            { method: "POST", body: JSON.stringify({ name: "" }) },
            mockserver.url,
          );
          expect(res.status).toBe(400);
        });
    });

    it("GET /api/places/:id returns a place with children", () => {
      return pact
        .addInteraction()
        .given("A place exists")
        .uponReceiving("a request for a specific place")
        .withRequest("GET", `/api/places/${testId}`)
        .willRespondWith(200, { body: placeDetailSchema })
        .executeTest(async (mockserver) => {
          const res = await api(`/api/places/${testId}`, {}, mockserver.url);
          expect(res.status).toBe(200);
        });
    });

    it("GET /api/places/:id returns 404 for unknown id", () => {
      return pact
        .addInteraction()
        .given("No places exist")
        .uponReceiving("a request for a nonexistent place")
        .withRequest("GET", "/api/places/nonexistent")
        .willRespondWith(404, { body: { message: "Place not found" } })
        .executeTest(async (mockserver) => {
          const res = await api("/api/places/nonexistent", {}, mockserver.url);
          expect(res.status).toBe(404);
        });
    });

    it("PATCH /api/places/:id updates a place", () => {
      return pact
        .addInteraction()
        .given("A place exists")
        .uponReceiving("a request to update a place")
        .withRequest("PATCH", `/api/places/${testId}`, (builder) => {
          builder.jsonBody({ name: "Updated Kitchen" });
        })
        .willRespondWith(200, { body: placeSchema })
        .executeTest(async (mockserver) => {
          const res = await api(
            `/api/places/${testId}`,
            { method: "PATCH", body: JSON.stringify({ name: "Updated Kitchen" }) },
            mockserver.url,
          );
          expect(res.status).toBe(200);
        });
    });

    it("PATCH /api/places/:id returns 404 for unknown id", () => {
      return pact
        .addInteraction()
        .given("No places exist")
        .uponReceiving("a request to update a nonexistent place")
        .withRequest("PATCH", "/api/places/nonexistent", (builder) => {
          builder.jsonBody({ name: "nope" });
        })
        .willRespondWith(404, { body: { message: "Place not found" } })
        .executeTest(async (mockserver) => {
          const res = await api(
            "/api/places/nonexistent",
            { method: "PATCH", body: JSON.stringify({ name: "nope" }) },
            mockserver.url,
          );
          expect(res.status).toBe(404);
        });
    });

    it("DELETE /api/places/:id removes a place", () => {
      return pact
        .addInteraction()
        .given("A place exists")
        .uponReceiving("a request to delete a place")
        .withRequest("DELETE", `/api/places/${testId}`)
        .willRespondWith(200, { body: { id: idMatcher } })
        .executeTest(async (mockserver) => {
          const res = await api(
            `/api/places/${testId}`,
            { method: "DELETE" },
            mockserver.url,
          );
          expect(res.status).toBe(200);
        });
    });

    // ── Session ───────────────────────────────────────────────────────────────

    it("GET /api/session returns userId", () => {
      return pact
        .addInteraction()
        .given("A user exists")
        .uponReceiving("a request for current session")
        .withRequest("GET", "/api/session")
        .willRespondWith(200, { body: sessionSchema })
        .executeTest(async (mockserver) => {
          const res = await api("/api/session", {}, mockserver.url);
          expect(res.status).toBe(200);
        });
    });

    it("POST /api/session creates a new session", () => {
      return pact
        .addInteraction()
        .given("A user exists")
        .uponReceiving("a request to create a new session")
        .withRequest("POST", "/api/session")
        .willRespondWith(200, { body: sessionSchema })
        .executeTest(async (mockserver) => {
          const res = await api(
            "/api/session",
            { method: "POST" },
            mockserver.url,
          );
          expect(res.status).toBe(200);
        });
    });

    it("DELETE /api/session clears the session", () => {
      return pact
        .addInteraction()
        .given("A session exists")
        .uponReceiving("a request to delete the session")
        .withRequest("DELETE", "/api/session")
        .willRespondWith(200, { body: { cleared: true } })
        .executeTest(async (mockserver) => {
          const res = await api(
            "/api/session",
            { method: "DELETE" },
            mockserver.url,
          );
          expect(res.status).toBe(200);
        });
    });

    // ── Preferences ───────────────────────────────────────────────────────────

    it("GET /api/preferences returns preferences", () => {
      return pact
        .addInteraction()
        .given("A user exists")
        .uponReceiving("a request for preferences")
        .withRequest("GET", "/api/preferences")
        .willRespondWith(200, { body: preferencesSchema })
        .executeTest(async (mockserver) => {
          const res = await api("/api/preferences", {}, mockserver.url);
          expect(res.status).toBe(200);
        });
    });

    it("PATCH /api/preferences updates preferences", () => {
      return pact
        .addInteraction()
        .given("A user exists")
        .uponReceiving("a request to update preferences")
        .withRequest("PATCH", "/api/preferences", (builder) => {
          builder.jsonBody({ clientStorageEnabled: false });
        })
        .willRespondWith(200, { body: preferencesSchema })
        .executeTest(async (mockserver) => {
          const res = await api(
            "/api/preferences",
            { method: "PATCH", body: JSON.stringify({ clientStorageEnabled: false }) },
            mockserver.url,
          );
          expect(res.status).toBe(200);
        });
    });

    it("PATCH /api/preferences rejects invalid boolean with 400", () => {
      return pact
        .addInteraction()
        .given("A user exists")
        .uponReceiving("a request with invalid preferences")
        .withRequest("PATCH", "/api/preferences", (builder) => {
          builder.jsonBody({ clientStorageEnabled: "yes" });
        })
        .willRespondWith(400, { body: { message: "clientStorageEnabled must be a boolean" } })
        .executeTest(async (mockserver) => {
          const res = await api(
            "/api/preferences",
            { method: "PATCH", body: JSON.stringify({ clientStorageEnabled: "yes" }) },
            mockserver.url,
          );
          expect(res.status).toBe(400);
        });
    });
  });

  // ── Phase 2: Provider verification — validate real Nitro server against pact file ──

  it("verifies provider pact contract (stateless interactions)", async () => {
    // Filter to stateless interactions (state-dependent ones need DB state)
    const fullPact = JSON.parse(
      readFileSync("./pacts/frontend-todo-api.json", "utf8"),
    );
    const statelessDescriptions = [
      "a health check request",
      "a request for all todos",
      "a request to create a todo",
      "a request with empty title",
      "a request for a nonexistent todo",
      "a request to update a nonexistent todo",
      "a request for all places",
      "a request to create a place",
      "a request with empty place name",
      "a request for a nonexistent place",
      "a request to update a nonexistent place",
      "a request to delete a session",
      "a request to create a new session",
      "a request for preferences",
      "a request to update preferences",
      "a request with invalid preferences",
    ];
    fullPact.interactions = fullPact.interactions.filter((i: { description: string }) =>
      statelessDescriptions.includes(i.description),
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

  // ── Phase 3: Integration tests for state-dependent endpoints ──

  describe("provider integration (stateful endpoints)", () => {
    let userId = "";

    beforeAll(async () => {
      const res = await api("/api/session", { method: "POST" });
      expect(res.status).toBe(200);
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        userId = extractCookieId(setCookie);
      }
    });

    // ── Todos ─────────────────────────────────────────────────────────────────

    it("GET /api/todos/:id returns a todo with correct shape", async () => {
      const createRes = await api("/api/todos", {
        method: "POST",
        body: JSON.stringify({ title: "Contract test todo" }),
        headers: withCookie(userId),
      });
      expect(createRes.status).toBe(200);
      const created = (await createRes.json()) as Record<string, unknown>;

      const res = await api(`/api/todos/${created.id}`, { headers: withCookie(userId) });
      expect(res.status).toBe(200);
      const todo = (await res.json()) as Record<string, unknown>;

      expect(typeof todo.id).toBe("string");
      expect(todo.title).toBe("Contract test todo");
      expect(typeof todo.completed).toBe("boolean");
      expect(typeof todo.createdAt).toBe("string");
      expect(typeof todo.updatedAt).toBe("string");
    });

    it("GET /api/todos/:id returns 404 for unknown id", async () => {
      const res = await api("/api/todos/nonexistent", { headers: withCookie(userId) });
      expect(res.status).toBe(404);
      const body = (await res.json()) as Record<string, unknown>;
      expect(typeof body.message).toBe("string");
    });

    it("PATCH /api/todos/:id updates a todo", async () => {
      const createRes = await api("/api/todos", {
        method: "POST",
        body: JSON.stringify({ title: "Patch me" }),
        headers: withCookie(userId),
      });
      const created = (await createRes.json()) as Record<string, unknown>;

      const res = await api(`/api/todos/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: true }),
        headers: withCookie(userId),
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
        headers: withCookie(userId),
      });
      expect(res.status).toBe(404);
    });

    it("DELETE /api/todos/:id removes a todo", async () => {
      const createRes = await api("/api/todos", {
        method: "POST",
        body: JSON.stringify({ title: "Delete me" }),
        headers: withCookie(userId),
      });
      const created = (await createRes.json()) as Record<string, unknown>;

      const res = await api(`/api/todos/${created.id}`, {
        method: "DELETE",
        headers: withCookie(userId),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.id).toBe(created.id);
    });

    // ── Places ────────────────────────────────────────────────────────────────

    it("GET /api/places/:id returns a place with correct shape", async () => {
      const createRes = await api("/api/places", {
        method: "POST",
        body: JSON.stringify({ name: "Contract test place" }),
        headers: withCookie(userId),
      });
      expect(createRes.status).toBe(200);
      const created = (await createRes.json()) as Record<string, unknown>;

      const res = await api(`/api/places/${created.id}`, { headers: withCookie(userId) });
      expect(res.status).toBe(200);
      const place = (await res.json()) as Record<string, unknown>;

      expect(typeof place.id).toBe("string");
      expect(place.name).toBe("Contract test place");
      expect(typeof place.createdAt).toBe("string");
      expect(typeof place.updatedAt).toBe("string");
      expect(Array.isArray(place.children)).toBe(true);
    });

    it("DELETE /api/places/:id removes a place", async () => {
      const createRes = await api("/api/places", {
        method: "POST",
        body: JSON.stringify({ name: "Delete me place" }),
        headers: withCookie(userId),
      });
      const created = (await createRes.json()) as Record<string, unknown>;

      const res = await api(`/api/places/${created.id}`, {
        method: "DELETE",
        headers: withCookie(userId),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.id).toBe(created.id);
    });

    // ── Preferences ───────────────────────────────────────────────────────────

    it("GET /api/preferences returns preferences with correct shape", async () => {
      const res = await api("/api/preferences", { headers: withCookie(userId) });
      expect(res.status).toBe(200);
      const prefs = (await res.json()) as Record<string, unknown>;

      expect(typeof prefs.clientStorageEnabled).toBe("boolean");
      expect(typeof prefs.serverStorageEnabled).toBe("boolean");
      expect(typeof prefs.createdAt).toBe("string");
      expect(typeof prefs.updatedAt).toBe("string");
    });

    it("PATCH /api/preferences updates preferences", async () => {
      const res = await api("/api/preferences", {
        method: "PATCH",
        body: JSON.stringify({ clientStorageEnabled: false }),
        headers: withCookie(userId),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;

      expect(body.clientStorageEnabled).toBe(false);
      expect(typeof body.serverStorageEnabled).toBe("boolean");
      expect(typeof body.createdAt).toBe("string");
      expect(typeof body.updatedAt).toBe("string");
    });
  });
});

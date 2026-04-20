import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startServer, stopServer, api } from "./helper";

function extractSessionId(setCookieHeader: string): string {
  const match = setCookieHeader.match(/todo-session=([^;]+)/);
  return match ? match[1] : "";
}

function withCookie(sessionId: string, headers?: Record<string, string>): Record<string, string> {
  return {
    ...headers,
    Cookie: sessionId ? `todo-session=${sessionId}` : "",
  };
}

describe("todos API", () => {
  let sessionId = "";

  beforeAll(async () => {
    await startServer();

    // Create a session for tests
    const res = await api("/api/session", { method: "POST" });
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      sessionId = extractSessionId(setCookie);
    }
  });

  afterAll(async () => {
    await stopServer();
  });

  it("GET /api/todos returns empty list initially", async () => {
    const res = await api("/api/todos", { headers: withCookie(sessionId) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("POST /api/todos creates a todo", async () => {
    const res = await api("/api/todos", {
      method: "POST",
      headers: withCookie(sessionId),
      body: JSON.stringify({ title: "Test todo" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      id: expect.any(String),
      title: "Test todo",
      completed: false,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("POST /api/todos rejects missing title", async () => {
    const res = await api("/api/todos", {
      method: "POST",
      headers: withCookie(sessionId),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("GET /api/todos/:id returns a todo", async () => {
    // Create a todo first
    const createRes = await api("/api/todos", {
      method: "POST",
      headers: withCookie(sessionId),
      body: JSON.stringify({ title: "Get test" }),
    });
    const created = await createRes.json() as { id: string };

    const getRes = await api(`/api/todos/${created.id}`, {
      headers: withCookie(sessionId),
    });
    expect(getRes.status).toBe(200);
    const todo = await getRes.json();
    expect(todo.id).toBe(created.id);
    expect(todo.title).toBe("Get test");
  });

  it("GET /api/todos/:id returns 404 for unknown id", async () => {
    const res = await api("/api/todos/nonexistent-id", {
      headers: withCookie(sessionId),
    });
    expect(res.status).toBe(404);
  });

  it("PATCH /api/todos/:id updates a todo", async () => {
    const createRes = await api("/api/todos", {
      method: "POST",
      headers: withCookie(sessionId),
      body: JSON.stringify({ title: "Patch me" }),
    });
    const created = await createRes.json() as { id: string };

    const patchRes = await api(`/api/todos/${created.id}`, {
      method: "PATCH",
      headers: withCookie(sessionId),
      body: JSON.stringify({ completed: true }),
    });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.completed).toBe(true);
    expect(updated.title).toBe("Patch me");
  });

  it("PATCH /api/todos/:id trims title whitespace in DB", async () => {
    const createRes = await api("/api/todos", {
      method: "POST",
      headers: withCookie(sessionId),
      body: JSON.stringify({ title: "Spaces" }),
    });
    const created = await createRes.json() as { id: string };

    await api(`/api/todos/${created.id}`, {
      method: "PATCH",
      headers: withCookie(sessionId),
      body: JSON.stringify({ title: "  trimmed  " }),
    });

    // Fetch to verify DB value is trimmed
    const getRes = await api(`/api/todos/${created.id}`, {
      headers: withCookie(sessionId),
    });
    expect(getRes.status).toBe(200);
    const todo = await getRes.json();
    expect(todo.title).toBe("trimmed");
  });

  it("DELETE /api/todos/:id removes a todo", async () => {
    const createRes = await api("/api/todos", {
      method: "POST",
      headers: withCookie(sessionId),
      body: JSON.stringify({ title: "Delete me" }),
    });
    const created = await createRes.json() as { id: string };

    const delRes = await api(`/api/todos/${created.id}`, {
      method: "DELETE",
      headers: withCookie(sessionId),
    });
    expect(delRes.status).toBe(200);
    const body = await delRes.json();
    expect(body.id).toBe(created.id);

    // Verify it's gone
    const getRes = await api(`/api/todos/${created.id}`, {
      headers: withCookie(sessionId),
    });
    expect(getRes.status).toBe(404);
  });

  it("PATCH /api/todos/:id returns 404 for unknown id", async () => {
    const res = await api("/api/todos/nonexistent-id", {
      method: "PATCH",
      headers: withCookie(sessionId),
      body: JSON.stringify({ title: "nope" }),
    });
    expect(res.status).toBe(404);
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startServer, stopServer, api } from "./helper";

describe("todos API", () => {
  beforeAll(async () => {
    await startServer();
  });

  afterAll(async () => {
    await stopServer();
  });

  it("GET /api/todos returns empty list initially", async () => {
    const res = await api("/api/todos");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("POST /api/todos creates a todo", async () => {
    const res = await api("/api/todos", {
      method: "POST",
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
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("GET /api/todos/:id returns a todo", async () => {
    // Create a todo first
    const createRes = await api("/api/todos", {
      method: "POST",
      body: JSON.stringify({ title: "Get test" }),
    });
    const created = await createRes.json() as { id: string };

    const getRes = await api(`/api/todos/${created.id}`);
    expect(getRes.status).toBe(200);
    const todo = await getRes.json();
    expect(todo.id).toBe(created.id);
    expect(todo.title).toBe("Get test");
  });

  it("GET /api/todos/:id returns 404 for unknown id", async () => {
    const res = await api("/api/todos/nonexistent-id");
    expect(res.status).toBe(404);
  });

  it("PATCH /api/todos/:id updates a todo", async () => {
    const createRes = await api("/api/todos", {
      method: "POST",
      body: JSON.stringify({ title: "Patch me" }),
    });
    const created = await createRes.json() as { id: string };

    const patchRes = await api(`/api/todos/${created.id}`, {
      method: "PATCH",
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
      body: JSON.stringify({ title: "Spaces" }),
    });
    const created = await createRes.json() as { id: string };

    await api(`/api/todos/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: "  trimmed  " }),
    });

    // Fetch to verify DB value is trimmed
    const getRes = await api(`/api/todos/${created.id}`);
    expect(getRes.status).toBe(200);
    const todo = await getRes.json();
    expect(todo.title).toBe("trimmed");
  });

  it("DELETE /api/todos/:id removes a todo", async () => {
    const createRes = await api("/api/todos", {
      method: "POST",
      body: JSON.stringify({ title: "Delete me" }),
    });
    const created = await createRes.json() as { id: string };

    const delRes = await api(`/api/todos/${created.id}`, {
      method: "DELETE",
    });
    expect(delRes.status).toBe(200);
    const body = await delRes.json();
    expect(body.id).toBe(created.id);

    // Verify it's gone
    const getRes = await api(`/api/todos/${created.id}`);
    expect(getRes.status).toBe(404);
  });

  it("PATCH /api/todos/:id returns 404 for unknown id", async () => {
    const res = await api("/api/todos/nonexistent-id", {
      method: "PATCH",
      body: JSON.stringify({ title: "nope" }),
    });
    expect(res.status).toBe(404);
  });
});

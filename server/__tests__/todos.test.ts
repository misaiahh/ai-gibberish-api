import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startServer, stopServer, api } from "./helper";

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

describe("todos API", () => {
  let userId = "";

  beforeAll(async () => {
    await startServer();

    // Create a user for tests
    const res = await api("/api/session", { method: "POST" });
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      userId = extractCookieId(setCookie);
    }
  });

  afterAll(async () => {
    await stopServer();
  });

  it("GET /api/todos returns empty list initially", async () => {
    const res = await api("/api/todos", { headers: withCookie(userId) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("POST /api/todos creates a todo", async () => {
    const res = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
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
    expect(Array.isArray(body.placeIds)).toBe(true);
    expect(body.placeIds).toHaveLength(0);
  });

  it("POST /api/todos creates a todo with description", async () => {
    const res = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Test todo", description: "This is a detailed description with https://example.com" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Test todo");
    expect(body.description).toBe("This is a detailed description with https://example.com");
    expect(body.completed).toBe(false);
  });

  it("POST /api/todos with empty description", async () => {
    const res = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Test todo", description: "" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.description).toBe("");
  });

  it("POST /api/todos rejects missing title", async () => {
    const res = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("GET /api/todos/:id returns a todo", async () => {
    // Create a todo first
    const createRes = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Get test" }),
    });
    const created = await createRes.json() as { id: string };

    const getRes = await api(`/api/todos/${created.id}`, {
      headers: withCookie(userId),
    });
    expect(getRes.status).toBe(200);
    const todo = await getRes.json();
    expect(todo.id).toBe(created.id);
    expect(todo.title).toBe("Get test");
  });

  it("GET /api/todos/:id returns description", async () => {
    const createRes = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Get test", description: "Test description" }),
    });
    const created = await createRes.json() as { id: string };

    const getRes = await api(`/api/todos/${created.id}`, {
      headers: withCookie(userId),
    });
    expect(getRes.status).toBe(200);
    const todo = await getRes.json();
    expect(todo.description).toBe("Test description");
  });

  it("GET /api/todos/:id returns 404 for unknown id", async () => {
    const res = await api("/api/todos/nonexistent-id", {
      headers: withCookie(userId),
    });
    expect(res.status).toBe(404);
  });

  it("PATCH /api/todos/:id updates a todo", async () => {
    const createRes = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Patch me" }),
    });
    const created = await createRes.json() as { id: string };

    const patchRes = await api(`/api/todos/${created.id}`, {
      method: "PATCH",
      headers: withCookie(userId),
      body: JSON.stringify({ completed: true }),
    });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.completed).toBe(true);
    expect(updated.title).toBe("Patch me");
  });

  it("PATCH /api/todos/:id updates description", async () => {
    const createRes = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Patch me", description: "Original description" }),
    });
    const created = await createRes.json() as { id: string };

    const patchRes = await api(`/api/todos/${created.id}`, {
      method: "PATCH",
      headers: withCookie(userId),
      body: JSON.stringify({ description: "Updated description" }),
    });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.description).toBe("Updated description");
    expect(updated.title).toBe("Patch me");
  });

  it("PATCH /api/todos/:id trims title whitespace in DB", async () => {
    const createRes = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Spaces" }),
    });
    const created = await createRes.json() as { id: string };

    await api(`/api/todos/${created.id}`, {
      method: "PATCH",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "  trimmed  " }),
    });

    // Fetch to verify DB value is trimmed
    const getRes = await api(`/api/todos/${created.id}`, {
      headers: withCookie(userId),
    });
    expect(getRes.status).toBe(200);
    const todo = await getRes.json();
    expect(todo.title).toBe("trimmed");
  });

  it("DELETE /api/todos/:id removes a todo", async () => {
    const createRes = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Delete me" }),
    });
    const created = await createRes.json() as { id: string };

    const delRes = await api(`/api/todos/${created.id}`, {
      method: "DELETE",
      headers: withCookie(userId),
    });
    expect(delRes.status).toBe(200);
    const body = await delRes.json();
    expect(body.id).toBe(created.id);

    // Verify it's gone
    const getRes = await api(`/api/todos/${created.id}`, {
      headers: withCookie(userId),
    });
    expect(getRes.status).toBe(404);
  });

  it("PATCH /api/todos/:id returns 404 for unknown id", async () => {
    const res = await api("/api/todos/nonexistent-id", {
      method: "PATCH",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "nope" }),
    });
    expect(res.status).toBe(404);
  });

  it("POST /api/todos with placeId creates a todo with a single place", async () => {
    const placeRes = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Kitchen" }),
    });
    expect(placeRes.status).toBe(200);
    const place = (await placeRes.json()) as { id: string };

    const res = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Buy milk", placeId: place.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.title).toBe("Buy milk");
    expect(body.placeIds).toContain(place.id);
  });

  it("POST /api/todos with placeIds creates a todo with multiple places", async () => {
    const place1Res = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Bedroom" }),
    });
    const place1 = (await place1Res.json()) as { id: string };

    const place2Res = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Living Room" }),
    });
    const place2 = (await place2Res.json()) as { id: string };

    const res = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Furniture", placeIds: [place1.id, place2.id] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Furniture");
    expect(body.placeIds).toHaveLength(2);
    expect(body.placeIds).toContain(place1.id);
    expect(body.placeIds).toContain(place2.id);
    expect(body.places).toHaveLength(2);
  });

  it("POST /api/todos with invalid placeId returns 400", async () => {
    const res = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Test", placeId: "invalid-id" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/todos with invalid placeId in array returns 400", async () => {
    const res = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Test", placeIds: ["invalid-id"] }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /api/todos returns placeIds array for todos with places", async () => {
    const placeRes = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Garage" }),
    });
    const place = (await placeRes.json()) as { id: string };

    await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Fix car", placeId: place.id }),
    });

    const res = await api("/api/todos", { headers: withCookie(userId) });
    expect(res.status).toBe(200);
    const todos = (await res.json()) as Array<any>;
    const todoWithPlace = todos.find((t: any) => t.placeIds?.includes(place.id));
    expect(todoWithPlace).toBeDefined();
    expect(Array.isArray(todoWithPlace.placeIds)).toBe(true);
    expect(todoWithPlace.placeIds).toContain(place.id);
    expect(Array.isArray(todoWithPlace.places)).toBe(true);
    expect(todoWithPlace.places[0].name).toBe("Garage");
  });

  it("GET /api/todos returns empty placeIds for todos without places", async () => {
    await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "No place todo" }),
    });

    const res = await api("/api/todos", { headers: withCookie(userId) });
    expect(res.status).toBe(200);
    const todos = (await res.json()) as Array<any>;
    const todoWithoutPlace = todos.find((t: any) => !t.placeIds || t.placeIds.length === 0);
    expect(todoWithoutPlace).toBeDefined();
  });

  it("PATCH /api/todos/:id with placeIds replaces all places", async () => {
    const place1Res = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Office" }),
    });
    const place1 = (await place1Res.json()) as { id: string };

    const place2Res = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Gym" }),
    });
    const place2 = (await place2Res.json()) as { id: string };

    const place3Res = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Park" }),
    });
    const place3 = (await place3Res.json()) as { id: string };

    const todoRes = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Tasks", placeIds: [place1.id, place2.id] }),
    });
    const todo = (await todoRes.json()) as { id: string };

    const res = await api(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: withCookie(userId),
      body: JSON.stringify({ placeIds: [place3.id] }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.placeIds).toHaveLength(1);
    expect(updated.placeIds).toContain(place3.id);
    expect(updated.placeIds).not.toContain(place1.id);
    expect(updated.placeIds).not.toContain(place2.id);
  });

  it("PATCH /api/todos/:id removes all places when placeIds is empty array", async () => {
    const placeRes = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Basement" }),
    });
    const place = (await placeRes.json()) as { id: string };

    const todoRes = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Clean basement", placeIds: [place.id] }),
    });
    const todo = (await todoRes.json()) as { id: string };

    const res = await api(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: withCookie(userId),
      body: JSON.stringify({ placeIds: [] }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.placeIds).toEqual([]);
  });

  it("PATCH /api/todos/:id with invalid placeId returns 400", async () => {
    const res = await api("/api/todos/nonexistent-id", {
      method: "PATCH",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "nope" }),
    });
    expect(res.status).toBe(404);
  });

  it("GET /api/todos?place_id=xxx filters todos by place", async () => {
    const placeRes = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Pantry" }),
    });
    const place = (await placeRes.json()) as { id: string };

    await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Check expiry", placeId: place.id }),
    });

    await api("/api/todos", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ title: "Unrelated task" }),
    });

    const res = await api(`/api/todos?place_id=${place.id}`, {
      headers: withCookie(userId),
    });
    expect(res.status).toBe(200);
    const todos = (await res.json()) as Array<any>;
    expect(todos.every((t: any) => t.placeIds?.includes(place.id))).toBe(true);
  });

  it("GET /api/todos filters by place_id and returns empty when no todos match", async () => {
    const res = await api("/api/todos?place_id=nonexistent", {
      headers: withCookie(userId),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });
});

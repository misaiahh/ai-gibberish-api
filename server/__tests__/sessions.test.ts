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

describe("session API", () => {
  beforeAll(async () => {
    await startServer();
  });

  afterAll(async () => {
    await stopServer();
  });

  it("GET /api/session returns user when one exists", async () => {
    // Create a user first via POST
    const postRes = await api("/api/session", {
      method: "POST",
    });
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json();
    expect(postBody).toMatchObject({ userId: expect.any(String) });

    // GET should return the same user
    const userId = (postBody as { userId: string }).userId;
    const getRes = await api("/api/session", {
      headers: withCookie(userId),
    });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody).toEqual({ userId });
  });

  it("POST /api/session creates a new user and sets cookie", async () => {
    const res = await api("/api/session", {
      method: "POST",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ userId: expect.any(String) });

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie!).toContain("todo-session=");
    expect(setCookie!).toContain("HttpOnly");
    expect(setCookie!).toContain("SameSite=Lax");
  });

  it("DELETE /api/session clears the user", async () => {
    // Create user
    const postRes = await api("/api/session", {
      method: "POST",
    });
    const userId = extractCookieId(postRes.headers.get("set-cookie")!);

    // Delete
    const delRes = await api("/api/session", {
      method: "DELETE",
      headers: withCookie(userId),
    });
    expect(delRes.status).toBe(200);
    const body = await delRes.json();
    expect(body).toEqual({ cleared: true });

    // Cookie should be cleared
    const setCookie = delRes.headers.get("set-cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie!).toContain("todo-session=");
    expect(setCookie!).toContain("Max-Age=0");
  });

  it("GET /api/session creates a new user when none exists", async () => {
    const res = await api("/api/session", {
      headers: withCookie(""),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ userId: expect.any(String) });
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie!).toContain("todo-session=");
  });
});

describe("todo scoping by session", () => {
  let userA = "";
  let userB = "";

  beforeAll(async () => {
    await startServer();

    // Create user A
    const resA = await api("/api/session", { method: "POST" });
    expect(resA.status).toBe(200);
    userA = extractCookieId(resA.headers.get("set-cookie")!);

    // Create user B
    const resB = await api("/api/session", { method: "POST" });
    expect(resB.status).toBe(200);
    userB = extractCookieId(resB.headers.get("set-cookie")!);
  });

  afterAll(async () => {
    await stopServer();
  });

  it("todos are scoped per user — user A cannot see user B's todos", async () => {
    // Create a todo as user A
    const postA = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userA),
      body: JSON.stringify({ title: "User A todo" }),
    });
    expect(postA.status).toBe(200);

    // Create a todo as user B
    const postB = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userB),
      body: JSON.stringify({ title: "User B todo" }),
    });
    expect(postB.status).toBe(200);

    // User A should only see their own todo
    const listA = await api("/api/todos", { headers: withCookie(userA) });
    expect(listA.status).toBe(200);
    const todosA = (await listA.json()) as Array<{ title: string }>;
    expect(todosA).toHaveLength(1);
    expect(todosA[0].title).toBe("User A todo");

    // User B should only see their own todo
    const listB = await api("/api/todos", { headers: withCookie(userB) });
    expect(listB.status).toBe(200);
    const todosB = (await listB.json()) as Array<{ title: string }>;
    expect(todosB).toHaveLength(1);
    expect(todosB[0].title).toBe("User B todo");
  });

  it("GET /api/todos/:id returns 404 when todo belongs to different user", async () => {
    // Create todo as user A
    const postA = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userA),
      body: JSON.stringify({ title: "A's private todo" }),
    });
    const createdA = (await postA.json()) as { id: string };

    // Try to fetch as user B
    const getB = await api(`/api/todos/${createdA.id}`, {
      headers: withCookie(userB),
    });
    expect(getB.status).toBe(404);
  });

  it("PATCH on another user's todo returns 404", async () => {
    const postA = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userA),
      body: JSON.stringify({ title: "A's todo to patch" }),
    });
    const createdA = (await postA.json()) as { id: string };

    const patchB = await api(`/api/todos/${createdA.id}`, {
      method: "PATCH",
      headers: withCookie(userB),
      body: JSON.stringify({ completed: true }),
    });
    expect(patchB.status).toBe(404);
  });

  it("DELETE on another user's todo returns 404", async () => {
    const postA = await api("/api/todos", {
      method: "POST",
      headers: withCookie(userA),
      body: JSON.stringify({ title: "A's todo to delete" }),
    });
    const createdA = (await postA.json()) as { id: string };

    const deleteB = await api(`/api/todos/${createdA.id}`, {
      method: "DELETE",
      headers: withCookie(userB),
    });
    expect(deleteB.status).toBe(404);
  });
});

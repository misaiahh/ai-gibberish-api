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

describe("session API", () => {
  beforeAll(async () => {
    await startServer();
  });

  afterAll(async () => {
    await stopServer();
  });

  it("GET /api/session returns session when one exists", async () => {
    // Create a session first via POST
    const postRes = await api("/api/session", {
      method: "POST",
    });
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json();
    expect(postBody).toMatchObject({ sessionId: expect.any(String) });

    // GET should return the same session
    const sessionId = (postBody as { sessionId: string }).sessionId;
    const getRes = await api("/api/session", {
      headers: withCookie(sessionId),
    });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody).toEqual({ sessionId });
  });

  it("POST /api/session creates a new session and sets cookie", async () => {
    const res = await api("/api/session", {
      method: "POST",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ sessionId: expect.any(String) });

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie!).toContain("todo-session=");
    expect(setCookie!).toContain("HttpOnly");
    expect(setCookie!).toContain("SameSite=Lax");
  });

  it("DELETE /api/session clears the session", async () => {
    // Create session
    const postRes = await api("/api/session", {
      method: "POST",
    });
    const sessionId = extractSessionId(postRes.headers.get("set-cookie")!);

    // Delete
    const delRes = await api("/api/session", {
      method: "DELETE",
      headers: withCookie(sessionId),
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

  it("GET /api/session creates a new session when none exists", async () => {
    const res = await api("/api/session", {
      headers: withCookie(""),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ sessionId: expect.any(String) });
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie!).toContain("todo-session=");
  });
});

describe("todo scoping by session", () => {
  let sessionA = "";
  let sessionB = "";

  beforeAll(async () => {
    await startServer();

    // Create session A
    const resA = await api("/api/session", { method: "POST" });
    expect(resA.status).toBe(200);
    sessionA = extractSessionId(resA.headers.get("set-cookie")!);

    // Create session B
    const resB = await api("/api/session", { method: "POST" });
    expect(resB.status).toBe(200);
    sessionB = extractSessionId(resB.headers.get("set-cookie")!);
  });

  afterAll(async () => {
    await stopServer();
  });

  it("todos are scoped per session — session A cannot see session B's todos", async () => {
    // Create a todo as session A
    const postA = await api("/api/todos", {
      method: "POST",
      headers: withCookie(sessionA),
      body: JSON.stringify({ title: "Session A todo" }),
    });
    expect(postA.status).toBe(200);

    // Create a todo as session B
    const postB = await api("/api/todos", {
      method: "POST",
      headers: withCookie(sessionB),
      body: JSON.stringify({ title: "Session B todo" }),
    });
    expect(postB.status).toBe(200);

    // Session A should only see their own todo
    const listA = await api("/api/todos", { headers: withCookie(sessionA) });
    expect(listA.status).toBe(200);
    const todosA = (await listA.json()) as Array<{ title: string }>;
    expect(todosA).toHaveLength(1);
    expect(todosA[0].title).toBe("Session A todo");

    // Session B should only see their own todo
    const listB = await api("/api/todos", { headers: withCookie(sessionB) });
    expect(listB.status).toBe(200);
    const todosB = (await listB.json()) as Array<{ title: string }>;
    expect(todosB).toHaveLength(1);
    expect(todosB[0].title).toBe("Session B todo");
  });

  it("GET /api/todos/:id returns 404 when todo belongs to different session", async () => {
    // Create todo as session A
    const postA = await api("/api/todos", {
      method: "POST",
      headers: withCookie(sessionA),
      body: JSON.stringify({ title: "A's private todo" }),
    });
    const createdA = (await postA.json()) as { id: string };

    // Try to fetch as session B
    const getB = await api(`/api/todos/${createdA.id}`, {
      headers: withCookie(sessionB),
    });
    expect(getB.status).toBe(404);
  });

  it("PATCH on another session's todo returns 404", async () => {
    const postA = await api("/api/todos", {
      method: "POST",
      headers: withCookie(sessionA),
      body: JSON.stringify({ title: "A's todo to patch" }),
    });
    const createdA = (await postA.json()) as { id: string };

    const patchB = await api(`/api/todos/${createdA.id}`, {
      method: "PATCH",
      headers: withCookie(sessionB),
      body: JSON.stringify({ completed: true }),
    });
    expect(patchB.status).toBe(404);
  });

  it("DELETE on another session's todo returns 404", async () => {
    const postA = await api("/api/todos", {
      method: "POST",
      headers: withCookie(sessionA),
      body: JSON.stringify({ title: "A's todo to delete" }),
    });
    const createdA = (await postA.json()) as { id: string };

    const deleteB = await api(`/api/todos/${createdA.id}`, {
      method: "DELETE",
      headers: withCookie(sessionB),
    });
    expect(deleteB.status).toBe(404);
  });
});

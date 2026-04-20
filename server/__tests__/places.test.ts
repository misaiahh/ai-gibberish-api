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

describe("places API", () => {
  let userId = "";

  beforeAll(async () => {
    await startServer();

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

  it("GET /api/places returns empty list initially", async () => {
    const res = await api("/api/places", { headers: withCookie(userId) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("POST /api/places creates a root place", async () => {
    const res = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Home" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      id: expect.any(String),
      name: "Home",
      parentId: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("POST /api/places creates a sub-place with parentId", async () => {
    const parentRes = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Work" }),
    });
    const parent = await parentRes.json() as { id: string };

    const res = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Backyard", parentId: parent.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      id: expect.any(String),
      name: "Backyard",
      parentId: parent.id,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("POST /api/places rejects missing name", async () => {
    const res = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/places rejects empty name", async () => {
    const res = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "   " }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/places rejects invalid parentId", async () => {
    const res = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Sub", parentId: "nonexistent" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/places trims name whitespace", async () => {
    const res = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "  Office  " }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Office");
  });

  it("GET /api/places lists all places", async () => {
    const res = await api("/api/places", { headers: withCookie(userId) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(3);
  });

  it("GET /api/places/:id returns a place with children", async () => {
    const parentRes = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Garage" }),
    });
    const parent = await parentRes.json() as { id: string };

    await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Tool Shed", parentId: parent.id }),
    });

    const res = await api(`/api/places/${parent.id}`, {
      headers: withCookie(userId),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(parent.id);
    expect(body.name).toBe("Garage");
    expect(body.parentId).toBeNull();
    expect(Array.isArray(body.children)).toBe(true);
    expect(body.children).toHaveLength(1);
    expect(body.children[0].name).toBe("Tool Shed");
  });

  it("GET /api/places/:id returns 404 for unknown id", async () => {
    const res = await api("/api/places/nonexistent-id", {
      headers: withCookie(userId),
    });
    expect(res.status).toBe(404);
  });

  it("PATCH /api/places/:id updates a place name", async () => {
    const createRes = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Rename Me" }),
    });
    const created = await createRes.json() as { id: string };

    const patchRes = await api(`/api/places/${created.id}`, {
      method: "PATCH",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Renamed" }),
    });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.name).toBe("Renamed");
    expect(updated.id).toBe(created.id);
  });

  it("PATCH /api/places/:id updates parentId", async () => {
    const parentRes = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Parent Place" }),
    });
    const parent = await parentRes.json() as { id: string };

    const childRes = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Child Place" }),
    });
    const child = await childRes.json() as { id: string };

    const patchRes = await api(`/api/places/${child.id}`, {
      method: "PATCH",
      headers: withCookie(userId),
      body: JSON.stringify({ parentId: parent.id }),
    });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.parentId).toBe(parent.id);
  });

  it("PATCH /api/places/:id sets parentId to null", async () => {
    const parentRes = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Parent For Unlink" }),
    });
    const parent = await parentRes.json() as { id: string };

    const childRes = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Child For Unlink", parentId: parent.id }),
    });
    const child = await childRes.json() as { id: string };

    const patchRes = await api(`/api/places/${child.id}`, {
      method: "PATCH",
      headers: withCookie(userId),
      body: JSON.stringify({ parentId: null }),
    });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.parentId).toBeNull();
  });

  it("PATCH /api/places/:id rejects invalid parentId", async () => {
    const createRes = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Invalid Parent" }),
    });
    const created = await createRes.json() as { id: string };

    const res = await api(`/api/places/${created.id}`, {
      method: "PATCH",
      headers: withCookie(userId),
      body: JSON.stringify({ parentId: "nonexistent" }),
    });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/places/:id rejects place as its own parent", async () => {
    const createRes = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Self Parent" }),
    });
    const created = await createRes.json() as { id: string };

    const res = await api(`/api/places/${created.id}`, {
      method: "PATCH",
      headers: withCookie(userId),
      body: JSON.stringify({ parentId: created.id }),
    });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/places/:id rejects circular parent reference", async () => {
    const res1 = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Level A" }),
    });
    const a = await res1.json() as { id: string };

    const res2 = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Level B", parentId: a.id }),
    });
    const b = await res2.json() as { id: string };

    // Try to make A a child of B (would create circular reference: A -> B -> A)
    const res3 = await api(`/api/places/${a.id}`, {
      method: "PATCH",
      headers: withCookie(userId),
      body: JSON.stringify({ parentId: b.id }),
    });
    expect(res3.status).toBe(400);
  });

  it("PATCH /api/places/:id returns 404 for unknown id", async () => {
    const res = await api("/api/places/nonexistent-id", {
      method: "PATCH",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "nope" }),
    });
    expect(res.status).toBe(404);
  });

  it("PATCH /api/places/:id returns 400 for empty name", async () => {
    const createRes = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Empty Name Test" }),
    });
    const created = await createRes.json() as { id: string };

    const res = await api(`/api/places/${created.id}`, {
      method: "PATCH",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("DELETE /api/places/:id removes a place", async () => {
    const createRes = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Delete Me" }),
    });
    const created = await createRes.json() as { id: string };

    const delRes = await api(`/api/places/${created.id}`, {
      method: "DELETE",
      headers: withCookie(userId),
    });
    expect(delRes.status).toBe(200);
    const body = await delRes.json();
    expect(body.id).toBe(created.id);

    // Verify it's gone
    const getRes = await api(`/api/places/${created.id}`, {
      headers: withCookie(userId),
    });
    expect(getRes.status).toBe(404);
  });

  it("DELETE /api/places/:id deletes all sub-places too", async () => {
    const parentRes = await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Delete Parent" }),
    });
    const parent = await parentRes.json() as { id: string };

    await api("/api/places", {
      method: "POST",
      headers: withCookie(userId),
      body: JSON.stringify({ name: "Sub Child", parentId: parent.id }),
    });

    const delRes = await api(`/api/places/${parent.id}`, {
      method: "DELETE",
      headers: withCookie(userId),
    });
    expect(delRes.status).toBe(200);

    // Verify both parent and child are gone
    const parentGet = await api(`/api/places/${parent.id}`, {
      headers: withCookie(userId),
    });
    expect(parentGet.status).toBe(404);
  });

  it("DELETE /api/places/:id returns 404 for unknown id", async () => {
    const res = await api("/api/places/nonexistent-id", {
      method: "DELETE",
      headers: withCookie(userId),
    });
    expect(res.status).toBe(404);
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";

function createTestDb() {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  return db;
}

describe("SQLite todos schema", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it("inserts and retrieves a todo", () => {
    const id = "test-1";
    const now = new Date().toISOString();

    db.prepare(
      "INSERT INTO todos (id, title, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run(id, "Buy groceries", 0, now, now);

    const todo = db.prepare("SELECT * FROM todos WHERE id = ?").get(id) as Record<string, string | number>;

    expect(todo).toBeDefined();
    expect(todo.id).toBe(id);
    expect(todo.title).toBe("Buy groceries");
    expect(todo.completed).toBe(0);
  });

  it("returns all todos ordered by created_at desc", () => {
    const now = new Date().toISOString();
    db.prepare("INSERT INTO todos (id, title, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run("1", "First", 0, "2025-01-01T00:00:00.000Z", "2025-01-01T00:00:00.000Z");
    db.prepare("INSERT INTO todos (id, title, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run("2", "Second", 0, "2025-01-02T00:00:00.000Z", "2025-01-02T00:00:00.000Z");

    const rows = db.prepare("SELECT * FROM todos ORDER BY created_at DESC").all() as Array<{ id: string }>;

    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe("2");
    expect(rows[1].id).toBe("1");
  });

  it("updates a todo", () => {
    const now = new Date().toISOString();
    const later = new Date(Date.now() + 1000).toISOString();

    db.prepare(
      "INSERT INTO todos (id, title, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run("1", "Old title", 0, now, now);

    db.prepare("UPDATE todos SET title = ?, completed = ?, updated_at = ? WHERE id = ?")
      .run("New title", 1, later, "1");

    const todo = db.prepare("SELECT * FROM todos WHERE id = ?").get("1") as Record<string, string | number>;

    expect(todo.title).toBe("New title");
    expect(todo.completed).toBe(1);
    expect(todo.updated_at).toBe(later);
  });

  it("deletes a todo", () => {
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO todos (id, title, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run("1", "To delete", 0, now, now);

    const result = db.prepare("DELETE FROM todos WHERE id = ?").run("1");

    expect(result.changes).toBe(1);
    expect(db.prepare("SELECT * FROM todos WHERE id = ?").get("1")).toBeUndefined();
  });
});

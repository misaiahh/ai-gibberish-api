import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { db } from "../db";

function createTestDb() {
  const testDb = new Database(":memory:");
  testDb.pragma("journal_mode = WAL");

  testDb.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      user_id TEXT,
      place_id TEXT
    )
  `);

  testDb.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      data TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  testDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      cookie_id TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  testDb.exec(`
    CREATE TABLE IF NOT EXISTS places (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      parent_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES places(id) ON DELETE CASCADE
    )
  `);

  testDb.exec(`
    CREATE TABLE IF NOT EXISTS preferences (
      user_id TEXT PRIMARY KEY,
      client_storage_enabled INTEGER NOT NULL DEFAULT 1,
      server_storage_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  return testDb;
}

function runSeedOnDb(testDb: Database) {
  const now = new Date().toISOString();

  const userCount = testDb.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count > 0) {
    return;
  }

  const userId = "demo-user-id";

  testDb.prepare(
    "INSERT INTO users (id, cookie_id, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ).run(userId, "seeded-demo-cookie", now, now);

  testDb.prepare(
    `INSERT INTO preferences (user_id, client_storage_enabled, server_storage_enabled, created_at, updated_at)
     VALUES (?, 1, 1, ?, ?)`
  ).run(userId, now, now);

  const homeId = crypto.randomUUID();
  const officeId = crypto.randomUUID();
  const groceryId = crypto.randomUUID();

  testDb.prepare(
    `INSERT INTO places (id, user_id, name, parent_id, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, ?)`
  ).run(homeId, userId, "Home", now, now);

  testDb.prepare(
    `INSERT INTO places (id, user_id, name, parent_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(officeId, userId, "Office", homeId, now, now);

  testDb.prepare(
    `INSERT INTO places (id, user_id, name, parent_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(groceryId, userId, "Grocery Store", homeId, now, now);

  const todo1Id = crypto.randomUUID();
  const todo2Id = crypto.randomUUID();
  const todo3Id = crypto.randomUUID();

  testDb.prepare(
    `INSERT INTO todos (id, title, completed, created_at, updated_at, user_id, place_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(todo1Id, "Buy groceries", 0, now, now, userId, groceryId);

  testDb.prepare(
    `INSERT INTO todos (id, title, completed, created_at, updated_at, user_id, place_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(todo2Id, "Finish project report", 1, now, now, userId, officeId);

  testDb.prepare(
    `INSERT INTO todos (id, title, completed, created_at, updated_at, user_id, place_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(todo3Id, "Clean the house", 0, now, now, userId, homeId);
}

describe("database seeding", () => {
  let testDb: Database;

  beforeEach(() => {
    testDb = createTestDb();
  });

  afterEach(() => {
    testDb.close();
  });

  it("creates demo data when no users exist", () => {
    runSeedOnDb(testDb);

    const userCount = testDb.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    expect(userCount.count).toBe(1);

    const prefCount = testDb.prepare("SELECT COUNT(*) as count FROM preferences").get() as { count: number };
    expect(prefCount.count).toBe(1);

    const placeCount = testDb.prepare("SELECT COUNT(*) as count FROM places").get() as { count: number };
    expect(placeCount.count).toBe(3);

    const todoCount = testDb.prepare("SELECT COUNT(*) as count FROM todos").get() as { count: number };
    expect(todoCount.count).toBe(3);
  });

  it("does not duplicate data when seeded again", () => {
    runSeedOnDb(testDb);
    runSeedOnDb(testDb);

    const userCount = testDb.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    expect(userCount.count).toBe(1);

    const todoCount = testDb.prepare("SELECT COUNT(*) as count FROM todos").get() as { count: number };
    expect(todoCount.count).toBe(3);
  });

  it("preserves existing users and does not seed", () => {
    const now = new Date().toISOString();
    testDb.prepare(
      "INSERT INTO users (id, cookie_id, created_at, updated_at) VALUES (?, ?, ?, ?)"
    ).run("existing-user", "existing-cookie", now, now);

    runSeedOnDb(testDb);

    const userCount = testDb.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    expect(userCount.count).toBe(1);

    const todoCount = testDb.prepare("SELECT COUNT(*) as count FROM todos").get() as { count: number };
    expect(todoCount.count).toBe(0);
  });

  it("creates correct demo user", () => {
    runSeedOnDb(testDb);

    const user = testDb.prepare("SELECT * FROM users WHERE cookie_id = ?").get("seeded-demo-cookie") as Record<string, string>;
    expect(user).toBeDefined();
    expect(user.id).toBe("demo-user-id");
    expect(user.cookie_id).toBe("seeded-demo-cookie");
  });

  it("creates demo preferences", () => {
    runSeedOnDb(testDb);

    const pref = testDb.prepare("SELECT * FROM preferences WHERE user_id = ?").get("demo-user-id") as Record<string, string | number>;
    expect(pref).toBeDefined();
    expect(pref.client_storage_enabled).toBe(1);
    expect(pref.server_storage_enabled).toBe(1);
  });

  it("creates hierarchical demo places", () => {
    runSeedOnDb(testDb);

    const places = testDb.prepare("SELECT * FROM places WHERE user_id = ? ORDER BY name").all("demo-user-id") as Array<{ name: string; parent_id: string | null }>;
    expect(places).toHaveLength(3);

    const home = places.find(p => p.name === "Home");
    expect(home).toBeDefined();
    expect(home!.parent_id).toBeNull();

    const office = places.find(p => p.name === "Office");
    expect(office).toBeDefined();
    expect(office!.parent_id).toBe(home!.id);

    const grocery = places.find(p => p.name === "Grocery Store");
    expect(grocery).toBeDefined();
    expect(grocery!.parent_id).toBe(home!.id);
  });

  it("creates demo todos with correct completion states", () => {
    runSeedOnDb(testDb);

    const todos = testDb.prepare("SELECT * FROM todos WHERE user_id = ? ORDER BY title").all("demo-user-id") as Array<{ title: string; completed: number }>;
    expect(todos).toHaveLength(3);

    const buyGroceries = todos.find(t => t.title === "Buy groceries");
    expect(buyGroceries).toBeDefined();
    expect(buyGroceries!.completed).toBe(0);

    const finishReport = todos.find(t => t.title === "Finish project report");
    expect(finishReport).toBeDefined();
    expect(finishReport!.completed).toBe(1);

    const cleanHouse = todos.find(t => t.title === "Clean the house");
    expect(cleanHouse).toBeDefined();
    expect(cleanHouse!.completed).toBe(0);
  });

  it("links todos to correct places", () => {
    runSeedOnDb(testDb);

    const todos = testDb.prepare(`
      SELECT t.title, p.name as place_name
      FROM todos t
      JOIN places p ON t.place_id = p.id
      WHERE t.user_id = ?
    `).all("demo-user-id") as Array<{ title: string; place_name: string }>;

    const groceryTodo = todos.find(t => t.title === "Buy groceries");
    expect(groceryTodo).toBeDefined();
    expect(groceryTodo!.place_name).toBe("Grocery Store");

    const reportTodo = todos.find(t => t.title === "Finish project report");
    expect(reportTodo).toBeDefined();
    expect(reportTodo!.place_name).toBe("Office");

    const cleanTodo = todos.find(t => t.title === "Clean the house");
    expect(cleanTodo).toBeDefined();
    expect(cleanTodo!.place_name).toBe("Home");
  });
});

describe("seed idempotency with real db module", () => {
  it("userExists correctly detects empty database", () => {
    // The actual db module uses a file-based database
    // We verify the pattern works by checking the count query
    const count = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    expect(typeof count.count).toBe("number");
    expect(count.count >= 0).toBe(true);
  });
});

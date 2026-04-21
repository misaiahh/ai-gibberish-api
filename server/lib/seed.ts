import { db } from "../db";

const SEED_COOKIE_ID = "seeded-demo-cookie";

function userExists(): boolean {
  const count = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  return count.count > 0;
}

export function seedDatabase(): void {
  if (userExists()) {
    return;
  }

  const now = new Date().toISOString();
  const userId = "demo-user-id";

  // Create demo user
  db.prepare(
    "INSERT INTO users (id, cookie_id, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ).run(userId, SEED_COOKIE_ID, now, now);

  // Create demo preferences
  db.prepare(
    `INSERT INTO preferences (user_id, client_storage_enabled, server_storage_enabled, created_at, updated_at)
     VALUES (?, 1, 1, ?, ?)`
  ).run(userId, now, now);

  // Create demo places (hierarchical)
  const homeId = crypto.randomUUID();
  const officeId = crypto.randomUUID();
  const groceryId = crypto.randomUUID();

  db.prepare(
    `INSERT INTO places (id, user_id, name, parent_id, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, ?)`
  ).run(homeId, userId, "Home", now, now);

  db.prepare(
    `INSERT INTO places (id, user_id, name, parent_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(officeId, userId, "Office", homeId, now, now);

  db.prepare(
    `INSERT INTO places (id, user_id, name, parent_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(groceryId, userId, "Grocery Store", homeId, now, now);

  // Create demo todos
  const todo1Id = crypto.randomUUID();
  const todo2Id = crypto.randomUUID();
  const todo3Id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO todos (id, title, completed, created_at, updated_at, user_id, place_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(todo1Id, "Buy groceries", 0, now, now, userId, groceryId);

  db.prepare(
    `INSERT INTO todos (id, title, completed, created_at, updated_at, user_id, place_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(todo2Id, "Finish project report", 1, now, now, userId, officeId);

  db.prepare(
    `INSERT INTO todos (id, title, completed, created_at, updated_at, user_id, place_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(todo3Id, "Clean the house", 0, now, now, userId, homeId);
}

export { userExists };

import Database from "better-sqlite3";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const dbPath = join(process.cwd(), "data", "todo.db");

// Ensure data directory exists
mkdirSync(join(process.cwd(), "data"), { recursive: true });

const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma("journal_mode = WAL");

// Create todos table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    data TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    cookie_id TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

try {
  db.exec(`ALTER TABLE todos DROP COLUMN session_id`);
} catch {
  // Column doesn't exist
}

try {
  db.exec(`ALTER TABLE todos ADD COLUMN user_id TEXT`);
} catch {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE todos ADD COLUMN place_id TEXT`);
} catch {
  // Column already exists
}

try {
  db.exec(`ALTER TABLE todos ADD COLUMN description TEXT`);
} catch {
  // Column already exists
}

db.exec(`
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

db.exec(`
  CREATE TABLE IF NOT EXISTS preferences (
    user_id TEXT PRIMARY KEY,
    client_storage_enabled INTEGER NOT NULL DEFAULT 1,
    server_storage_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS todo_places (
    id TEXT PRIMARY KEY,
    todo_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
    UNIQUE(todo_id, place_id)
  )
`);

export { db };

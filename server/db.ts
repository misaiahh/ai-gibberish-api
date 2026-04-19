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

export { db };

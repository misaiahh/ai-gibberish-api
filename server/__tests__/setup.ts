import * as DatabaseModule from "better-sqlite3";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, afterEach } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

type DBInstance = DatabaseModule.Database;

let db: DBInstance | null = null;
let dbPath: string;

export function getDb(): DBInstance {
  if (!db) {
    throw new Error("Database not initialized. Run setupDb() first.");
  }
  return db;
}

export function setupDb(inMemory = false) {
  if (db) {
    db.close();
  }

  dbPath = inMemory
    ? ":memory:"
    : join(__dirname, "..", "..", "data", "test.db");

  const dir = dirname(dbPath);
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- needed for mkdirSync
  const fs = require("node:fs");
  fs.mkdirSync(dir, { recursive: true });

  db = new DatabaseModule.default(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  return db;
}

beforeEach(() => {
  setupDb();
});

afterEach(() => {
  if (db) {
    db.close();
    db = null;
    // Clean up test database file
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs");
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    if (fs.existsSync(dbPath + "-shm")) {
      fs.unlinkSync(dbPath + "-shm");
    }
    if (fs.existsSync(dbPath + "-wal")) {
      fs.unlinkSync(dbPath + "-wal");
    }
  }
});

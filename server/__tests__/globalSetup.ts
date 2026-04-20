import { existsSync, unlinkSync } from "node:fs";

export async function setup() {
  // Clear stale DB
  const testDbPath = process.env.TEST_DB_PATH || "data/todo.db";
  try {
    if (existsSync(testDbPath)) unlinkSync(testDbPath);
    if (existsSync(testDbPath + "-wal")) unlinkSync(testDbPath + "-wal");
    if (existsSync(testDbPath + "-shm")) unlinkSync(testDbPath + "-shm");
  } catch {
    // DB may not exist
  }

  // Start server once
  process.env.PORT = "3001";
  // @ts-expect-error .mjs has no types
  await import("../../.output/server/index.mjs");

  // Wait for server to be ready
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch("http://127.0.0.1:3001/api/health");
      if (res.ok) return;
    } catch {
      // Retry
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Server failed to start within 4 seconds");
}

export async function teardown() {
  // No-op: Nitro server lifecycle not manageable in Vitest module caching env
}

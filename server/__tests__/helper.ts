import { unlinkSync, existsSync } from "node:fs";

const testDbPath = process.env.TEST_DB_PATH || "data/todo.db";

// Clear stale DB before importing the built server
try {
  if (existsSync(testDbPath)) unlinkSync(testDbPath);
  if (existsSync(testDbPath + "-wal")) unlinkSync(testDbPath + "-wal");
  if (existsSync(testDbPath + "-shm")) unlinkSync(testDbPath + "-shm");
} catch {
  // DB may not exist
}

// Set port before importing the built server
process.env.PORT = "3001";

// Importing the built server auto-starts it
// @ts-expect-error .mjs has no types
import("../../.output/server/index.mjs");

export async function startServer(): Promise<void> {
  // Wait for server to be ready
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch("http://localhost:3001/api/health");
      if (res.ok) return;
    } catch {
      // Retry
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Server failed to start within 4 seconds");
}

export async function stopServer(): Promise<void> {
  // No-op: Nitro server lifecycle not manageable in Vitest module caching env
}

export async function api(
  path: string,
  options?: RequestInit,
  baseUrl = "http://localhost:3001"
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
}

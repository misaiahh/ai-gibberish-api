import { unlinkSync, existsSync } from "node:fs";

// Clear stale DB before importing the built server
const dbPath = "data/todo.db";
if (existsSync(dbPath)) {
  unlinkSync(dbPath);
}
if (existsSync(dbPath + "-wal")) {
  unlinkSync(dbPath + "-wal");
}
if (existsSync(dbPath + "-shm")) {
  unlinkSync(dbPath + "-shm");
}

// Set port before importing the built server
process.env.PORT = "3001";

let imported = false;

export async function startServer(): Promise<void> {
  if (imported) return;
  imported = true;

  // Importing the built server auto-starts it
  // @ts-expect-error .mjs has no types
  await import("../../.output/server/index.mjs");

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
  // The Nitro server handles its own lifecycle via graceful shutdown
}

export async function api(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`http://localhost:3001${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
}

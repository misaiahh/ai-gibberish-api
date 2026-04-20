import { db } from "../db";
import { defineEventHandler, readBody, createError } from "h3";
import { useSession } from "../lib/sessionHandler";

// POST /api/todos — create a new todo
export default defineEventHandler(async (event) => {
  const { userId } = useSession(event);

  // Read body directly from raw request to avoid h3 readBody issues in test env
  const body = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const req = event.node.req as NodeJS.ReadableStream & { headers: Record<string, string> };
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
  const { title } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    throw createError({ statusCode: 400, statusMessage: "Title is required" });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    "INSERT INTO todos (id, title, completed, created_at, updated_at, user_id) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, title.trim(), 0, now, now, userId);

  return {
    id,
    title: title.trim(),
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
});

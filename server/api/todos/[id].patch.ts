import { db } from "../../db";
import { defineEventHandler, getRouterParam, readBody, createError } from "h3";
import { useSession } from "../../lib/sessionHandler";

// PATCH /api/todos/:id — update a todo
export default defineEventHandler(async (event) => {
  useSession(event);
  const session = (event.context as { session: { sessionId: string } }).session;

  const id = getRouterParam(event, "id");

  const todo = db
    .prepare("SELECT * FROM todos WHERE id = ? AND session_id = ?")
    .get(id, session.sessionId) as { id: string; title: string; completed: number; created_at: string } | undefined;

  if (!todo) {
    throw createError({ statusCode: 404, statusMessage: "Todo not found" });
  }

  // Read body via raw stream to avoid h3 readBody issues in vitest
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
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      throw createError({ statusCode: 400, statusMessage: "Title must be a non-empty string" });
    }
    fields.push("title = ?");
    values.push(body.title.trim());
  }

  if (body.completed !== undefined) {
    fields.push("completed = ?");
    values.push(body.completed ? 1 : 0);
  }

  if (fields.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "No valid fields to update" });
  }

  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);
  values.push(session.sessionId);

  db.prepare(`UPDATE todos SET ${fields.join(", ")} WHERE id = ? AND session_id = ?`).run(...values);

  return {
    id: todo.id,
    title: body.title ?? todo.title,
    completed: body.completed !== undefined ? body.completed : todo.completed === 1,
    createdAt: todo.created_at,
    updatedAt: now,
  };
});

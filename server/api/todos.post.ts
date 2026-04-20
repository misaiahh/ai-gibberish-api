import { db } from "../db";
import { defineEventHandler, createError } from "h3";
import { useSession } from "../lib/sessionHandler";
import { getLogger } from "../lib/logger";

// POST /api/todos — create a new todo
export default defineEventHandler(async (event) => {
  const logger = getLogger();
  const { userId } = useSession(event);

  // Read body via raw stream to avoid h3 readBody issues in vitest
  const body = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const req = event.node.req as NodeJS.ReadableStream & { headers: Record<string, string> };
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        logger.debug("[createTodo]", { endpoint: event.path }, { message: "malformed JSON body" });
        resolve({});
      }
    });
    req.on("error", reject);
  });

  const ctx = { endpoint: event.path, user: userId };

  try {
    if (body.title === undefined || typeof body.title !== "string" || !body.title.trim()) {
      throw createError({ statusCode: 400, statusMessage: "Title is required and must be a non-empty string" });
    }

    const title = body.title.trim();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      "INSERT INTO todos (id, title, completed, created_at, updated_at, user_id) VALUES (?, ?, 0, ?, ?, ?)"
    ).run(id, title, now, now, userId);

    const output = { id, title, completed: false, createdAt: now, updatedAt: now };
    logger.info("[createTodo]", ctx, output);

    return output;
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) {
      logger.debug("[createTodo]", ctx, { statusCode: err.statusCode, message: err.statusMessage });
      throw err;
    }
    logger.error("[createTodo]", ctx, err);
    throw createError({ statusCode: 500, statusMessage: "Internal server error" });
  }
});

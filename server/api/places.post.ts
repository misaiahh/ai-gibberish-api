import { db } from "../db";
import { defineEventHandler, createError } from "h3";
import { useSession } from "../lib/sessionHandler";
import { getLogger } from "../lib/logger";

// POST /api/places — create a new place
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
        resolve({});
      }
    });
    req.on("error", reject);
  });

  const ctx = { endpoint: event.path, user: userId };

  try {
    if (body.name === undefined || typeof body.name !== "string" || !body.name.trim()) {
      throw createError({ statusCode: 400, statusMessage: "Name is required and must be a non-empty string" });
    }

    const name = body.name.trim();
    const parentId = body.parentId !== undefined && typeof body.parentId === "string" ? body.parentId : null;

    if (parentId !== null) {
      const parent = db
        .prepare("SELECT * FROM places WHERE id = ? AND user_id = ?")
        .get(parentId, userId);
      if (!parent) {
        throw createError({ statusCode: 400, statusMessage: "Parent place not found" });
      }
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      "INSERT INTO places (id, user_id, name, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, userId, name, parentId, now, now);

    const output = { id, name, parentId, createdAt: now, updatedAt: now };
    logger.info("[createPlace]", ctx, output);

    return output;
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) {
      logger.debug("[createPlace]", ctx, { statusCode: err.statusCode, message: err.statusMessage });
      throw err;
    }
    logger.error("[createPlace]", ctx, err);
    throw createError({ statusCode: 500, statusMessage: "Internal server error" });
  }
});

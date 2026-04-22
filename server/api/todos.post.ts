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
    const description = typeof body.description === "string" ? body.description : "";

    const placeIds: string[] = [];
    if (body.placeIds !== undefined && Array.isArray(body.placeIds)) {
      for (const pid of body.placeIds) {
        if (typeof pid !== "string") continue;
        const place = db
          .prepare("SELECT * FROM places WHERE id = ? AND user_id = ?")
          .get(pid, userId);
        if (!place) {
          throw createError({ statusCode: 400, statusMessage: `Place not found: ${pid}` });
        }
        placeIds.push(pid);
      }
    } else if (body.placeId !== undefined && typeof body.placeId === "string") {
      const place = db
        .prepare("SELECT * FROM places WHERE id = ? AND user_id = ?")
        .get(body.placeId, userId);
      if (!place) {
        throw createError({ statusCode: 400, statusMessage: "Place not found" });
      }
      placeIds.push(body.placeId);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(
      "INSERT INTO todos (id, title, description, completed, created_at, updated_at, user_id, place_id) VALUES (?, ?, ?, 0, ?, ?, ?, ?)"
    );

    const primaryPlaceId = placeIds.length > 0 ? placeIds[0] : null;
    stmt.run(id, title, description, now, now, userId, primaryPlaceId);

    if (placeIds.length > 0) {
      const insertStmt = db.prepare(
        "INSERT OR IGNORE INTO todo_places (id, todo_id, place_id, created_at) VALUES (?, ?, ?, ?)"
      );
      for (const pid of placeIds) {
        insertStmt.run(crypto.randomUUID(), id, pid, now);
      }
    }

    const places = db.prepare(
      "SELECT tp.place_id FROM todo_places tp WHERE tp.todo_id = ? ORDER BY tp.created_at"
    ).all(id) as Array<{ place_id: string }>;

    const outputPlaces = places.map((tp) => {
      const place = db.prepare(
        "SELECT id, name, parent_id, created_at, updated_at FROM places WHERE id = ?"
      ).get(tp.place_id) as {
        id: string;
        name: string;
        parent_id: string | null;
        created_at: string;
        updated_at: string;
      };
      return {
        id: place.id,
        name: place.name,
        parentId: place.parent_id,
        createdAt: place.created_at,
        updatedAt: place.updated_at,
      };
    });

    const output = { id, title, description, completed: false, placeIds, places: outputPlaces, createdAt: now, updatedAt: now };
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

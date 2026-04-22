import { db } from "../../db";
import { defineEventHandler, getRouterParam, createError } from "h3";
import { useSession } from "../../lib/sessionHandler";
import { getLogger } from "../../lib/logger";

// PATCH /api/todos/:id — update a todo
export default defineEventHandler(async (event) => {
  const logger = getLogger();
  const { userId } = useSession(event);
  const id = getRouterParam(event, "id");

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
    const todo = db
      .prepare("SELECT * FROM todos WHERE id = ? AND user_id = ?")
      .get(id, userId) as { id: string; title: string; completed: number; created_at: string; place_id: string | null } | undefined;

    if (!todo) {
      logger.debug("[updateTodo]", ctx, { id, message: "not found" });
      throw createError({ statusCode: 404, statusMessage: "Todo not found" });
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        throw createError({ statusCode: 400, statusMessage: "Title must be a non-empty string" });
      }
      fields.push("title = ?");
      values.push(body.title.trim());
    }

    if (body.description !== undefined) {
      const description = typeof body.description === "string" ? body.description : "";
      fields.push("description = ?");
      values.push(description);
    }

    if (body.completed !== undefined) {
      fields.push("completed = ?");
      values.push(body.completed ? 1 : 0);
    }

    if (body.placeIds !== undefined) {
      if (!Array.isArray(body.placeIds)) {
        throw createError({ statusCode: 400, statusMessage: "placeIds must be an array" });
      }

      const newPlaceIds: string[] = [];
      for (const pid of body.placeIds) {
        if (typeof pid !== "string" || pid === "") continue;
        const place = db
          .prepare("SELECT * FROM places WHERE id = ? AND user_id = ?")
          .get(pid, userId);
        if (!place) {
          throw createError({ statusCode: 400, statusMessage: `Place not found: ${pid}` });
        }
        newPlaceIds.push(pid);
      }

      db.prepare("DELETE FROM todo_places WHERE todo_id = ?").run(id);

      if (newPlaceIds.length > 0) {
        const now = new Date().toISOString();
        const insertStmt = db.prepare(
          "INSERT OR IGNORE INTO todo_places (id, todo_id, place_id, created_at) VALUES (?, ?, ?, ?)"
        );
        for (const pid of newPlaceIds) {
          insertStmt.run(crypto.randomUUID(), id, pid, now);
        }
      }

      const primaryPlaceId = newPlaceIds.length > 0 ? newPlaceIds[0] : null;
      fields.push("place_id = ?");
      values.push(primaryPlaceId);
    }

    if (body.placeId !== undefined && body.placeIds === undefined) {
      const newPlaceId = body.placeId === null || body.placeId === "" ? null : String(body.placeId);

      if (body.placeId === null || body.placeId === "") {
        db.prepare("DELETE FROM todo_places WHERE todo_id = ?").run(id);
      }

      if (newPlaceId !== null) {
        const place = db
          .prepare("SELECT * FROM places WHERE id = ? AND user_id = ?")
          .get(newPlaceId, userId);
        if (!place) {
          throw createError({ statusCode: 400, statusMessage: "Place not found" });
        }

        db.prepare("DELETE FROM todo_places WHERE todo_id = ?").run(id);

        db.prepare(
          "INSERT OR IGNORE INTO todo_places (id, todo_id, place_id, created_at) VALUES (?, ?, ?, ?)"
        ).run(crypto.randomUUID(), id, newPlaceId, new Date().toISOString());
      }

      fields.push("place_id = ?");
      values.push(newPlaceId);
    }

    if (fields.length === 0) {
      throw createError({ statusCode: 400, statusMessage: "No valid fields to update" });
    }

    const now = new Date().toISOString();
    fields.push("updated_at = ?");
    values.push(now);
    values.push(id);
    values.push(userId);

    db.prepare(`UPDATE todos SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);

    const placeIdsStmt = db.prepare(
      "SELECT place_id FROM todo_places WHERE todo_id = ? ORDER BY created_at"
    ).all(id) as Array<{ place_id: string }>;

    const placeIds = placeIdsStmt.map((tp) => tp.place_id);

    const outputPlaces = placeIds.map((pid) => {
      const place = db.prepare(
        "SELECT id, name, parent_id, created_at, updated_at FROM places WHERE id = ?"
      ).get(pid) as {
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

    const output = {
      id: todo.id,
      title: body.title ?? todo.title,
      description: body.description !== undefined ? body.description : (todo.description || ""),
      completed: body.completed !== undefined ? body.completed : todo.completed === 1,
      placeIds,
      places: outputPlaces,
      createdAt: todo.created_at,
      updatedAt: now,
    };

    logger.traceMutationReq(ctx, "[updateTodo]", {
      input: body,
      output,
    });

    return output;
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("[updateTodo]", ctx, err);
    throw createError({ statusCode: 500, statusMessage: "Internal server error" });
  }
});

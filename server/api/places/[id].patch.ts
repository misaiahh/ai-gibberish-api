import { db } from "../../db";
import { defineEventHandler, getRouterParam, createError } from "h3";
import { useSession } from "../../lib/sessionHandler";
import { getLogger } from "../../lib/logger";

// PATCH /api/places/:id — update a place
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
    const place = db
      .prepare("SELECT * FROM places WHERE id = ? AND user_id = ?")
      .get(id, userId) as { id: string; name: string; parent_id: string | null } | undefined;

    if (!place) {
      logger.debug("[updatePlace]", ctx, { id, message: "not found" });
      throw createError({ statusCode: 404, statusMessage: "Place not found" });
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        throw createError({ statusCode: 400, statusMessage: "Name must be a non-empty string" });
      }
      fields.push("name = ?");
      values.push(body.name.trim());
    }

    if (body.parentId !== undefined) {
      const newParentId = body.parentId === null || body.parentId === "" ? null : String(body.parentId);

      if (newParentId !== null) {
        const parent = db
          .prepare("SELECT * FROM places WHERE id = ? AND user_id = ?")
          .get(newParentId, userId);
        if (!parent) {
          throw createError({ statusCode: 400, statusMessage: "Parent place not found" });
        }

        if (newParentId === id) {
          throw createError({ statusCode: 400, statusMessage: "Place cannot be its own parent" });
        }

        let current = parent;
        while (current.parent_id !== null) {
          if (current.parent_id === id) {
            throw createError({ statusCode: 400, statusMessage: "Cannot create circular parent reference" });
          }
          current = db
            .prepare("SELECT * FROM places WHERE id = ?")
            .get(current.parent_id) as { parent_id: string | null } | undefined;
          if (!current) break;
        }
      }

      fields.push("parent_id = ?");
      values.push(newParentId);
    }

    if (fields.length === 0) {
      throw createError({ statusCode: 400, statusMessage: "No valid fields to update" });
    }

    const now = new Date().toISOString();
    fields.push("updated_at = ?");
    values.push(now);
    values.push(id);
    values.push(userId);

    db.prepare(`UPDATE places SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);

    const output = {
      id: place.id,
      name: body.name ?? place.name,
      parentId: body.parentId !== undefined ? (body.parentId === null || body.parentId === "" ? null : body.parentId) : place.parent_id,
      createdAt: place.created_at,
      updatedAt: now,
    };

    logger.traceMutationReq(ctx, "[updatePlace]", {
      input: body,
      output,
    });

    return output;
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("[updatePlace]", ctx, err);
    throw createError({ statusCode: 500, statusMessage: "Internal server error" });
  }
});

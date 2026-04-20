import { db } from "../db";
import { defineEventHandler, createError } from "h3";
import { useSession } from "../lib/sessionHandler";
import { getLogger } from "../lib/logger";

// PATCH /api/preferences — update current user's preferences
export default defineEventHandler(async (event) => {
  const logger = getLogger();
  const { userId } = useSession(event);
  const ctx = { endpoint: event.path, user: userId };

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

  try {
    if (body.clientStorageEnabled !== undefined) {
      if (typeof body.clientStorageEnabled !== "boolean") {
        throw createError({ statusCode: 400, statusMessage: "clientStorageEnabled must be a boolean" });
      }
    }

    if (body.serverStorageEnabled !== undefined) {
      if (typeof body.serverStorageEnabled !== "boolean") {
        throw createError({ statusCode: 400, statusMessage: "serverStorageEnabled must be a boolean" });
      }
    }

    if (body.clientStorageEnabled === undefined && body.serverStorageEnabled === undefined) {
      throw createError({ statusCode: 400, statusMessage: "No valid fields to update" });
    }

    const now = new Date().toISOString();

    // Read existing values for fields not being updated
    const existing = db
      .prepare("SELECT * FROM preferences WHERE user_id = ?")
      .get(userId) as {
        client_storage_enabled: number;
        server_storage_enabled: number;
        created_at: string;
      } | undefined;

    const clientVal = body.clientStorageEnabled !== undefined
      ? (body.clientStorageEnabled ? 1 : 0)
      : (existing?.client_storage_enabled ?? 1);
    const serverVal = body.serverStorageEnabled !== undefined
      ? (body.serverStorageEnabled ? 1 : 0)
      : (existing?.server_storage_enabled ?? 1);
    const createdAt = existing?.created_at ?? now;

    // Upsert: insert or replace
    db.prepare(
      `INSERT INTO preferences (user_id, client_storage_enabled, server_storage_enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         client_storage_enabled = excluded.client_storage_enabled,
         server_storage_enabled = excluded.server_storage_enabled,
         updated_at = excluded.updated_at`
    ).run(userId, clientVal, serverVal, createdAt, now);

    const prefs = db
      .prepare("SELECT * FROM preferences WHERE user_id = ?")
      .get(userId) as {
      user_id: string;
      client_storage_enabled: number;
      server_storage_enabled: number;
      created_at: string;
      updated_at: string;
    };

    const output = {
      clientStorageEnabled: prefs.client_storage_enabled === 1,
      serverStorageEnabled: prefs.server_storage_enabled === 1,
      createdAt: prefs.created_at,
      updatedAt: prefs.updated_at,
    };

    logger.traceMutationReq(ctx, "[updatePreferences]", { input: body, output });

    return output;
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    logger.error("[updatePreferences]", ctx, err);
    throw createError({ statusCode: 500, statusMessage: "Internal server error" });
  }
});

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { lt } from "drizzle-orm";
import { loadConfig } from "../config";
import { db } from "../db/db";
import { codices, sessions } from "../db/schema";

const CLEANUP_PATH = "/maintenance/cleanup";
const SHARED_SECRET_HEADER = "x-cleanup-secret";

type CleanupResponse = {
  deletedCodices: number;
  deletedSessions: number;
};

function normalizeHeaderValue(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

async function authorizeCleanup(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<boolean> {
  const config = loadConfig();
  const sharedSecret = config.maintenance.cleanupSharedSecret;

  if (!sharedSecret) {
    reply.status(404).send();
    return false;
  }

  const secretHeader = normalizeHeaderValue(
    request.headers[SHARED_SECRET_HEADER],
  );

  if (!secretHeader) {
    reply.status(404).send();
    return false;
  }

  if (secretHeader !== sharedSecret) {
    reply.status(404).send();
    return false;
  }

  return true;
}

export async function registerCleanupRoutes(server: FastifyInstance) {
  server.post(CLEANUP_PATH, async (request, reply) => {
    const authorized = await authorizeCleanup(request, reply);
    if (!authorized) {
      return;
    }

    const nowIso = new Date().toISOString();
    const deletedCodices = await db
      .delete(codices)
      .where(lt(codices.expires_at, nowIso))
      .returning({ id: codices.id });
    const deletedSessions = await db
      .delete(sessions)
      .where(lt(sessions.expires_at, nowIso))
      .returning({ id: sessions.id });

    const response: CleanupResponse = {
      deletedCodices: deletedCodices.length,
      deletedSessions: deletedSessions.length,
    };

    reply.status(200).send(response);
  });
}

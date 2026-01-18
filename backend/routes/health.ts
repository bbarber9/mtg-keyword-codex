import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(server: FastifyInstance) {
  server.get("/health", async (_request, reply) => {
    reply.status(200).send();
  });
}

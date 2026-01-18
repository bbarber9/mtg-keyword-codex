import Fastify from "fastify";
import { loadConfig } from "./config";
import { registerHealthRoutes } from "./routes/health";

async function startServer() {
  const server = Fastify({ logger: true });
  const config = loadConfig();
  await server.register(registerHealthRoutes, {
    prefix: config.server.apiPrefix,
  });
  await server.listen({ port: config.server.port, host: config.server.host });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});

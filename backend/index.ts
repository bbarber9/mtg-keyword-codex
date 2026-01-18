import Fastify from "fastify";
import { registerHealthRoutes } from "./routes/health";

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "0.0.0.0";
const PORT_ENV = "PORT";
const HOST_ENV = "HOST";
const API_PREFIX = "/api";

function resolvePort(): number {
  const envValue = process.env[PORT_ENV];
  if (!envValue) {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(envValue, 10);
  return Number.isNaN(parsed) ? DEFAULT_PORT : parsed;
}

async function startServer() {
  const server = Fastify({ logger: true });
  await server.register(registerHealthRoutes, { prefix: API_PREFIX });

  const port = resolvePort();
  const host = process.env[HOST_ENV] ?? DEFAULT_HOST;
  await server.listen({ port, host });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});

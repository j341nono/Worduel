import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { Server as IOServer } from "socket.io";
import { env } from "./env.js";
import { registerSocketHandlers } from "./socket/handlers.js";

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });

  app.get("/health", async () => ({ ok: true, name: "worduel-server" }));

  await app.listen({ port: env.PORT, host: "0.0.0.0" });

  const io = new IOServer(app.server, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  registerSocketHandlers(io);

  app.log.info(`Worduel server listening on :${env.PORT}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error", err);
  process.exit(1);
});

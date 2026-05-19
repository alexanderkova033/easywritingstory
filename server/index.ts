import "dotenv/config";
import { createApp } from "./presentation/http/create-app.js";
import { createRequestLogger } from "./infrastructure/logging/request-logger.js";

const PORT = Number(process.env.PORT ?? 8787);
const SERVER_REQUEST_TIMEOUT_MS = Number(
  process.env.SERVER_REQUEST_TIMEOUT_MS ?? 120_000,
);

const log = createRequestLogger({ service: "easy-poems-api" });

const app = createApp();

const server = app.listen(PORT, () => {
  log.info("listen", { port: PORT });
});

const reqTimeout =
  Number.isFinite(SERVER_REQUEST_TIMEOUT_MS) && SERVER_REQUEST_TIMEOUT_MS > 0
    ? SERVER_REQUEST_TIMEOUT_MS
    : 120_000;
server.requestTimeout = reqTimeout;
server.headersTimeout = reqTimeout + 5_000;

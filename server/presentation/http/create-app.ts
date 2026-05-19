import cors from "cors";
import express from "express";
import {
  createRequestLogger,
  newRequestId,
} from "../../infrastructure/logging/request-logger.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.use(
    cors(
      process.env.CORS_ORIGIN
        ? {
            origin: process.env.CORS_ORIGIN,
            methods: ["GET"],
          }
        : { origin: true },
    ),
  );

  app.use((req, res, next) => {
    const requestId = newRequestId(req.get("x-request-id"));
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    req.log = createRequestLogger({ requestId });
    next();
  });

  app.get("/health", (req, res) => {
    const t0 = performance.now();
    res.json({ ok: true, service: "easy-poems-api" });
    const durationMs = Math.round(performance.now() - t0);
    req.log.info("health", { path: "/health", status: 200, durationMs });
  });

  return app;
}

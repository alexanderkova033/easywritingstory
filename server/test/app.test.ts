import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../presentation/http/create-app.js";

describe("HTTP API", () => {
  const prevCors = process.env.CORS_ORIGIN;

  beforeEach(() => {
    delete process.env.CORS_ORIGIN;
  });

  after(() => {
    if (prevCors === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = prevCors;
  });

  it("GET /health returns ok and propagates X-Request-Id", async () => {
    const app = createApp();
    const customId = "client-req-1";
    const res = await request(app)
      .get("/health")
      .set("X-Request-Id", customId)
      .expect(200);
    assert.equal(res.headers["x-request-id"], customId);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.service, "easy-poems-api");
  });
});

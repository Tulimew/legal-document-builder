import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "./errors";
import { assertMutationRequest, correlationId, readJsonBody } from "./http";

const env = { NODE_ENV: "production", HTTP_ALLOWED_ORIGINS: "https://legal.example.test" } as NodeJS.ProcessEnv;

test("mutation boundary rejects untrusted origin and wrong media type", () => {
  assert.throws(() => assertMutationRequest(new Request("https://legal.example.test/api", { method: "POST", headers: { origin: "https://evil.test", "content-type": "application/json" } }), env), (error: unknown) => error instanceof AppError && error.code === "FORBIDDEN");
  assert.throws(() => assertMutationRequest(new Request("https://legal.example.test/api", { method: "POST", headers: { origin: "https://legal.example.test", "content-type": "text/plain" } }), env), (error: unknown) => error instanceof AppError && error.code === "INVALID_REQUEST");
});

test("safe methods are not blocked by mutation CSRF controls", () => {
  assert.doesNotThrow(() => assertMutationRequest(new Request("https://legal.example.test/api/v1/health"), env));
});

test("JSON reader checks actual UTF-8 bytes and invalid JSON", async () => {
  const request = (body: string) => new Request("http://localhost:3000/api", { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body });
  await assert.rejects(() => readJsonBody(request(JSON.stringify({ text: "tiếng Việt" })), 8), (error: unknown) => error instanceof AppError && error.code === "INVALID_REQUEST");
  await assert.rejects(() => readJsonBody(request("{")), (error: unknown) => error instanceof AppError && error.code === "INVALID_REQUEST");
});

test("correlation ID is bounded and does not reflect arbitrary input", () => {
  const accepted = correlationId(new Request("http://localhost", { headers: { "x-correlation-id": "m10-safe_01" } }));
  assert.equal(accepted, "m10-safe_01");
  const rejected = correlationId(new Request("http://localhost", { headers: { "x-correlation-id": "x".repeat(129) } }));
  assert.match(rejected, /^[0-9a-f-]{36}$/);
});

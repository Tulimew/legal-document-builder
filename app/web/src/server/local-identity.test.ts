import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "./errors";
import { actorFromLocalSession, createLocalSession, hashLocalPassword, verifyLocalPassword } from "./local-identity";

const env = { NODE_ENV: "test", AUTH_SESSION_SECRET: "m12-test-secret-that-is-at-least-32-characters", AUTH_SESSION_TTL_SECONDS: "3600" } as NodeJS.ProcessEnv;

test("local password uses salted scrypt and verifies without exposing the password", async () => {
  const first = await hashLocalPassword("a-strong-password-123");
  const second = await hashLocalPassword("a-strong-password-123");
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(await verifyLocalPassword("a-strong-password-123", first.salt, first.hash), true);
  assert.equal(await verifyLocalPassword("wrong-password", first.salt, first.hash), false);
});

test("signed local session rejects tampering and expiration", () => {
  const now = Date.now();
  const token = createLocalSession("00000000-0000-4000-8000-000000000101", env, now);
  assert.equal(actorFromLocalSession(new Headers({ cookie: `legal_builder_session=${token}` }), env, now).userId, "00000000-0000-4000-8000-000000000101");
  assert.throws(() => actorFromLocalSession(new Headers({ cookie: `legal_builder_session=${token}x` }), env, now), (error) => error instanceof AppError && error.code === "UNAUTHENTICATED");
  assert.throws(() => actorFromLocalSession(new Headers({ cookie: `legal_builder_session=${token}` }), env, now + 3_600_001), (error) => error instanceof AppError && error.code === "UNAUTHENTICATED");
});

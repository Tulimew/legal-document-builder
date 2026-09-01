import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "./errors";
import { authenticate } from "./identity";
import { createLocalSession } from "./local-identity";

test("từ chối mặc định khi adapter xác thực chưa cấu hình", () => {
  const previous = process.env.AUTH_MODE;
  delete process.env.AUTH_MODE;
  try {
    assert.throws(() => authenticate(new Headers()), (error: unknown) =>
      error instanceof AppError && error.code === "AUTH_NOT_CONFIGURED");
  } finally {
    if (previous === undefined) delete process.env.AUTH_MODE;
    else process.env.AUTH_MODE = previous;
  }
});

test("development identity chỉ lấy actor từ header hợp lệ", () => {
  const previous = process.env.AUTH_MODE;
  process.env.AUTH_MODE = "development";
  try {
    const actor = authenticate(new Headers({
      "x-development-user-id": "00000000-0000-4000-8000-000000000101",
    }));
    assert.equal(actor.userId, "00000000-0000-4000-8000-000000000101");
  } finally {
    if (previous === undefined) delete process.env.AUTH_MODE;
    else process.env.AUTH_MODE = previous;
  }
});

test("development headers fail closed outside development mode", () => {
  const previous = process.env.AUTH_MODE;
  process.env.AUTH_MODE = "production";
  try {
    assert.throws(() => authenticate(new Headers({ "x-development-user-id": "00000000-0000-4000-8000-000000000101" })), (error: unknown) => error instanceof AppError && error.code === "AUTH_NOT_CONFIGURED");
  } finally {
    if (previous === undefined) delete process.env.AUTH_MODE; else process.env.AUTH_MODE = previous;
  }
});

test("local production identity accepts only a signed session cookie", () => {
  const previousMode = process.env.AUTH_MODE;
  const previousSecret = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_MODE = "local";
  process.env.AUTH_SESSION_SECRET = "m12-test-secret-that-is-at-least-32-characters";
  try {
    assert.throws(() => authenticate(new Headers({ "x-development-user-id": "00000000-0000-4000-8000-000000000101" })), (error) => error instanceof AppError && error.code === "UNAUTHENTICATED");
    const token = createLocalSession("00000000-0000-4000-8000-000000000101");
    assert.equal(authenticate(new Headers({ cookie: `legal_builder_session=${token}` })).userId, "00000000-0000-4000-8000-000000000101");
  } finally {
    if (previousMode === undefined) delete process.env.AUTH_MODE; else process.env.AUTH_MODE = previousMode;
    if (previousSecret === undefined) delete process.env.AUTH_SESSION_SECRET; else process.env.AUTH_SESSION_SECRET = previousSecret;
  }
});

import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { AppError } from "./errors";
import { publicRuntimeSummary, readRuntimeConfig } from "./runtime-config";

const valid = (): NodeJS.ProcessEnv => ({
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://app:secret@localhost:5432/legal_builder_dev",
  DATABASE_POOL_MAX: "4",
  AUTH_MODE: "development",
  AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION: "false",
  PUBLISHING_STORAGE_ROOT: path.resolve(".runtime-test-storage"),
});

test("runtime config validates bounded values and keeps secrets private", () => {
  const config = readRuntimeConfig(valid());
  assert.equal(config.database.poolMax, 4);
  assert.equal(config.auth.developmentBypassAuthorization, false);
  const publicText = JSON.stringify(publicRuntimeSummary(config));
  assert.doesNotMatch(publicText, /secret|legal_builder_dev|runtime-test-storage/i);
});

test("runtime config fails closed for invalid settings", () => {
  for (const mutate of [
    (env: NodeJS.ProcessEnv) => delete env.DATABASE_URL,
    (env: NodeJS.ProcessEnv) => { env.DATABASE_POOL_MAX = "0"; },
    (env: NodeJS.ProcessEnv) => { env.AUTH_MODE = "production"; },
    (env: NodeJS.ProcessEnv) => { env.PUBLISHING_STORAGE_ROOT = "relative"; },
  ]) {
    const env = valid();
    mutate(env);
    assert.throws(() => readRuntimeConfig(env), (error) => error instanceof AppError && error.status === 503);
  }
});

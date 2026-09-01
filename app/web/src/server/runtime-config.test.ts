import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { AppError } from "./errors";
import { assessProductionConfiguration, publicRuntimeSummary, readRuntimeConfig } from "./runtime-config";

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
  assert.equal(config.applicationEnvironment, "test");
  assert.equal(config.auth.developmentBypassAuthorization, false);
  const publicText = JSON.stringify(publicRuntimeSummary(config));
  assert.doesNotMatch(publicText, /secret|legal_builder_dev|runtime-test-storage/i);
});

test("production assessment is fail-closed and redacted until providers are configured", () => {
  const assessment = assessProductionConfiguration({
    NODE_ENV: "production",
    APP_ENV: "production",
    AUTH_MODE: "development",
    AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION: "true",
    DATABASE_URL: "postgresql://app:top-secret@db/internal",
  } as NodeJS.ProcessEnv);
  assert.equal(assessment.ready, false);
  assert.deepEqual(assessment.blockers, [
    "PRODUCTION_IDENTITY_ADAPTER_REQUIRED",
    "DEVELOPMENT_AUTHORIZATION_BYPASS_FORBIDDEN",
    "ALLOWED_ORIGINS_REQUIRED",
  ]);
  assert.doesNotMatch(JSON.stringify(assessment), /top-secret|postgresql:\/\//);
});

test("APP_ENV production cannot start with development identity", () => {
  const env = valid();
  env.APP_ENV = "production";
  assert.throws(() => readRuntimeConfig(env), (error) => error instanceof AppError && error.code === "AUTH_NOT_CONFIGURED");
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

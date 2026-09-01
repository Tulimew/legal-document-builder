import path from "node:path";

import { AppError } from "./errors";

export type RuntimeConfig = {
  applicationEnvironment: "development" | "test";
  database: { connectionString: string; poolMax: number };
  auth: { mode: "development"; developmentBypassAuthorization: boolean };
  storage: { adapter: "filesystem"; root: string };
  worker: { pollIntervalMs: number; idleBackoffMs: number; maxConsecutiveErrors: number };
};

export type DatabaseRuntimeConfig = RuntimeConfig["database"];
export type StorageRuntimeConfig = RuntimeConfig["storage"];

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new AppError("CONFIGURATION_INVALID", `Thiếu cấu hình bắt buộc ${name}.`);
  return value;
}

function integer(env: NodeJS.ProcessEnv, name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = env[name]?.trim();
  const value = raw === undefined || raw === "" ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new AppError("CONFIGURATION_INVALID", `${name} phải là số nguyên từ ${minimum} đến ${maximum}.`);
  }
  return value;
}

function boolean(env: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
  const raw = env[name]?.trim();
  if (raw === undefined || raw === "") return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new AppError("CONFIGURATION_INVALID", `${name} chỉ nhận true hoặc false.`);
}

function databaseUrl(env: NodeJS.ProcessEnv): string {
  const value = required(env, "DATABASE_URL");
  try {
    const parsed = new URL(value);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname || !parsed.pathname.slice(1)) throw new Error();
  } catch {
    throw new AppError("CONFIGURATION_INVALID", "DATABASE_URL không phải PostgreSQL URL hợp lệ.");
  }
  return value;
}

export function readDatabaseRuntimeConfig(env: NodeJS.ProcessEnv = process.env): DatabaseRuntimeConfig {
  return { connectionString: databaseUrl(env), poolMax: integer(env, "DATABASE_POOL_MAX", 10, 1, 100) };
}

export function readStorageRuntimeConfig(env: NodeJS.ProcessEnv = process.env): StorageRuntimeConfig {
  const storageAdapter = env.PUBLISHING_STORAGE_ADAPTER?.trim() || "filesystem";
  if (storageAdapter !== "filesystem") {
    throw new AppError("CONFIGURATION_INVALID", "PUBLISHING_STORAGE_ADAPTER chưa được hỗ trợ.");
  }
  const root = required(env, "PUBLISHING_STORAGE_ROOT");
  if (!path.isAbsolute(root)) throw new AppError("CONFIGURATION_INVALID", "PUBLISHING_STORAGE_ROOT phải là đường dẫn tuyệt đối.");
  return { adapter: "filesystem", root: path.resolve(root) };
}

export function readRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const applicationEnvironment = (env.APP_ENV?.trim() || (env.NODE_ENV === "test" ? "test" : "development"));
  if (applicationEnvironment !== "development" && applicationEnvironment !== "test") {
    throw new AppError("AUTH_NOT_CONFIGURED", "Production identity adapter chưa được cấu hình.");
  }
  const authMode = required(env, "AUTH_MODE");
  if (authMode !== "development") {
    throw new AppError("AUTH_NOT_CONFIGURED", "Production identity adapter chưa được cấu hình.");
  }
  return {
    applicationEnvironment,
    database: readDatabaseRuntimeConfig(env),
    auth: {
      mode: "development",
      developmentBypassAuthorization: boolean(env, "AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION", false),
    },
    storage: readStorageRuntimeConfig(env),
    worker: {
      pollIntervalMs: integer(env, "PUBLISHING_WORKER_POLL_INTERVAL_MS", 1_000, 100, 60_000),
      idleBackoffMs: integer(env, "PUBLISHING_WORKER_IDLE_BACKOFF_MS", 5_000, 100, 300_000),
      maxConsecutiveErrors: integer(env, "PUBLISHING_WORKER_MAX_CONSECUTIVE_ERRORS", 5, 1, 100),
    },
  };
}

export function publicRuntimeSummary(config: RuntimeConfig) {
  return {
    applicationEnvironment: config.applicationEnvironment,
    authMode: config.auth.mode,
    authorizationBypass: config.auth.developmentBypassAuthorization,
    storageAdapter: config.storage.adapter,
    workerConfigured: true,
  };
}

export type ProductionConfigurationAssessment = {
  ready: false;
  blockers: Array<"PRODUCTION_IDENTITY_ADAPTER_REQUIRED" | "DEVELOPMENT_AUTHORIZATION_BYPASS_FORBIDDEN" | "ALLOWED_ORIGINS_REQUIRED">;
};

export function assessProductionConfiguration(env: NodeJS.ProcessEnv): ProductionConfigurationAssessment {
  const blockers: ProductionConfigurationAssessment["blockers"] = [];
  if (!env.AUTH_MODE || env.AUTH_MODE === "development") blockers.push("PRODUCTION_IDENTITY_ADAPTER_REQUIRED");
  if (env.AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION === "true") blockers.push("DEVELOPMENT_AUTHORIZATION_BYPASS_FORBIDDEN");
  if (!env.HTTP_ALLOWED_ORIGINS?.trim()) blockers.push("ALLOWED_ORIGINS_REQUIRED");
  return { ready: false, blockers };
}

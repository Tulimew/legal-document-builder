import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "./errors";
import { checkReadiness, REQUIRED_MIGRATION } from "./readiness";
import type { StoragePort } from "./storage-port";

function storage(checkReady: () => Promise<void>): StoragePort {
  return {
    checkReady,
    putOnce: async () => ({ byteSize: 0, checksumSha256: "0".repeat(64) }),
    read: async () => new Uint8Array(),
    stat: async () => null,
    verify: async () => false,
  };
}

test("readiness checks database migration and storage without exposing configuration", async () => {
  const queries: Array<{ sql: string; values?: unknown[] }> = [];
  const pool = { query: async (sql: string, values?: unknown[]) => { queries.push({ sql, values }); return { rowCount: sql.includes("schema_migration") ? 1 : 1 }; } };
  let storageChecked = false;
  const result = await checkReadiness(pool as never, storage(async () => { storageChecked = true; }));
  assert.equal(result.status, "ready");
  assert.equal(storageChecked, true);
  assert.deepEqual(queries[1].values, [REQUIRED_MIGRATION]);
  assert.doesNotMatch(JSON.stringify(result), /url|password|root|key/i);
});

test("readiness fails closed when required migration is absent", async () => {
  const pool = { query: async (sql: string) => ({ rowCount: sql.includes("schema_migration") ? 0 : 1 }) };
  await assert.rejects(() => checkReadiness(pool as never, storage(async () => undefined)),
    (error) => error instanceof AppError && error.code === "DATABASE_UNAVAILABLE");
});

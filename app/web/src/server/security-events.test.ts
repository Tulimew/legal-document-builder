import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import type { Pool } from "pg";

import { AppError } from "./errors";
import { projectIdFromApiUrl, recordSecurityRejection } from "./security-events";

test("security rejection evidence stores only bounded classification fields", async () => {
  let values: unknown[] = [];
  const pool = { query: async (_sql: string, parameters: unknown[]) => { values = parameters; return { rowCount: 1, rows: [] }; } } as unknown as Pool;
  await recordSecurityRejection(pool, new AppError("INVALID_REQUEST", "Request body vượt giới hạn cho phép.", { secret: "never-store" }), "m10-correlation", "00000000-0000-4000-8000-000000000001");
  assert.deepEqual(values.slice(1), ["00000000-0000-4000-8000-000000000001", "BODY_LIMIT", "m10-correlation"]);
  assert.doesNotMatch(JSON.stringify(values), /never-store/);
});

test("project scope is derived only from canonical project URL", () => {
  assert.equal(projectIdFromApiUrl("http://local/api/v1/projects/00000000-0000-4000-8000-000000000001/comments"), "00000000-0000-4000-8000-000000000001");
  assert.equal(projectIdFromApiUrl("http://local/api/v1/workspaces/00000000-0000-4000-8000-000000000001"), undefined);
});

test("migration 0025 is append-only and has no historical backfill", () => {
  const sql = readFileSync(path.resolve("../../packages/database/migrations/0025_m10_security_audit_integrity.sql"), "utf8");
  assert.match(sql, /BEFORE UPDATE OR DELETE ON legal_builder\.security_rejection_event/);
  assert.doesNotMatch(sql, /UPDATE\s+legal_builder\.|INSERT\s+INTO\s+legal_builder\.security_rejection_event/i);
});

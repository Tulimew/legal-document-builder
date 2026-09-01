import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import { PostgresProductOperationsRepository } from "./product-operations-repository";

test("security diagnostics are project-scoped, redacted and development-labelled", async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const rows = [
    { queued: 0, running: 0, failed: 0, oldest_queued_at: null, available: 1, failed_verification: 0, draft_packages: 0, sealed_packages: 1 },
    { origin: 2, media_type: 1, body_limit: 3, authentication: 4, authorization: 5, other: 0, audit_integrity: true },
  ];
  const pool = { query: async (sql: string, values: unknown[]) => { calls.push({ sql, values }); return { rowCount: 1, rows: [rows[calls.length - 1]] }; } } as unknown as Pool;
  const projectId = "00000000-0000-4000-8000-000000000001";
  const oldMode = process.env.AUTH_MODE;
  const oldBypass = process.env.AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION;
  process.env.AUTH_MODE = "development";
  process.env.AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION = "true";
  try {
    const value = await new PostgresProductOperationsRepository(pool).operationalStatus(projectId, { database: "ready", migrations: "ready", storage: "ready" });
    assert.equal(value.security.identityMode, "DEVELOPMENT_ONLY");
    assert.equal(value.security.authorizationBypass, "ENABLED_DEVELOPMENT_ONLY");
    assert.equal(value.security.auditIntegrity, "ENFORCED");
    assert.equal(value.security.recentRejections.authorization, 5);
    assert.deepEqual(calls[1].values, [projectId]);
    assert.doesNotMatch(JSON.stringify(value), /storage_key|external_subject|user-agent|request.body|postgresql:\/\//i);
  } finally {
    if (oldMode === undefined) delete process.env.AUTH_MODE; else process.env.AUTH_MODE = oldMode;
    if (oldBypass === undefined) delete process.env.AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION; else process.env.AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION = oldBypass;
  }
});

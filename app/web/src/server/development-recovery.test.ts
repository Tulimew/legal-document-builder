import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { AppError } from "./errors";
import { assertDevelopmentDatabaseUrl, createRecoveryManifest, verifyRecoveryBundle } from "./development-recovery";
import { REQUIRED_MIGRATION } from "./readiness";

test("recovery guard only permits explicit _dev databases", () => {
  assert.equal(assertDevelopmentDatabaseUrl("postgresql://user:pass@localhost/legal_builder_dev", "source").pathname, "/legal_builder_dev");
  for (const value of ["postgresql://localhost/legal_builder", "postgresql://localhost/postgres", "invalid"]) {
    assert.throws(() => assertDevelopmentDatabaseUrl(value, "source"), (error) => error instanceof AppError);
  }
});

test("recovery manifest inventories dump/storage and detects corruption", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "m9-recovery-"));
  const sourceStorage = path.join(root, "source-storage");
  const bundle = path.join(root, "bundle");
  const dump = path.join(root, "source.dump");
  const fs = await import("node:fs/promises");
  await fs.mkdir(path.join(sourceStorage, "project"), { recursive: true });
  await writeFile(path.join(sourceStorage, "project", "artifact.docx"), "artifact");
  await writeFile(dump, "database-dump");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const pool = { query: async (sql: string) => sql.includes("schema_migration")
    ? { rowCount: 1, rows: [{ name: REQUIRED_MIGRATION }] }
    : { rowCount: 1, rows: [{ projects: 3, draft_versions: 4, audit_events: 5, generated_documents: 1, release_packages: 0 }] } };
  const manifest = await createRecoveryManifest({ sourceDatabaseUrl: "postgresql://user:pass@localhost/legal_builder_dev", pool: pool as never, dumpPath: dump, storageRoot: sourceStorage, bundleDirectory: bundle, now: new Date("2026-09-01T00:00:00Z") });
  assert.equal(manifest.storageFiles.length, 1);
  assert.doesNotMatch(JSON.stringify(manifest), /user:pass/);
  await verifyRecoveryBundle(bundle);
  await writeFile(path.join(bundle, "storage", "project", "artifact.docx"), "corrupt");
  await assert.rejects(() => verifyRecoveryBundle(bundle), (error) => error instanceof AppError && error.code === "INVALID_REQUEST");
});

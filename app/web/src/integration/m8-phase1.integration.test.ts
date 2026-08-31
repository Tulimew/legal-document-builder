import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

import { AppError } from "@/server/errors";
import { PostgresProductShellRepository } from "@/server/product-shell-repository";

const env = Object.fromEntries(readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env.local"), "utf8").split(/\r?\n/).filter((line) => line.includes("=")).map((line) => { const i = line.indexOf("="); return [line.slice(0, i), line.slice(i + 1)]; }));

test("M8 Phase 1 authorized project registry and dashboard use PostgreSQL", async (t) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || env.DATABASE_URL, max: 2, application_name: "legal-builder-m8-p1" });
  t.after(() => pool.end());
  assert.match((await pool.query("SELECT current_database() name")).rows[0].name, /_dev$/);
  const repository = new PostgresProductShellRepository(pool);
  const actor = { userId: env.NEXT_PUBLIC_DEVELOPMENT_USER_ID };

  await t.test("lists only projects with effective grants", async () => {
    const projects = await repository.listProjects(actor);
    assert.ok(projects.length >= 3);
    assert.ok(projects.every((item) => item.access === "MEMBERSHIP" || item.access === "DELEGATION"));
    assert.deepEqual(await repository.listProjects({ userId: "99999999-9999-4999-8999-999999999999" }), []);
  });

  await t.test("dashboard counts match project-scoped source rows", async () => {
    const projectId = env.NEXT_PUBLIC_SAMPLE_PROJECT_ID;
    const dashboard = await repository.dashboard(actor, projectId);
    const expected = await pool.query(`SELECT
      (SELECT count(*) FROM legal_builder.comment WHERE project_id=$1) comments,
      (SELECT count(*) FROM legal_builder.draft_branch WHERE project_id=$1 AND status='ACTIVE') branches,
      (SELECT count(*) FROM legal_builder.generated_document WHERE project_id=$1 AND status_code='AVAILABLE') artifacts`, [projectId]);
    assert.equal(dashboard.counts.totalComments, Number(expected.rows[0].comments));
    assert.equal(dashboard.counts.activeBranches, Number(expected.rows[0].branches));
    assert.equal(dashboard.counts.availableArtifacts, Number(expected.rows[0].artifacts));
    assert.ok(dashboard.recentVersions.every((version, index, items) => index === 0 || version.sealedAt <= items[index - 1].sealedAt));
  });

  await t.test("cross-project and unknown actors receive no dashboard", async () => {
    await assert.rejects(
      () => repository.dashboard({ userId: "99999999-9999-4999-8999-999999999999" }, env.NEXT_PUBLIC_SAMPLE_PROJECT_ID),
      (error) => error instanceof AppError && error.code === "FORBIDDEN",
    );
  });

  await t.test("home page has no mock-data or localStorage business fallback", () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    for (const file of ["src/app/page.tsx", "src/components/product-shell/project-home.tsx"]) {
      const source = readFileSync(path.join(root, file), "utf8");
      assert.doesNotMatch(source, /mock-data|localStorage|prototype-store/);
    }
  });
});

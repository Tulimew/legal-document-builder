import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import { authorizeProject, canonicalPermissionMatrix } from "./authorization";
import { AppError } from "./errors";

const userId="00000000-0000-4000-8000-000000000101";
const projectId="00000000-0000-4000-8000-000000000001";

test("từ chối khi không có role hoặc delegation hợp lệ",async()=>{
  const pool={query:async()=>({rowCount:0,rows:[]})} as unknown as Pool;
  await assert.rejects(()=>authorizeProject(pool,{userId},projectId,"COMMENT_READ"),(error:unknown)=>error instanceof AppError&&error.code==="FORBIDDEN");
});

test("trả membership và delegation do server xác định",async()=>{
  const pool={query:async()=>({rowCount:1,rows:[{membership_id:"00000000-0000-4000-8000-000000000201",delegation_id:"00000000-0000-4000-8000-000000000301",person_id:null}]})} as unknown as Pool;
  const actor=await authorizeProject(pool,{userId},projectId,"COMMENT_RESOLVE");
  assert.equal(actor.projectMembershipId,"00000000-0000-4000-8000-000000000201");
  assert.equal(actor.delegationId,"00000000-0000-4000-8000-000000000301");
});

test("canonical API permission matrix is explicit and machine-testable", () => {
  assert.equal(canonicalPermissionMatrix["workspace:save"], "WORKSPACE_EDIT");
  assert.equal(canonicalPermissionMatrix["merge:complete"], "DRAFT_MERGE_COMPLETE");
  assert.equal(canonicalPermissionMatrix["release:seal"], "RELEASE_PACKAGE_SEAL");
  assert.ok(Object.keys(canonicalPermissionMatrix).length >= 15);
});

test("authorization query rejects unknown, expired, cross-project and insufficient actors", async () => {
  let sql = "";
  let parameters: unknown[] = [];
  const pool = { query: async (query: string, values: unknown[]) => { sql = query; parameters = values; return { rowCount: 0, rows: [] }; } } as unknown as Pool;
  await assert.rejects(() => authorizeProject(pool, { userId }, projectId, "WORKSPACE_EDIT"), (error: unknown) => error instanceof AppError && error.code === "FORBIDDEN");
  assert.deepEqual(parameters, [projectId, userId, "WORKSPACE_EDIT"]);
  assert.match(sql, /m\.project_id = \$1 AND m\.user_id = \$2/);
  assert.match(sql, /m\.valid_until IS NULL OR m\.valid_until > clock_timestamp\(\)/);
  assert.match(sql, /u\.status_code = 'ACTIVE'/);
  assert.match(sql, /rp\.permission_code = \$3/);
  assert.match(sql, /d\.valid_until > clock_timestamp\(\)/);
});

test("authorization bypass is development-only", async () => {
  const oldMode = process.env.AUTH_MODE;
  const oldBypass = process.env.AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION;
  const pool = { query: async () => ({ rowCount: 0, rows: [] }) } as unknown as Pool;
  try {
    process.env.AUTH_MODE = "production";
    process.env.AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION = "true";
    await assert.rejects(() => authorizeProject(pool, { userId }, projectId, "COMMENT_READ"), (error: unknown) => error instanceof AppError && error.code === "FORBIDDEN");
    process.env.AUTH_MODE = "development";
    assert.equal((await authorizeProject(pool, { userId }, projectId, "COMMENT_READ")).userId, userId);
  } finally {
    if (oldMode === undefined) delete process.env.AUTH_MODE; else process.env.AUTH_MODE = oldMode;
    if (oldBypass === undefined) delete process.env.AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION; else process.env.AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION = oldBypass;
  }
});

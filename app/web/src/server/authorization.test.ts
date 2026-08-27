import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import { authorizeProject } from "./authorization";
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

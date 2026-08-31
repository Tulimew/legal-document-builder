import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { PostgresProductShellRepository } from "@/server/product-shell-repository";
import { PostgresWorkflowRepository } from "@/server/workflow-repository";

const env=Object.fromEntries(readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../.env.local"),"utf8").split(/\r?\n/).filter(line=>line.includes("=")).map(line=>{const i=line.indexOf("=");return[line.slice(0,i),line.slice(i+1)]}));

test("M8 Phase 3 canonical workflow and review are persistent",async t=>{
 const pool=new Pool({connectionString:process.env.DATABASE_URL||env.DATABASE_URL,max:2,application_name:"legal-builder-m8-p3"});t.after(()=>pool.end());
 const projectId=env.NEXT_PUBLIC_SAMPLE_PROJECT_ID,actor={userId:env.NEXT_PUBLIC_DEVELOPMENT_USER_ID};
 await t.test("dashboard resolves real workspace and open review round",async()=>{const dashboard=await new PostgresProductShellRepository(pool).dashboard(actor,projectId);assert.ok(dashboard.context.workspaceId);assert.ok(dashboard.context.reviewRound);const evidence=await pool.query("SELECT source_draft_version_id,closed_at FROM legal_builder.review_round WHERE id=$1 AND project_id=$2",[dashboard.context.reviewRound!.id,projectId]);assert.equal(evidence.rowCount,1);assert.equal(evidence.rows[0].closed_at,null);assert.equal(evidence.rows[0].source_draft_version_id,dashboard.context.reviewRound!.sourceDraftVersionId)});
 await t.test("workflow configuration comes from assigned PostgreSQL version",async()=>{const value=await new PostgresWorkflowRepository(pool).configuration(projectId),rows=await pool.query("SELECT stage_code FROM legal_builder.workflow_stage_definition WHERE workflow_version_id=$1 ORDER BY stage_order,stage_code",[value.workflowVersionId]);assert.deepEqual(value.stages.map(item=>item.code),rows.rows.map(item=>item.stage_code));assert.ok(value.stages.length>=4)});
 await t.test("canonical workbenches have no prototype business fallback",()=>{const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../.."),files=["src/components/workflow/workflow-workbench.tsx","src/components/review/project-review-workbench.tsx","src/app/projects/[projectId]/workflow/page.tsx","src/app/projects/[projectId]/review/page.tsx"];for(const file of files){const source=readFileSync(path.join(root,file),"utf8");assert.doesNotMatch(source,/mock-data|prototype-store|localStorage|developmentProject|NEXT_PUBLIC_SAMPLE/)}});
});

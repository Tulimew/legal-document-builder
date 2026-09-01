import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { runDeploymentPreflight } from "@/server/deployment-preflight";

test("M11 production preflight cannot query dependencies or trust development identity",async()=>{
 let queries=0;
 const result=await runDeploymentPreflight({NODE_ENV:"production",APP_ENV:"production",AUTH_MODE:"development",AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION:"true",HTTP_ALLOWED_ORIGINS:"https://legal.example.test",DATABASE_URL:"postgresql://user:secret@db/internal",PUBLISHING_STORAGE_ROOT:path.resolve("private-storage")} as NodeJS.ProcessEnv,{query:async()=>{queries++;return{rowCount:1,rows:[]}}} as never,{checkReady:async()=>undefined} as never);
 assert.equal(result.status,"BLOCKED");assert.equal(queries,0);assert.doesNotMatch(JSON.stringify(result),/secret|private-storage|postgresql:\/\//);
});

test("M11 release tooling excludes environment files and declares provider gaps",()=>{
 const packageSource=readFileSync(path.resolve("scripts/package-release.ts"),"utf8"),manifestSource=readFileSync(path.resolve("src/server/release-manifest.ts"),"utf8"),runbook=readFileSync(path.resolve("../../docs/18-m11/M11-DEPLOYMENT-RUNBOOK.md"),"utf8");
 assert.match(packageSource,/assertSafeReleaseEntry/);assert.doesNotMatch(packageSource,/cp\([^\n]*\.env/);
 assert.match(manifestSource,/productionIdentity:(?:false|true),productionStorage:(?:false|true)/);
 assert.match(runbook,/Database migrations are not automatically reversed/);
});

import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { runDeploymentPreflight } from "./deployment-preflight";
import { createReleaseManifest } from "./release-manifest";

const storage={checkReady:async()=>undefined,write:async()=>{throw new Error()},read:async()=>{throw new Error()},verify:async()=>false} as never;

test("production preflight is read-only, blocked and redacted before provider selection",async()=>{
  let queries=0;const pool={query:async()=>{queries++;return{rowCount:1,rows:[{}]}}};
  const result=await runDeploymentPreflight({NODE_ENV:"production",APP_ENV:"production",AUTH_MODE:"development",AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION:"true",DATABASE_URL:"postgresql://user:secret@db/internal"} as NodeJS.ProcessEnv,pool as never,storage);
  assert.equal(result.status,"BLOCKED");assert.equal(queries,0);assert.doesNotMatch(JSON.stringify(result),/secret|postgresql:\/\//);
});

test("development RC preflight verifies migration and storage",async()=>{
  const result=await runDeploymentPreflight({NODE_ENV:"test",APP_ENV:"test",DATABASE_URL:"postgresql://user:secret@localhost/db",AUTH_MODE:"development",AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION:"false",PUBLISHING_STORAGE_ROOT:path.resolve(".preflight-test")} as NodeJS.ProcessEnv,{query:async()=>({rowCount:1,rows:[{}]})} as never,storage);
  assert.equal(result.status,"READY_FOR_DEVELOPMENT_RC");assert.doesNotMatch(JSON.stringify(result),/secret|preflight-test/);
});

test("approved production preflight verifies real dependencies",async()=>{
  let queries=0;
  const result=await runDeploymentPreflight({NODE_ENV:"production",APP_ENV:"production",DATABASE_URL:"postgresql://user:secret@postgres/db",AUTH_MODE:"local",AUTH_SESSION_SECRET:"a-production-like-secret-with-32-characters",AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION:"false",HTTP_ALLOWED_ORIGINS:"https://legal-builder.example.invalid",PUBLISHING_STORAGE_ROOT:path.resolve(".preflight-test")} as NodeJS.ProcessEnv,{query:async()=>{queries++;return{rowCount:1,rows:[{}]}}} as never,storage);
  assert.equal(result.status,"READY_FOR_PRODUCTION");assert.equal(queries,2);assert.doesNotMatch(JSON.stringify(result),/secret|postgresql:\/\//);
});

test("release manifest permits only redacted build identity",()=>{
  const value=createReleaseManifest({sourceCommit:"0829a642ce6031cae412722139fe4dfb7fbf646e",migrationHead:"0025_m10_security_audit_integrity.sql",nodeVersion:"v24.19.0",nextVersion:"16.3.2"});
  assert.equal(value.capabilities.productionIdentity,true);
  assert.equal(value.capabilities.productionStorage,true);
  assert.throws(()=>createReleaseManifest({sourceCommit:"0829a64",migrationHead:"0025_m10_security_audit_integrity.sql",nodeVersion:"postgresql://user:secret@db/x",nextVersion:"16.3.2"}));
});

import assert from "node:assert/strict";
import test from "node:test";
import { assertSafeReleaseEntry, releaseInventory } from "./release-package";

test("release package rejects secret names, database URLs and private keys",()=>{
 for(const name of[".env","config/.env.local","secret.txt","database.dump"])assert.throws(()=>assertSafeReleaseEntry(name));
 assert.throws(()=>assertSafeReleaseEntry("config.json",'{"database":"postgresql://user:secret@db/internal"}'));
 assert.throws(()=>assertSafeReleaseEntry("key.txt","-----BEGIN PRIVATE KEY-----"));
});
test("web and worker inventory share one immutable source commit",()=>{const value=releaseInventory("0829a642ce6031cae412722139fe4dfb7fbf646e");assert.equal(value.sourceCommit.length,40);assert.deepEqual(value.components,["web-standalone","publishing-worker-source","database-migrations","runtime-manifest"])});

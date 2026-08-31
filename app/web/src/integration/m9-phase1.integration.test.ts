import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const envText = readFileSync(path.resolve(".env.local"), "utf8");
const localEnv = Object.fromEntries(envText.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#") && line.includes("="))
  .map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")]; }));

test("M9 Phase 1 liveness is independent and readiness verifies real dependencies", async (t) => {
  const previous = {
    databaseUrl: process.env.DATABASE_URL,
    authMode: process.env.AUTH_MODE,
    storageRoot: process.env.PUBLISHING_STORAGE_ROOT,
  };
  process.env.DATABASE_URL ||= localEnv.DATABASE_URL;
  process.env.AUTH_MODE = "development";
  process.env.PUBLISHING_STORAGE_ROOT = await mkdtemp(path.join(tmpdir(), "legal-builder-m9-ready-"));
  t.after(async () => {
    if (globalThis.legalBuilderPool) {
      await globalThis.legalBuilderPool.end();
      globalThis.legalBuilderPool = undefined;
    }
    const fs = await import("node:fs/promises");
    await fs.rm(process.env.PUBLISHING_STORAGE_ROOT!, { recursive: true, force: true });
    if (previous.databaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous.databaseUrl;
    if (previous.authMode === undefined) delete process.env.AUTH_MODE;
    else process.env.AUTH_MODE = previous.authMode;
    if (previous.storageRoot === undefined) delete process.env.PUBLISHING_STORAGE_ROOT;
    else process.env.PUBLISHING_STORAGE_ROOT = previous.storageRoot;
  });

  const health = await (await import("@/app/api/v1/health/route")).GET(new Request("http://local/api/v1/health"));
  assert.equal(health.status, 200);
  assert.equal((await health.json()).data.status, "alive");

  const readiness = await (await import("@/app/api/v1/readiness/route")).GET(new Request("http://local/api/v1/readiness"));
  assert.equal(readiness.status, 200);
  const body = await readiness.json();
  assert.deepEqual(body.data.components, { database: "ready", migrations: "ready", storage: "ready" });
  const rendered = JSON.stringify(body);
  assert.doesNotMatch(rendered, /DATABASE_URL|PUBLISHING_STORAGE_ROOT|postgresql:\/\/|storage_key/i);
});

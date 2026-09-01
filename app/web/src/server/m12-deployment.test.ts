import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(process.cwd(), "../..");

test("M12 Synology compose keeps database private and mounts governed persistence", async () => {
  const compose = await readFile(path.join(root, "deploy/synology/compose.yaml"), "utf8");
  assert.match(compose, /postgres:18-bookworm/);
  assert.doesNotMatch(compose, /5432:5432/);
  assert.match(compose, /192\.168\.1\.178:13108:3000/);
  assert.doesNotMatch(compose, /0\.0\.0\.0:13108:3000/);
  assert.match(compose, /data\/postgres/);
  assert.match(compose, /data\/publishing/);
  assert.match(compose, /condition: service_completed_successfully/);
});

test("M12 deploy files contain no deployed secret and require external protected config", async () => {
  for (const name of ["compose.yaml", "runtime.env.example", "postgres.env.example", "README.md", "deploy.sh", "backup.sh", "verify-backup.sh"]) {
    const content = await readFile(path.join(root, "deploy/synology", name), "utf8");
    assert.doesNotMatch(content, /postgresql:\/\/[^:/\s]+:[^@\s]+@(?:192\.168|localhost)/i);
    assert.doesNotMatch(content, /-----BEGIN .*PRIVATE KEY-----/);
  }
  const compose = await readFile(path.join(root, "deploy/synology/compose.yaml"), "utf8");
  assert.match(compose, /\/volume1\/docker\/legal-document-builder\/config\/runtime\.env/);
});

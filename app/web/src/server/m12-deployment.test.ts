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
  assert.match(compose, /backend:\s+driver: bridge/);
  assert.doesNotMatch(compose, /internal: true/);
});

test("M12 deploy files contain no deployed secret and require external protected config", async () => {
  for (const name of ["compose.yaml", "runtime.env.example", "postgres.env.example", "offsite-backup.env.example", "README.md", "deploy.sh", "backup.sh", "verify-backup.sh", "backup-offsite-google-drive.sh", "verify-offsite-backup.sh"]) {
    const content = await readFile(path.join(root, "deploy/synology", name), "utf8");
    assert.doesNotMatch(content, /postgresql:\/\/[^:/\s]+:[^@\s]+@(?:192\.168|localhost)/i);
    assert.doesNotMatch(content, /-----BEGIN .*PRIVATE KEY-----/);
  }
  const compose = await readFile(path.join(root, "deploy/synology/compose.yaml"), "utf8");
  assert.match(compose, /\/volume1\/docker\/legal-document-builder\/config\/runtime\.env/);
});

test("Google Drive offsite backup is encrypted, append-only and independently verifiable", async () => {
  const upload = await readFile(path.join(root, "deploy/synology/backup-offsite-google-drive.sh"), "utf8");
  const verify = await readFile(path.join(root, "deploy/synology/verify-offsite-backup.sh"), "utf8");

  assert.match(upload, /remote_type.*crypt/);
  assert.match(upload, /sha256sum -c SHA256SUMS/);
  assert.match(upload, /rclone copy/);
  assert.match(upload, /--immutable/);
  assert.match(upload, /rclone check/);
  assert.match(upload, /--download/);
  assert.doesNotMatch(upload, /rclone (?:sync|delete|purge)/);
  assert.doesNotMatch(verify, /rclone (?:sync|delete|purge)/);
  assert.match(verify, /mktemp -d/);
  assert.match(verify, /sha256sum -c SHA256SUMS/);
});

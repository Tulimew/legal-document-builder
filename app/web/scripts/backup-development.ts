import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Pool } from "pg";

import { assertDevelopmentDatabaseUrl, createRecoveryManifest } from "../src/server/development-recovery";

function run(executable: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { env, stdio: ["ignore", "inherit", "inherit"], windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`pg_dump thất bại với exit code ${code}`)));
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const parsed = assertDevelopmentDatabaseUrl(databaseUrl, "DATABASE_URL");
  const bundleDirectory = path.resolve(process.env.RECOVERY_BUNDLE_DIR ?? "");
  const storageRoot = path.resolve(process.env.PUBLISHING_STORAGE_ROOT ?? "");
  if (!process.env.RECOVERY_BUNDLE_DIR || !process.env.PUBLISHING_STORAGE_ROOT) throw new Error("RECOVERY_BUNDLE_DIR và PUBLISHING_STORAGE_ROOT bắt buộc.");
  const temporary = await mkdtemp(path.join(tmpdir(), "legal-builder-recovery-"));
  const dumpPath = path.join(temporary, "database.dump");
  const executable = process.env.POSTGRES_BIN_DIR ? path.join(process.env.POSTGRES_BIN_DIR, "pg_dump.exe") : "pg_dump";
  const childEnv = { ...process.env, PGHOST: parsed.hostname, PGPORT: parsed.port || "5432", PGUSER: decodeURIComponent(parsed.username), PGPASSWORD: decodeURIComponent(parsed.password), PGDATABASE: decodeURIComponent(parsed.pathname.slice(1)) };
  const pool = new Pool({ connectionString: databaseUrl, max: 1, application_name: "legal-builder-development-backup" });
  try {
    await run(executable, ["--format=custom", "--no-owner", "--no-privileges", "--file", dumpPath], childEnv);
    const manifest = await createRecoveryManifest({ sourceDatabaseUrl: databaseUrl, pool, dumpPath, storageRoot, bundleDirectory });
    process.stdout.write(`${JSON.stringify({ status: "created", bundleDirectory, migrationHead: manifest.migrationHead, storageFileCount: manifest.storageFiles.length })}\n`);
  } finally {
    await pool.end();
    await rm(temporary, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Backup failed"); process.exitCode = 1; });

import { spawn } from "node:child_process";
import { cp, lstat } from "node:fs/promises";
import path from "node:path";

import { Client, Pool } from "pg";

import { assertDevelopmentDatabaseUrl, verifyRecoveryBundle, verifyRestoredDatabase } from "../src/server/development-recovery";

function run(executable: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { env, stdio: ["ignore", "inherit", "inherit"], windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`pg_restore thất bại với exit code ${code}`)));
  });
}

async function main() {
  const targetUrl = process.env.RECOVERY_TARGET_DATABASE_URL ?? "";
  const parsed = assertDevelopmentDatabaseUrl(targetUrl, "RECOVERY_TARGET_DATABASE_URL");
  const targetDatabase = decodeURIComponent(parsed.pathname.slice(1));
  const bundleDirectory = path.resolve(process.env.RECOVERY_BUNDLE_DIR ?? "");
  const targetStorage = path.resolve(process.env.RECOVERY_TARGET_STORAGE_ROOT ?? "");
  if (!process.env.RECOVERY_BUNDLE_DIR || !process.env.RECOVERY_TARGET_STORAGE_ROOT) throw new Error("RECOVERY_BUNDLE_DIR và RECOVERY_TARGET_STORAGE_ROOT bắt buộc.");
  const manifest = await verifyRecoveryBundle(bundleDirectory);
  if (manifest.sourceDatabase === targetDatabase) throw new Error("Target database phải khác source database.");
  try { await lstat(targetStorage); throw new Error("RECOVERY_TARGET_STORAGE_ROOT phải chưa tồn tại."); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const adminUrl = new URL(targetUrl); adminUrl.pathname = "/postgres";
  const admin = new Client({ connectionString: adminUrl.toString(), application_name: "legal-builder-development-restore-admin" });
  await admin.connect();
  try {
    if ((await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [targetDatabase])).rowCount) throw new Error("Target database đã tồn tại; không ghi đè.");
    await admin.query(`CREATE DATABASE "${targetDatabase}"`);
  } finally { await admin.end(); }
  const executable = process.env.POSTGRES_BIN_DIR ? path.join(process.env.POSTGRES_BIN_DIR, "pg_restore.exe") : "pg_restore";
  const childEnv = { ...process.env, PGHOST: parsed.hostname, PGPORT: parsed.port || "5432", PGUSER: decodeURIComponent(parsed.username), PGPASSWORD: decodeURIComponent(parsed.password), PGDATABASE: targetDatabase };
  await run(executable, ["--dbname", targetDatabase, "--no-owner", "--no-privileges", "--exit-on-error", path.join(bundleDirectory, "database.dump")], childEnv);
  await cp(path.join(bundleDirectory, "storage"), targetStorage, { recursive: true, errorOnExist: true, force: false });
  const pool = new Pool({ connectionString: targetUrl, max: 1, application_name: "legal-builder-development-restore-verify" });
  try { await verifyRestoredDatabase(pool, manifest); } finally { await pool.end(); }
  process.stdout.write(`${JSON.stringify({ status: "verified", targetDatabase, migrationHead: manifest.migrationHead })}\n`);
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Restore failed"); process.exitCode = 1; });

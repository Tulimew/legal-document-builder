import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Pool } from "pg";

import { AppError } from "./errors";
import { REQUIRED_MIGRATION } from "./readiness";

export type RecoveryFile = { path: string; byteSize: number; checksumSha256: string };
export type RecoveryManifest = {
  formatVersion: 1;
  classification: "DEVELOPMENT_RECOVERY_DRILL_ONLY";
  createdAt: string;
  sourceDatabase: string;
  migrationHead: string;
  databaseDump: RecoveryFile;
  storageFiles: RecoveryFile[];
  coreCounts: Record<string, number>;
};

const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export function assertDevelopmentDatabaseUrl(connectionString: string, label: string): URL {
  let parsed: URL;
  try { parsed = new URL(connectionString); } catch { throw new AppError("CONFIGURATION_INVALID", `${label} không hợp lệ.`); }
  const database = decodeURIComponent(parsed.pathname.slice(1));
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !/^[a-zA-Z0-9_]+_dev$/.test(database)) {
    throw new AppError("CONFIGURATION_INVALID", `${label} chỉ được trỏ tới database _dev.`);
  }
  return parsed;
}

async function inventory(root: string, current = root): Promise<RecoveryFile[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const result: RecoveryFile[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolute = path.join(current, entry.name);
    if (entry.isSymbolicLink()) throw new AppError("CONFIGURATION_INVALID", "Storage snapshot không cho phép symbolic link.");
    if (entry.isDirectory()) result.push(...await inventory(root, absolute));
    else if (entry.isFile()) {
      const bytes = await readFile(absolute);
      result.push({ path: path.relative(root, absolute).split(path.sep).join("/"), byteSize: bytes.byteLength, checksumSha256: digest(bytes) });
    }
  }
  return result;
}

export async function databaseRecoveryEvidence(pool: Pick<Pool, "query">): Promise<{ migrationHead: string; coreCounts: Record<string, number> }> {
  const migration = await pool.query("SELECT name FROM public.legal_builder_schema_migration ORDER BY applied_at DESC,name DESC LIMIT 1");
  if (!migration.rowCount || migration.rows[0].name !== REQUIRED_MIGRATION) {
    throw new AppError("DATABASE_UNAVAILABLE", "Database chưa ở migration head bắt buộc.");
  }
  const counts = await pool.query(`SELECT
    (SELECT count(*)::int FROM legal_builder.legal_document_project) projects,
    (SELECT count(*)::int FROM legal_builder.draft_version) draft_versions,
    (SELECT count(*)::int FROM legal_builder.audit_event) audit_events,
    (SELECT count(*)::int FROM legal_builder.generated_document) generated_documents,
    (SELECT count(*)::int FROM legal_builder.release_package) release_packages`);
  return { migrationHead: migration.rows[0].name, coreCounts: counts.rows[0] };
}

export async function createRecoveryManifest(input: {
  sourceDatabaseUrl: string;
  pool: Pick<Pool, "query">;
  dumpPath: string;
  storageRoot: string;
  bundleDirectory: string;
  now?: Date;
}): Promise<RecoveryManifest> {
  const source = assertDevelopmentDatabaseUrl(input.sourceDatabaseUrl, "DATABASE_URL");
  const dumpBytes = await readFile(input.dumpPath);
  const storageFiles = await inventory(input.storageRoot);
  const evidence = await databaseRecoveryEvidence(input.pool);
  const storageTarget = path.join(input.bundleDirectory, "storage");
  await mkdir(input.bundleDirectory, { recursive: true });
  await cp(input.storageRoot, storageTarget, { recursive: true, errorOnExist: true, force: false });
  const dumpTarget = path.join(input.bundleDirectory, "database.dump");
  if (path.resolve(input.dumpPath) !== path.resolve(dumpTarget)) await cp(input.dumpPath, dumpTarget, { errorOnExist: true, force: false });
  const manifest: RecoveryManifest = {
    formatVersion: 1,
    classification: "DEVELOPMENT_RECOVERY_DRILL_ONLY",
    createdAt: (input.now ?? new Date()).toISOString(),
    sourceDatabase: decodeURIComponent(source.pathname.slice(1)),
    migrationHead: evidence.migrationHead,
    databaseDump: { path: "database.dump", byteSize: dumpBytes.byteLength, checksumSha256: digest(dumpBytes) },
    storageFiles,
    coreCounts: evidence.coreCounts,
  };
  await writeFile(path.join(input.bundleDirectory, "recovery-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return manifest;
}

export async function verifyRecoveryBundle(bundleDirectory: string): Promise<RecoveryManifest> {
  const manifest = JSON.parse(await readFile(path.join(bundleDirectory, "recovery-manifest.json"), "utf8")) as RecoveryManifest;
  if (manifest.formatVersion !== 1 || manifest.classification !== "DEVELOPMENT_RECOVERY_DRILL_ONLY") {
    throw new AppError("INVALID_REQUEST", "Recovery manifest không được hỗ trợ.");
  }
  for (const item of [manifest.databaseDump, ...manifest.storageFiles]) {
    const base = item === manifest.databaseDump ? bundleDirectory : path.join(bundleDirectory, "storage");
    const absolute = path.resolve(base, ...item.path.split("/"));
    if (!absolute.startsWith(`${path.resolve(base)}${path.sep}`)) throw new AppError("INVALID_REQUEST", "Recovery manifest có path không an toàn.");
    const bytes = await readFile(absolute);
    if (bytes.byteLength !== item.byteSize || digest(bytes) !== item.checksumSha256) {
      throw new AppError("INVALID_REQUEST", `Recovery file không khớp checksum: ${item.path}`);
    }
  }
  return manifest;
}

export async function verifyRestoredDatabase(pool: Pick<Pool, "query">, manifest: RecoveryManifest): Promise<void> {
  const evidence = await databaseRecoveryEvidence(pool);
  if (evidence.migrationHead !== manifest.migrationHead || JSON.stringify(evidence.coreCounts) !== JSON.stringify(manifest.coreCounts)) {
    throw new AppError("INVALID_REQUEST", "Database phục hồi không khớp migration/core counts trong manifest.");
  }
  const artifacts = await pool.query("SELECT storage_key,byte_size,checksum_sha256 FROM legal_builder.generated_document ORDER BY storage_key");
  const inventoryByPath = new Map(manifest.storageFiles.map((item) => [item.path, item]));
  for (const artifact of artifacts.rows) {
    const item = inventoryByPath.get(String(artifact.storage_key));
    if (!item || item.byteSize !== Number(artifact.byte_size) || item.checksumSha256 !== String(artifact.checksum_sha256).trim()) {
      throw new AppError("INVALID_REQUEST", "Artifact lineage/storage inventory không khớp sau phục hồi.");
    }
  }
}

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL chưa được cấu hình.");

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.resolve(scriptDirectory, "../../../packages/database/migrations");
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((name) => /^\d{4}_.+\.sql$/.test(name) && !name.includes("test_fixture"))
  .sort();

const client = new Client({ connectionString, application_name: "legal-document-builder-migrator" });
await client.connect();
try {
  await client.query("SELECT pg_advisory_lock($1)", [823_041_105]);
  await client.query(`CREATE TABLE IF NOT EXISTS public.legal_builder_schema_migration (
    name text PRIMARY KEY,
    checksum_sha256 char(64) NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
  )`);

  for (const name of migrationFiles) {
    const sql = await readFile(path.join(migrationsDirectory, name), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await client.query(
      "SELECT checksum_sha256 FROM public.legal_builder_schema_migration WHERE name = $1",
      [name],
    );
    if (existing.rowCount) {
      if (existing.rows[0].checksum_sha256.trim() !== checksum) {
        throw new Error(`Migration đã bị thay đổi sau khi áp dụng: ${name}`);
      }
      console.log(`skip ${name}`);
      continue;
    }

    await client.query("BEGIN");
    try {
      await client.query(sql.replace(/^\s*BEGIN;\s*/i, "").replace(/\s*COMMIT;\s*$/i, ""));
      await client.query(
        "INSERT INTO public.legal_builder_schema_migration(name, checksum_sha256) VALUES ($1, $2)",
        [name, checksum],
      );
      await client.query("COMMIT");
      console.log(`applied ${name}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.query("SELECT pg_advisory_unlock($1)", [823_041_105]).catch(() => undefined);
  await client.end();
}

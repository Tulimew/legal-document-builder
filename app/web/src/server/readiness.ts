import type { Pool } from "pg";

import { AppError } from "./errors";
import type { StoragePort } from "./storage-port";

export const REQUIRED_MIGRATION = "0026_m12_local_identity.sql";

export type ReadinessResult = {
  status: "ready";
  components: { database: "ready"; migrations: "ready"; storage: "ready" };
};

export async function checkReadiness(pool: Pick<Pool, "query">, storage: StoragePort): Promise<ReadinessResult> {
  await pool.query("SELECT 1");
  const migration = await pool.query(
    "SELECT 1 FROM public.legal_builder_schema_migration WHERE name=$1 LIMIT 1",
    [REQUIRED_MIGRATION],
  );
  if (!migration.rowCount) throw new AppError("DATABASE_UNAVAILABLE", "Database chưa có migration bắt buộc.");
  await storage.checkReady();
  return { status: "ready", components: { database: "ready", migrations: "ready", storage: "ready" } };
}

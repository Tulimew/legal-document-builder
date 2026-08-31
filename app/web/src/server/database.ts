import { Pool, type PoolClient, type PoolConfig } from "pg";

import { readDatabaseRuntimeConfig } from "./runtime-config";

declare global {
  var legalBuilderPool: Pool | undefined;
}

function poolConfig(): PoolConfig {
  const config = readDatabaseRuntimeConfig();
  return {
    connectionString: config.connectionString,
    max: config.poolMax,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    application_name: "legal-document-builder-web",
  };
}

export function databasePool(): Pool {
  if (!globalThis.legalBuilderPool) globalThis.legalBuilderPool = new Pool(poolConfig());
  return globalThis.legalBuilderPool;
}

export async function inTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

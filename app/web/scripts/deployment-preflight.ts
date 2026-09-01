import { Pool } from "pg";

import { runDeploymentPreflight } from "../src/server/deployment-preflight";
import { FilesystemStorageAdapter } from "../src/server/filesystem-storage-adapter";
import { readDatabaseRuntimeConfig, readStorageRuntimeConfig } from "../src/server/runtime-config";

async function main() {
  if (process.env.APP_ENV === "production") {
    const result = await runDeploymentPreflight(process.env, { query: async () => ({ rowCount: 0, rows: [], command: "", oid: 0, fields: [] }) }, { checkReady: async()=>undefined, write:async()=>{throw new Error("unavailable")},read:async()=>{throw new Error("unavailable")},verify:async()=>false } as never);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return 2;
  }
  const database = readDatabaseRuntimeConfig();
  const storage = new FilesystemStorageAdapter(readStorageRuntimeConfig().root);
  const pool = new Pool({ connectionString: database.connectionString, max: 1, application_name: "legal-document-builder-preflight" });
  try {
    const result = await runDeploymentPreflight(process.env, pool, storage);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result.status === "READY_FOR_DEVELOPMENT_RC" ? 0 : 2;
  } finally { await pool.end(); }
}

main().then((code)=>{process.exitCode=code}).catch(()=>{process.stdout.write('{"status":"BLOCKED","blockers":["PREFLIGHT_FAILED"]}\n');process.exitCode=2});

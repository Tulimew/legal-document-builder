import { randomUUID } from "node:crypto";

import { Pool } from "pg";

import { FilesystemStorageAdapter } from "../src/server/filesystem-storage-adapter";
import { checkReadiness } from "../src/server/readiness";
import { readRuntimeConfig } from "../src/server/runtime-config";
import { PublishingWorker } from "../src/server/publishing-worker";
import { runPublishingWorkerLoop } from "../src/server/publishing-worker-runner";

const controller = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => controller.abort());

function log(event: Record<string, unknown>) {
  process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), ...event })}\n`);
}

async function main(): Promise<number> {
  const config = readRuntimeConfig();
  const pool = new Pool({
    connectionString: config.database.connectionString,
    max: config.database.poolMax,
    application_name: "legal-document-builder-publishing-worker",
  });
  const storage = new FilesystemStorageAdapter(config.storage.root);
  try {
    await checkReadiness(pool, storage);
    const worker = new PublishingWorker(pool, storage, `publishing-${process.pid}-${randomUUID()}`);
    return await runPublishingWorkerLoop(worker, { ...config.worker, signal: controller.signal, log });
  } finally {
    await pool.end();
  }
}

main().then((exitCode) => { process.exitCode = exitCode; }).catch((error: unknown) => {
  log({ event: "publishing_worker_startup_failed", message: error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]") : "Startup failed" });
  process.exitCode = 1;
});

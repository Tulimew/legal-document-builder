import type { Pool } from "pg";

import { checkReadiness } from "./readiness";
import { assessProductionConfiguration, publicRuntimeSummary, readRuntimeConfig } from "./runtime-config";
import type { StoragePort } from "./storage-port";

export type DeploymentPreflightResult =
  | { status: "READY_FOR_DEVELOPMENT_RC"; configuration: ReturnType<typeof publicRuntimeSummary>; dependencies: Awaited<ReturnType<typeof checkReadiness>>["components"] }
  | { status: "BLOCKED"; blockers: string[] };

export async function runDeploymentPreflight(env: NodeJS.ProcessEnv, pool: Pick<Pool, "query">, storage: StoragePort): Promise<DeploymentPreflightResult> {
  if (env.APP_ENV === "production") return { status: "BLOCKED", blockers: assessProductionConfiguration(env).blockers };
  try {
    const config = readRuntimeConfig(env);
    const readiness = await checkReadiness(pool, storage);
    return { status: "READY_FOR_DEVELOPMENT_RC", configuration: publicRuntimeSummary(config), dependencies: readiness.components };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "PREFLIGHT_FAILED";
    return { status: "BLOCKED", blockers: [code] };
  }
}

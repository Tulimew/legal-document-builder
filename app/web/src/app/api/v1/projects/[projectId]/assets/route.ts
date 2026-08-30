import { authorizeProject } from "@/server/authorization";
import { PostgresAssetRepository } from "@/server/asset-repository";
import { databasePool } from "@/server/database";
import { correlationId, failure, success } from "@/server/http";
import { authenticate } from "@/server/identity";
import { assertUuid } from "@/server/validation/workspace";

export const runtime = "nodejs";
type Context = RouteContext<"/api/v1/projects/[projectId]/assets">;
export async function GET(request: Request, context: Context) {
  const cid = correlationId(request);
  try {
    const { projectId } = await context.params; assertUuid(projectId, "projectId");
    const pool = databasePool(); await authorizeProject(pool, authenticate(request.headers), projectId, "WORKSPACE_READ");
    return success(await new PostgresAssetRepository(pool).listAvailable(projectId), 200, cid);
  } catch (error) { return failure(error, cid); }
}

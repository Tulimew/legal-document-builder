import { PostgresAmendmentRepository } from "@/server/amendment-repository";
import { authorizeProject } from "@/server/authorization";
import { databasePool } from "@/server/database";
import { AppError } from "@/server/errors";
import { correlationId, failure, success } from "@/server/http";
import { authenticate } from "@/server/identity";
import { parseCreateAmendmentOperation } from "@/server/validation/amendment";
import { assertUuid } from "@/server/validation/workspace";

export const runtime = "nodejs";
type Context = RouteContext<"/api/v1/projects/[projectId]/amendment-operations">;

export async function GET(request: Request, context: Context) {
  const cid = correlationId(request);
  try {
    const { projectId } = await context.params;
    assertUuid(projectId, "projectId");
    const nodeId = new URL(request.url).searchParams.get("draftLegalNodeId");
    if (!nodeId) throw new AppError("INVALID_REQUEST", "Thiếu draftLegalNodeId.");
    assertUuid(nodeId, "draftLegalNodeId");
    const pool = databasePool();
    await authorizeProject(pool, authenticate(request.headers), projectId, "AMENDMENT_TARGET_READ");
    return success(await new PostgresAmendmentRepository(pool).listOperations(projectId, nodeId), 200, cid);
  } catch (error) { return failure(error, cid); }
}

export async function POST(request: Request, context: Context) {
  const cid = correlationId(request);
  try {
    const { projectId } = await context.params;
    assertUuid(projectId, "projectId");
    const pool = databasePool();
    const actor = await authorizeProject(pool, authenticate(request.headers), projectId, "AMENDMENT_TARGET_MANAGE");
    let body: unknown;
    try { body = await request.json(); } catch { throw new AppError("INVALID_REQUEST", "Request body không phải JSON hợp lệ."); }
    return success(await new PostgresAmendmentRepository(pool).createOperation(projectId, parseCreateAmendmentOperation(body), actor), 201, cid);
  } catch (error) { return failure(error, cid); }
}

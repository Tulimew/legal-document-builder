import { authorizeProject } from "@/server/authorization";
import { databasePool } from "@/server/database";
import { AppError } from "@/server/errors";
import { correlationId, failure, success } from "@/server/http";
import { authenticate } from "@/server/identity";
import { parseAssignWorkflow } from "@/server/validation/workflow";
import { assertUuid } from "@/server/validation/workspace";
import { PostgresWorkflowRepository } from "@/server/workflow-repository";

export const runtime = "nodejs";
type Context = RouteContext<"/api/v1/projects/[projectId]/workflow">;

export async function GET(request: Request, context: Context) {
  const cid = correlationId(request);
  try {
    const { projectId } = await context.params;
    assertUuid(projectId, "projectId");
    const pool = databasePool();
    await authorizeProject(pool, authenticate(request.headers), projectId, "WORKFLOW_READ");
    return success(await new PostgresWorkflowRepository(pool).configuration(projectId), 200, cid);
  } catch (error) {
    return failure(error, cid);
  }
}

export async function PUT(request: Request, context: Context) {
  let cid = correlationId(request);
  try {
    const identity = authenticate(request.headers);
    const { projectId } = await context.params;
    assertUuid(projectId, "projectId");
    const pool = databasePool();
    const actor = await authorizeProject(pool, identity, projectId, "WORKFLOW_MANAGE");
    let body: unknown;
    try { body = await request.json(); } catch { throw new AppError("INVALID_REQUEST", "Request body không phải JSON hợp lệ."); }
    const parsed = parseAssignWorkflow(body);
    cid = parsed.correlationId;
    return success(await new PostgresWorkflowRepository(pool).assign(projectId, parsed, actor), 200, cid);
  } catch (error) {
    return failure(error, cid);
  }
}

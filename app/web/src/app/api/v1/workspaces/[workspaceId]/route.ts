import { databasePool } from "@/server/database";
import { authorizeProject, projectIdForWorkspace } from "@/server/authorization";
import { AppError } from "@/server/errors";
import { correlationId, failure, success } from "@/server/http";
import { authenticate } from "@/server/identity";
import { assertUuid, parseSaveWorkspaceRequest, toSaveCommand } from "@/server/validation/workspace";
import { PostgresWorkspaceRepository } from "@/server/workspace-repository";

export const runtime = "nodejs";

type Context = RouteContext<"/api/v1/workspaces/[workspaceId]">;

export async function GET(request: Request, context: Context): Promise<Response> {
  const requestCorrelationId = correlationId(request);
  try {
    const identity = authenticate(request.headers);
    const { workspaceId } = await context.params;
    assertUuid(workspaceId, "workspaceId");
    const pool = databasePool();
    const projectId = await projectIdForWorkspace(pool, workspaceId);
    await authorizeProject(pool, identity, projectId, "WORKSPACE_READ");
    const workspace = await new PostgresWorkspaceRepository(pool).findById(workspaceId);
    if (!workspace) throw new AppError("NOT_FOUND", "Không tìm thấy workspace.");
    return success(workspace, 200, requestCorrelationId);
  } catch (error) {
    return failure(error, requestCorrelationId);
  }
}

export async function PUT(request: Request, context: Context): Promise<Response> {
  let requestCorrelationId = correlationId(request);
  try {
    const identity = authenticate(request.headers);
    const { workspaceId } = await context.params;
    assertUuid(workspaceId, "workspaceId");
    const pool = databasePool();
    const projectId = await projectIdForWorkspace(pool, workspaceId);
    const actor = await authorizeProject(pool, identity, projectId, "WORKSPACE_EDIT");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new AppError("INVALID_REQUEST", "Request body không phải JSON hợp lệ.");
    }
    const parsed = parseSaveWorkspaceRequest(body);
    if (parsed.correlationId !== requestCorrelationId && request.headers.has("x-correlation-id")) {
      throw new AppError("INVALID_REQUEST", "correlationId trong body và header không khớp.");
    }
    if (!request.headers.has("x-correlation-id")) requestCorrelationId = parsed.correlationId;
    const command = toSaveCommand(workspaceId, { ...parsed, correlationId: requestCorrelationId }, actor);
    const result = await new PostgresWorkspaceRepository(pool).save(command);
    return success(result, 200, requestCorrelationId);
  } catch (error) {
    return failure(error, requestCorrelationId);
  }
}

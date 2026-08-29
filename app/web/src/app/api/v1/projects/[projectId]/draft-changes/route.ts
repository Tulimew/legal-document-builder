import { databasePool } from "@/server/database";
import { authorizeProject } from "@/server/authorization";
import { correlationId, failure, success } from "@/server/http";
import { authenticate } from "@/server/identity";
import { PostgresReviewRepository } from "@/server/review-repository";
import { assertUuid } from "@/server/validation/workspace";

export const runtime = "nodejs";
type Context = RouteContext<"/api/v1/projects/[projectId]/draft-changes">;

export async function GET(request: Request, context: Context): Promise<Response> {
  const requestCorrelationId = correlationId(request);
  try {
    const identity = authenticate(request.headers);
    const { projectId } = await context.params;
    assertUuid(projectId, "projectId");
    const pool = databasePool();
    await authorizeProject(pool, identity, projectId, "COMMENT_READ");
    const changes = await new PostgresReviewRepository(pool).listDraftChanges(projectId);
    return success(changes, 200, requestCorrelationId);
  } catch (error) {
    return failure(error, requestCorrelationId);
  }
}

import { databasePool } from "@/server/database";
import { authorizeProject } from "@/server/authorization";
import { AppError } from "@/server/errors";
import { correlationId, failure, success } from "@/server/http";
import { authenticate } from "@/server/identity";
import { PostgresReviewRepository } from "@/server/review-repository";
import { parseResolveComment } from "@/server/validation/review";
import { assertUuid } from "@/server/validation/workspace";

export const runtime = "nodejs";
type Context = RouteContext<"/api/v1/projects/[projectId]/comments/[commentId]/resolutions">;

export async function POST(request: Request, context: Context): Promise<Response> {
  let requestCorrelationId = correlationId(request);
  try {
    const identity = authenticate(request.headers);
    const { projectId, commentId } = await context.params;
    assertUuid(projectId, "projectId");
    assertUuid(commentId, "commentId");
    const pool = databasePool();
    const actor = await authorizeProject(pool, identity, projectId, "COMMENT_RESOLVE");
    let body: unknown;
    try { body = await request.json(); } catch { throw new AppError("INVALID_REQUEST", "Request body không phải JSON hợp lệ."); }
    const parsed = parseResolveComment(body);
    if (request.headers.has("x-correlation-id") && parsed.correlationId !== requestCorrelationId) {
      throw new AppError("INVALID_REQUEST", "correlationId trong body và header không khớp.");
    }
    if (!request.headers.has("x-correlation-id")) requestCorrelationId = parsed.correlationId;
    const resolution = await new PostgresReviewRepository(pool).resolve(
      projectId, commentId, { ...parsed, correlationId: requestCorrelationId }, actor,
    );
    return success(resolution, 201, requestCorrelationId);
  } catch (error) {
    return failure(error, requestCorrelationId);
  }
}

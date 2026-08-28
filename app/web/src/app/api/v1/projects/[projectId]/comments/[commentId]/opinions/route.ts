import { authorizeProject } from "@/server/authorization";
import { databasePool } from "@/server/database";
import { PostgresDeliberationRepository } from "@/server/deliberation-repository";
import { AppError } from "@/server/errors";
import { correlationId, failure, success } from "@/server/http";
import { authenticate } from "@/server/identity";
import { parseMemberResolutionOpinion } from "@/server/validation/deliberation";
import { assertUuid } from "@/server/validation/workspace";

export const runtime="nodejs";
type Context=RouteContext<"/api/v1/projects/[projectId]/comments/[commentId]/opinions">;
export async function GET(request:Request,context:Context){const requestCorrelationId=correlationId(request);try{const identity=authenticate(request.headers);const{projectId,commentId}=await context.params;assertUuid(projectId,"projectId");assertUuid(commentId,"commentId");const pool=databasePool();await authorizeProject(pool,identity,projectId,"COMMENT_READ");return success(await new PostgresDeliberationRepository(pool).listOpinions(projectId,commentId),200,requestCorrelationId)}catch(error){return failure(error,requestCorrelationId)}}
export async function POST(request:Request,context:Context){let requestCorrelationId=correlationId(request);try{const identity=authenticate(request.headers);const{projectId,commentId}=await context.params;assertUuid(projectId,"projectId");assertUuid(commentId,"commentId");const pool=databasePool();const actor=await authorizeProject(pool,identity,projectId,"RESOLUTION_OPINION_CREATE");let body:unknown;try{body=await request.json()}catch{throw new AppError("INVALID_REQUEST","Request body không phải JSON hợp lệ.")}const parsed=parseMemberResolutionOpinion(body);if(!request.headers.has("x-correlation-id"))requestCorrelationId=parsed.correlationId;return success(await new PostgresDeliberationRepository(pool).createOpinion(projectId,commentId,{...parsed,correlationId:requestCorrelationId},actor),201,requestCorrelationId)}catch(error){return failure(error,requestCorrelationId)}}

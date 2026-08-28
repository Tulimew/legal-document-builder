import {PostgresAmendmentLayoutRepository} from "@/server/amendment-layout-repository";
import {authorizeProject} from "@/server/authorization";
import {databasePool} from "@/server/database";
import {AppError} from "@/server/errors";
import {correlationId,failure,success} from "@/server/http";
import {authenticate} from "@/server/identity";
import {parseSetAmendmentLayout} from "@/server/validation/amendment";
import {assertUuid} from "@/server/validation/workspace";

export const runtime="nodejs";
type Context=RouteContext<"/api/v1/projects/[projectId]/amendment-layout">;

export async function GET(request:Request,context:Context){const requestCorrelationId=correlationId(request);try{const identity=authenticate(request.headers),{projectId}=await context.params;assertUuid(projectId,"projectId");const pool=databasePool();await authorizeProject(pool,identity,projectId,"AMENDMENT_TARGET_READ");return success(await new PostgresAmendmentLayoutRepository(pool).getActive(projectId),200,requestCorrelationId)}catch(error){return failure(error,requestCorrelationId)}}

export async function PUT(request:Request,context:Context){let requestCorrelationId=correlationId(request);try{const identity=authenticate(request.headers),{projectId}=await context.params;assertUuid(projectId,"projectId");const pool=databasePool(),actor=await authorizeProject(pool,identity,projectId,"AMENDMENT_TARGET_MANAGE");let body:unknown;try{body=await request.json()}catch{throw new AppError("INVALID_REQUEST","Request body không phải JSON hợp lệ.")}const parsed=parseSetAmendmentLayout(body);if(!request.headers.has("x-correlation-id"))requestCorrelationId=parsed.correlationId;return success(await new PostgresAmendmentLayoutRepository(pool).setActive(projectId,{...parsed,correlationId:requestCorrelationId},actor),200,requestCorrelationId)}catch(error){return failure(error,requestCorrelationId)}}

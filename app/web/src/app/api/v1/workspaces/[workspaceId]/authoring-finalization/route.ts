import { PostgresAuthoringFinalizationRepository } from "@/server/authoring-finalization-repository";
import { authorizeProject, projectIdForWorkspace } from "@/server/authorization";
import { databasePool } from "@/server/database";
import { correlationId, failure, success } from "@/server/http";
import { authenticate } from "@/server/identity";
import { parseFinalizeAuthoring } from "@/server/validation/authoring-finalization";
import { assertUuid } from "@/server/validation/workspace";

export const runtime="nodejs";type Context=RouteContext<"/api/v1/workspaces/[workspaceId]/authoring-finalization">;
export async function POST(request:Request,context:Context){const cid=correlationId(request);try{const{workspaceId}=await context.params;assertUuid(workspaceId,"workspaceId");const body=parseFinalizeAuthoring(await request.json()),pool=databasePool(),projectId=await projectIdForWorkspace(pool,workspaceId),actor=await authorizeProject(pool,authenticate(request.headers),projectId,"DRAFT_VERSION_CREATE");return success(await new PostgresAuthoringFinalizationRepository(pool).finalize(projectId,workspaceId,body,actor),201,cid)}catch(error){return failure(error,cid)}}

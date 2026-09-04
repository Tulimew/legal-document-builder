import { authorizeProject } from "@/server/authorization";
import { databasePool } from "@/server/database";
import { correlationId, failure, readJsonBody, success } from "@/server/http";
import { authenticate } from "@/server/identity";
import { PostgresProjectAdministrationRepository } from "@/server/project-administration-repository";
import { parseUpdateProject } from "@/server/validation/administration";
import { assertUuid } from "@/server/validation/workspace";
type C=RouteContext<"/api/v1/projects/[projectId]">;
export async function PATCH(request:Request,context:C){const cid=correlationId(request);try{const{projectId}=await context.params;assertUuid(projectId,"projectId");const pool=databasePool(),actor=await authorizeProject(pool,authenticate(request.headers),projectId,"PROJECT_MANAGE");return success(await new PostgresProjectAdministrationRepository(pool).update(projectId,parseUpdateProject(await readJsonBody(request),cid),actor),200,cid)}catch(error){return failure(error,cid)}}

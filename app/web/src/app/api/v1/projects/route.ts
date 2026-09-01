import { databasePool } from "@/server/database";
import { correlationId, failure, success } from "@/server/http";
import { authenticate } from "@/server/identity";
import { PostgresProductShellRepository } from "@/server/product-shell-repository";
import { PostgresProjectAdministrationRepository } from "@/server/project-administration-repository";
import { authorizeSystem } from "@/server/authorization";
import { readJsonBody } from "@/server/http";
import { parseCreateProject } from "@/server/validation/administration";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cid = correlationId(request);
  try {
    return success(await new PostgresProductShellRepository(databasePool()).listProjects(authenticate(request.headers)), 200, cid);
  } catch (error) {
    return failure(error, cid);
  }
}

export async function POST(request:Request){const cid=correlationId(request);try{const pool=databasePool(),actor=await authorizeSystem(pool,authenticate(request.headers),"PROJECT_CREATE"),body=parseCreateProject(await readJsonBody(request),cid);return success(await new PostgresProjectAdministrationRepository(pool).create(body,actor),201,cid)}catch(error){return failure(error,cid)}}

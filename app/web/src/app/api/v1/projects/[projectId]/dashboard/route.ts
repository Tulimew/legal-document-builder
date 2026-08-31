import { databasePool } from "@/server/database";
import { correlationId, failure, success } from "@/server/http";
import { authenticate } from "@/server/identity";
import { PostgresProductShellRepository } from "@/server/product-shell-repository";
import { assertUuid } from "@/server/validation/workspace";

export const runtime = "nodejs";
type Context = RouteContext<"/api/v1/projects/[projectId]/dashboard">;

export async function GET(request: Request, context: Context) {
  const cid = correlationId(request);
  try {
    const { projectId } = await context.params;
    assertUuid(projectId, "projectId");
    return success(await new PostgresProductShellRepository(databasePool()).dashboard(authenticate(request.headers), projectId), 200, cid);
  } catch (error) {
    return failure(error, cid);
  }
}

import { databasePool } from "@/server/database";
import { correlationId, failure, success } from "@/server/http";
import { authenticate } from "@/server/identity";
import { PostgresProductShellRepository } from "@/server/product-shell-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cid = correlationId(request);
  try {
    return success(await new PostgresProductShellRepository(databasePool()).listProjects(authenticate(request.headers)), 200, cid);
  } catch (error) {
    return failure(error, cid);
  }
}

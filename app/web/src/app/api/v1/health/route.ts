import { databasePool } from "@/server/database";
import { correlationId, failure, success } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const requestCorrelationId = correlationId(request);
  try {
    await databasePool().query("SELECT 1");
    return success({ status: "ready", database: "available" }, 200, requestCorrelationId);
  } catch (error) {
    return failure(error, requestCorrelationId);
  }
}

import { databasePool } from "@/server/database";
import { correlationId, failure, success } from "@/server/http";
import { publishingStorage } from "@/server/publishing-storage";
import { checkReadiness } from "@/server/readiness";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const requestCorrelationId = correlationId(request);
  try {
    return success(await checkReadiness(databasePool(), publishingStorage()), 200, requestCorrelationId);
  } catch (error) {
    return failure(error, requestCorrelationId);
  }
}

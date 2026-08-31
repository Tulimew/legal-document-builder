import { correlationId, success } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const requestCorrelationId = correlationId(request);
  return success({ status: "alive" }, 200, requestCorrelationId);
}

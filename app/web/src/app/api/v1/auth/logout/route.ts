import { clearLocalSessionCookie } from "@/server/local-identity";
import { correlationId, failure, readJsonBody, success } from "@/server/http";

export async function POST(request: Request): Promise<Response> {
  const requestCorrelationId = correlationId(request);
  try {
    await readJsonBody(request);
    const response = success({ authenticated: false }, 200, requestCorrelationId);
    response.headers.set("set-cookie", clearLocalSessionCookie);
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) { return failure(error, requestCorrelationId); }
}

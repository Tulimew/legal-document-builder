import { databasePool } from "@/server/database";
import { correlationId, failure, readJsonBody, success } from "@/server/http";
import { authenticateLocalCredentials, createLocalSession, localSessionCookie } from "@/server/local-identity";
import { AppError } from "@/server/errors";

export async function POST(request: Request): Promise<Response> {
  const requestCorrelationId = correlationId(request);
  try {
    if (process.env.AUTH_MODE !== "local") throw new AppError("AUTH_NOT_CONFIGURED", "Xác thực cục bộ chưa được bật.");
    const body = await readJsonBody(request) as { username?: unknown; password?: unknown };
    const userId = await authenticateLocalCredentials(databasePool(), String(body.username ?? ""), String(body.password ?? ""));
    const response = success({ authenticated: true, userId }, 200, requestCorrelationId);
    response.headers.set("set-cookie", localSessionCookie(createLocalSession(userId)));
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) { return failure(error, requestCorrelationId); }
}

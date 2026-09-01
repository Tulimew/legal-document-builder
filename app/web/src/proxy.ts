import { NextResponse } from "next/server";

import { correlationId, failure, readJsonBody } from "@/server/http";
import { databasePool } from "@/server/database";
import { projectIdFromApiUrl, recordSecurityRejection } from "@/server/security-events";

export async function proxy(request: Request): Promise<Response> {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase())) return NextResponse.next();
  const requestCorrelationId = correlationId(request);
  try {
    await readJsonBody(request.clone());
    return NextResponse.next();
  } catch (error) {
    await recordSecurityRejection(databasePool(), error, requestCorrelationId, projectIdFromApiUrl(request.url)).catch(() => undefined);
    return failure(error, requestCorrelationId);
  }
}

export const config = { matcher: "/api/:path*" };

import { randomUUID } from "node:crypto";

import { asAppError } from "./errors";

export function correlationId(request: Request): string {
  return request.headers.get("x-correlation-id")?.trim() || randomUUID();
}

export function success(data: unknown, status = 200, requestCorrelationId?: string): Response {
  return Response.json(
    { contractVersion: "1.1", data, correlationId: requestCorrelationId },
    { status, headers: requestCorrelationId ? { "x-correlation-id": requestCorrelationId } : undefined },
  );
}

export function failure(error: unknown, requestCorrelationId: string): Response {
  const appError = asAppError(error);
  if (appError.code === "INTERNAL_ERROR") console.error("API request failed", { correlationId: requestCorrelationId });
  return Response.json(
    {
      contractVersion: "1.1",
      error: { code: appError.code, message: appError.message, details: appError.details },
      correlationId: requestCorrelationId,
    },
    { status: appError.status, headers: { "x-correlation-id": requestCorrelationId } },
  );
}

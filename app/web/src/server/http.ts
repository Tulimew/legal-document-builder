import { randomUUID } from "node:crypto";

import { AppError, asAppError } from "./errors";

export const DEFAULT_JSON_BODY_LIMIT = 1024 * 1024;
const CORRELATION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function correlationId(request: Request): string {
  const candidate = request.headers.get("x-correlation-id")?.trim();
  return candidate && CORRELATION_ID.test(candidate) ? candidate : randomUUID();
}

function configuredOrigins(env: NodeJS.ProcessEnv): Set<string> {
  const configured = env.HTTP_ALLOWED_ORIGINS?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
  if (configured.length) return new Set(configured.map((value) => new URL(value).origin));
  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
    return new Set(["http://localhost:3000", "http://localhost:3108", "http://127.0.0.1:3000", "http://127.0.0.1:3108"]);
  }
  return new Set();
}

export function assertMutationRequest(request: Request, env: NodeJS.ProcessEnv = process.env): void {
  if (!MUTATION_METHODS.has(request.method.toUpperCase())) return;
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") throw new AppError("INVALID_REQUEST", "Mutation API chỉ nhận application/json.");
  const origin = request.headers.get("origin");
  if (!origin) throw new AppError("FORBIDDEN", "Mutation request thiếu Origin hợp lệ.");
  let normalizedOrigin: string;
  try { normalizedOrigin = new URL(origin).origin; } catch { throw new AppError("FORBIDDEN", "Mutation request có Origin không hợp lệ."); }
  const allowed = configuredOrigins(env);
  const requestOrigin = new URL(request.url).origin;
  if (normalizedOrigin !== requestOrigin && !allowed.has(normalizedOrigin)) {
    throw new AppError("FORBIDDEN", "Origin không được phép thực hiện mutation.");
  }
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > DEFAULT_JSON_BODY_LIMIT)) {
    throw new AppError("INVALID_REQUEST", "Request body vượt giới hạn cho phép.");
  }
}

export async function readJsonBody(request: Request, limit = DEFAULT_JSON_BODY_LIMIT): Promise<unknown> {
  assertMutationRequest(request);
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit)) {
    throw new AppError("INVALID_REQUEST", "Request body vượt giới hạn cho phép.");
  }
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > limit) throw new AppError("INVALID_REQUEST", "Request body vượt giới hạn cho phép.");
  try { return JSON.parse(raw) as unknown; } catch { throw new AppError("INVALID_REQUEST", "Request body không phải JSON hợp lệ."); }
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

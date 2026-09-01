import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

import { asAppError } from "./errors";

export type SecurityRejectionType = "ORIGIN" | "MEDIA_TYPE" | "BODY_LIMIT" | "AUTHENTICATION" | "AUTHORIZATION" | "OTHER";

function classify(error: unknown): SecurityRejectionType {
  const appError = asAppError(error);
  if (appError.code === "UNAUTHENTICATED" || appError.code === "AUTH_NOT_CONFIGURED") return "AUTHENTICATION";
  if (appError.code === "FORBIDDEN") return appError.message.includes("Origin") ? "ORIGIN" : "AUTHORIZATION";
  if (appError.message.includes("application/json")) return "MEDIA_TYPE";
  if (appError.message.includes("vượt giới hạn")) return "BODY_LIMIT";
  return "OTHER";
}

export async function recordSecurityRejection(pool: Pool, error: unknown, correlationId: string, projectId?: string): Promise<void> {
  await pool.query(
    "INSERT INTO legal_builder.security_rejection_event(id,project_id,rejection_type_code,correlation_id,occurred_at) VALUES($1,$2,$3,$4,clock_timestamp())",
    [randomUUID(), projectId ?? null, classify(error), correlationId],
  );
}

export function projectIdFromApiUrl(url: string): string | undefined {
  return new URL(url).pathname.match(/^\/api\/v1\/projects\/([0-9a-f-]{36})(?:\/|$)/i)?.[1];
}

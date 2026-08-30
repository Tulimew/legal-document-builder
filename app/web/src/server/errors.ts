export type ApiErrorCode =
  | "AUTH_NOT_CONFIGURED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "INVALID_REQUEST"
  | "INVALID_DOCUMENT"
  | "NOT_FOUND"
  | "REVISION_CONFLICT"
  | "TARGET_WORKSPACE_DIRTY"
  | "DATABASE_UNAVAILABLE"
  | "INTERNAL_ERROR";

const statusByCode: Record<ApiErrorCode, number> = {
  AUTH_NOT_CONFIGURED: 503,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  INVALID_REQUEST: 400,
  INVALID_DOCUMENT: 422,
  NOT_FOUND: 404,
  REVISION_CONFLICT: 409,
  TARGET_WORKSPACE_DIRTY: 409,
  DATABASE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.status = statusByCode[code];
  }
}

export function asAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const databaseError = error as { code?: string };
  if (databaseError?.code === "ECONNREFUSED" || databaseError?.code === "57P01") {
    return new AppError("DATABASE_UNAVAILABLE", "Cơ sở dữ liệu chưa sẵn sàng.");
  }

  return new AppError("INTERNAL_ERROR", "Hệ thống không thể hoàn thành yêu cầu.");
}

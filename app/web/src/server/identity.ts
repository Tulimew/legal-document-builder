import type { ActorRef } from "@legal-document-builder/contracts";

import { AppError } from "./errors";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalUuid(headers: Headers, name: string): string | undefined {
  const value = headers.get(name);
  if (!value) return undefined;
  if (!UUID.test(value)) throw new AppError("UNAUTHENTICATED", `Header ${name} không hợp lệ.`);
  return value;
}

export function authenticate(headers: Headers): ActorRef {
  if (process.env.AUTH_MODE !== "development") {
    throw new AppError(
      "AUTH_NOT_CONFIGURED",
      "Adapter xác thực chưa được cấu hình. Chỉ bật AUTH_MODE=development trên máy phát triển.",
    );
  }

  const userId = optionalUuid(headers, "x-development-user-id");
  if (!userId) throw new AppError("UNAUTHENTICATED", "Thiếu danh tính phát triển.");

  return {
    userId,
    personId: optionalUuid(headers, "x-development-person-id"),
    projectMembershipId: optionalUuid(headers, "x-development-membership-id"),
    delegationId: optionalUuid(headers, "x-development-delegation-id"),
  };
}

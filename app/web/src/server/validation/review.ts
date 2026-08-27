import type {
  CreateCommentRequest,
  ResolveCommentRequest,
} from "@legal-document-builder/contracts";

import { AppError } from "../errors";
import { assertUuid } from "./workspace";

const RESOLUTION_TYPES = new Set([
  "ACCEPTED_AND_UPDATED",
  "PARTIALLY_ACCEPTED",
  "EXPLAINED_NOT_ACCEPTED",
]);
const TARGET_SCOPE_TYPES = new Set(["SECTION", "CHAPTER", "ARTICLE", "CLAUSE", "POINT", "OTHER"]);

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError("INVALID_REQUEST", `${field} không được để trống.`);
  }
  return value.trim();
}

function uuid(value: unknown, field: string): string {
  const result = text(value, field);
  assertUuid(result, field);
  return result;
}

function ids(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new AppError("INVALID_REQUEST", `${field} phải là mảng.`);
  const result = value.map((item, index) => uuid(item, `${field}[${index}]`));
  if (new Set(result).size !== result.length) throw new AppError("INVALID_REQUEST", `${field} có ID trùng.`);
  return result;
}

export function parseCreateComment(value: unknown): CreateCommentRequest {
  if (!object(value)) throw new AppError("INVALID_REQUEST", "Request body phải là object.");
  const receivedAt = text(value.receivedAt, "receivedAt");
  if (Number.isNaN(Date.parse(receivedAt))) throw new AppError("INVALID_REQUEST", "receivedAt không hợp lệ.");
  const targetScopeType = text(value.targetScopeType, "targetScopeType");
  if (!TARGET_SCOPE_TYPES.has(targetScopeType)) throw new AppError("INVALID_REQUEST", "Phạm vi góp ý không hợp lệ.");
  const targetNodeIds = ids(value.targetNodeIds, "targetNodeIds");
  if (targetScopeType === "OTHER" && targetNodeIds.length > 0) {
    throw new AppError("INVALID_REQUEST", "Ý kiến khác không được gắn giả tạo vào một điều khoản.");
  }
  if (targetScopeType !== "OTHER" && targetNodeIds.length === 0) {
    throw new AppError("INVALID_REQUEST", "Ý kiến theo cấu trúc phải chọn ít nhất một mục, chương, điều, khoản hoặc điểm.");
  }
  return {
    contractVersion: text(value.contractVersion, "contractVersion") as "1.0" | "1.1",
    reviewRoundId: uuid(value.reviewRoundId, "reviewRoundId"),
    sourceDraftVersionId: uuid(value.sourceDraftVersionId, "sourceDraftVersionId"),
    targetScopeType: targetScopeType as CreateCommentRequest["targetScopeType"],
    issueGroup: text(value.issueGroup, "issueGroup"),
    targetNodeIds,
    targetDescription: text(value.targetDescription, "targetDescription"),
    contributorOrganizationName: text(value.contributorOrganizationName, "contributorOrganizationName"),
    commentContent: text(value.commentContent, "commentContent"),
    receivedAt,
    correlationId: text(value.correlationId, "correlationId"),
  };
}

export function parseResolveComment(value: unknown): ResolveCommentRequest {
  if (!object(value)) throw new AppError("INVALID_REQUEST", "Request body phải là object.");
  const resolutionType = text(value.resolutionType, "resolutionType");
  if (!RESOLUTION_TYPES.has(resolutionType)) throw new AppError("INVALID_REQUEST", "Trạng thái xử lý không hợp lệ.");
  const linkedChangeIds = ids(value.linkedChangeIds, "linkedChangeIds");
  const explanation = typeof value.explanation === "string" ? value.explanation.trim() : undefined;
  const effectiveDraftVersionId = value.effectiveDraftVersionId
    ? uuid(value.effectiveDraftVersionId, "effectiveDraftVersionId") : undefined;

  if ((resolutionType === "PARTIALLY_ACCEPTED" || resolutionType === "EXPLAINED_NOT_ACCEPTED") && !explanation) {
    throw new AppError("INVALID_REQUEST", "Tiếp thu một phần hoặc giải trình bắt buộc nêu giải trình/phạm vi tiếp thu.");
  }
  if (resolutionType !== "EXPLAINED_NOT_ACCEPTED" && (!effectiveDraftVersionId || linkedChangeIds.length === 0)) {
    throw new AppError("INVALID_REQUEST", "Ý kiến được tiếp thu phải liên kết phiên bản và ít nhất một thay đổi dự thảo.");
  }
  return {
    contractVersion: text(value.contractVersion, "contractVersion") as "1.0" | "1.1",
    resolutionType: resolutionType as ResolveCommentRequest["resolutionType"],
    ...(explanation ? { explanation } : {}),
    linkedChangeIds,
    ...(effectiveDraftVersionId ? { effectiveDraftVersionId } : {}),
    correlationId: text(value.correlationId, "correlationId"),
  };
}

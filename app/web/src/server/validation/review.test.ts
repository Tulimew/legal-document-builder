import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../errors";
import { parseCreateComment, parseResolveComment } from "./review";

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, "0")}`;

test("đọc đúng ba nhóm dữ liệu nhập ý kiến", () => {
  const result = parseCreateComment({ contractVersion: "1.1", reviewRoundId: id("1"), sourceDraftVersionId: id("2"),
    targetScopeType: "ARTICLE", issueGroup: "Điều 3", targetNodeIds: [id("3")], targetDescription: "Điều 3 - Nguyên tắc",
    contributorOrganizationName: "Đơn vị A", commentContent: "Đề nghị làm rõ.",
    receivedAt: "2026-08-27T08:00:00+07:00", correlationId: "test-comment" });
  assert.equal(result.issueGroup, "Điều 3");
  assert.equal(result.contributorOrganizationName, "Đơn vị A");
  assert.equal(result.commentContent, "Đề nghị làm rõ.");
});

test("không tiếp thu bắt buộc có giải trình", () => {
  assert.throws(() => parseResolveComment({ contractVersion: "1.1", resolutionType: "EXPLAINED_NOT_ACCEPTED",
    linkedChangeIds: [], correlationId: "test-resolution" }), (error: unknown) =>
    error instanceof AppError && error.code === "INVALID_REQUEST");
});

test("tiếp thu bắt buộc liên kết thay đổi và phiên bản", () => {
  assert.throws(() => parseResolveComment({ contractVersion: "1.1", resolutionType: "ACCEPTED_AND_UPDATED",
    linkedChangeIds: [], correlationId: "test-resolution" }), (error: unknown) =>
    error instanceof AppError && error.code === "INVALID_REQUEST");
});

test("tiếp thu một phần bắt buộc nêu phạm vi tiếp thu", () => {
  assert.throws(() => parseResolveComment({ contractVersion: "1.1", resolutionType: "PARTIALLY_ACCEPTED",
    linkedChangeIds: [id("4")], effectiveDraftVersionId: id("5"), correlationId: "test-partial" }), (error: unknown) =>
    error instanceof AppError && error.code === "INVALID_REQUEST");
});

test("ý kiến khác không gắn giả tạo vào LegalNode", () => {
  assert.throws(() => parseCreateComment({ contractVersion: "1.1", reviewRoundId: id("1"), sourceDraftVersionId: id("2"),
    targetScopeType: "OTHER", issueGroup: "Chính sách chung", targetNodeIds: [id("3")], targetDescription: "Ý kiến khác",
    contributorOrganizationName: "Đơn vị A", commentContent: "Đề nghị rà soát.",
    receivedAt: "2026-08-27T08:00:00+07:00", correlationId: "test-other" }), (error: unknown) =>
    error instanceof AppError && error.code === "INVALID_REQUEST");
});

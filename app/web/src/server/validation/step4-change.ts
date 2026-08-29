import type { CreateStep4ChangeProposalRequest, DecideStep4ChangeProposalRequest, FinalizeStep4Request, LegalContentBlock, Step4ChangeSourceType, Step4StructuredNodeState } from "@legal-document-builder/contracts";

import { AppError } from "../errors";
import { assertUuid } from "./workspace";

const sources: Step4ChangeSourceType[] = ["MEETING_CONCLUSION", "TECHNICAL_EDIT", "DRAFTING_TEAM_INITIATIVE", "NEW_DIRECTION"];
const marks = new Set(["BOLD", "ITALIC", "UNDERLINE", "SUPERSCRIPT", "SUBSCRIPT"]);
function object(value: unknown, name: string): Record<string, unknown> { if (typeof value !== "object" || value === null || Array.isArray(value)) throw new AppError("INVALID_REQUEST", `${name} phải là object.`); return value as Record<string, unknown>; }
function required(item: Record<string, unknown>, name: string): string { if (typeof item[name] !== "string" || !item[name].trim()) throw new AppError("INVALID_REQUEST", `${name} không được để trống.`); return item[name].trim(); }

function paragraph(value: unknown, path: string): void {
  const block = object(value, path);
  if (block.kind !== "PARAGRAPH" || !Array.isArray(block.spans)) throw new AppError("INVALID_REQUEST", `${path} phải là PARAGRAPH có spans.`);
  block.spans.forEach((value, index) => {
    const span = object(value, `${path}.spans[${index}]`);
    if (typeof span.text !== "string") throw new AppError("INVALID_REQUEST", `${path}.spans[${index}].text phải là string.`);
    if (span.marks !== undefined && (!Array.isArray(span.marks) || span.marks.some((mark) => !marks.has(String(mark))))) throw new AppError("INVALID_REQUEST", `${path}.spans[${index}].marks không hợp lệ.`);
    if (span.reference !== undefined) object(span.reference, `${path}.spans[${index}].reference`);
  });
}

function contentBlock(value: unknown, path: string): void {
  const block = object(value, path);
  if (block.kind === "PARAGRAPH") return paragraph(block, path);
  if (block.kind === "LIST") {
    if (typeof block.styleCode !== "string" || !block.styleCode || !Array.isArray(block.items)) throw new AppError("INVALID_REQUEST", `${path} LIST không hợp lệ.`);
    block.items.forEach((value, index) => { const item = object(value, `${path}.items[${index}]`); assertUuid(String(item.id ?? ""), `${path}.items[${index}].id`); if (!Array.isArray(item.blocks)) throw new AppError("INVALID_REQUEST", `${path}.items[${index}].blocks phải là array.`); item.blocks.forEach((child, childIndex) => paragraph(child, `${path}.items[${index}].blocks[${childIndex}]`)); });
    return;
  }
  if (block.kind === "TABLE") {
    if (!Array.isArray(block.rows)) throw new AppError("INVALID_REQUEST", `${path}.rows phải là array.`);
    if (block.caption !== undefined) { if (!Array.isArray(block.caption)) throw new AppError("INVALID_REQUEST", `${path}.caption phải là array.`); block.caption.forEach((child, index) => paragraph(child, `${path}.caption[${index}]`)); }
    block.rows.forEach((value, rowIndex) => { const row = object(value, `${path}.rows[${rowIndex}]`); assertUuid(String(row.id ?? ""), `${path}.rows[${rowIndex}].id`); if (!Array.isArray(row.cells)) throw new AppError("INVALID_REQUEST", `${path}.rows[${rowIndex}].cells phải là array.`); row.cells.forEach((value, cellIndex) => { const cell = object(value, `${path}.rows[${rowIndex}].cells[${cellIndex}]`); assertUuid(String(cell.id ?? ""), `${path}.rows[${rowIndex}].cells[${cellIndex}].id`); if (!Array.isArray(cell.blocks)) throw new AppError("INVALID_REQUEST", `${path}.rows[${rowIndex}].cells[${cellIndex}].blocks phải là array.`); cell.blocks.forEach((child, index) => paragraph(child, `${path}.rows[${rowIndex}].cells[${cellIndex}].blocks[${index}]`)); }); });
    return;
  }
  if (block.kind === "FIGURE") {
    assertUuid(String(block.figureId ?? ""), `${path}.figureId`); object(block.asset, `${path}.asset`);
    if (typeof block.alternativeText !== "string" || typeof block.verificationStatus !== "string" || typeof block.displayRoleCode !== "string") throw new AppError("INVALID_REQUEST", `${path} FIGURE thiếu thông tin bắt buộc.`);
    object(block.metadata, `${path}.metadata`);
    if (block.caption !== undefined) { if (!Array.isArray(block.caption)) throw new AppError("INVALID_REQUEST", `${path}.caption phải là array.`); block.caption.forEach((child, index) => paragraph(child, `${path}.caption[${index}]`)); }
    return;
  }
  throw new AppError("INVALID_REQUEST", `${path}.kind không được hỗ trợ.`);
}

function structuredState(value: unknown, name: string): Step4StructuredNodeState {
  const state = object(value, name);
  if (!Array.isArray(state.content)) throw new AppError("INVALID_REQUEST", `${name}.content phải là LegalContentBlock array, không phải plain text.`);
  state.content.forEach((block, index) => contentBlock(block, `${name}.content[${index}]`));
  return { content: state.content as LegalContentBlock[] };
}

export function parseCreateStep4Change(value: unknown): CreateStep4ChangeProposalRequest {
  const item = object(value, "Request body"), contractVersion = required(item, "contractVersion") as "1.0" | "1.1", legalNodeId = required(item, "legalNodeId"), location = required(item, "location"), reason = required(item, "reason"), correlationId = required(item, "correlationId");
  assertUuid(legalNodeId, "legalNodeId");
  const beforeState = structuredState(item.beforeState, "beforeState"), afterState = structuredState(item.afterState, "afterState"), sourceType = item.sourceType as Step4ChangeSourceType;
  if (!sources.includes(sourceType)) throw new AppError("INVALID_REQUEST", "sourceType không được hỗ trợ.");
  if (JSON.stringify(beforeState) === JSON.stringify(afterState)) throw new AppError("INVALID_REQUEST", "Nội dung trước và sau không được giống nhau.");
  const sourceReference = typeof item.sourceReference === "string" ? item.sourceReference.trim() : "", authorityBasis = typeof item.authorityBasis === "string" ? item.authorityBasis.trim() : "", changesMeetingConclusion = item.changesMeetingConclusion === true;
  if ((sourceType === "MEETING_CONCLUSION" || sourceType === "NEW_DIRECTION") && !sourceReference) throw new AppError("INVALID_REQUEST", "Phải ghi số hiệu hoặc mã nguồn phát sinh.");
  if ((sourceType === "DRAFTING_TEAM_INITIATIVE" || sourceType === "NEW_DIRECTION" || changesMeetingConclusion) && !authorityBasis) throw new AppError("INVALID_REQUEST", "Phải ghi căn cứ thẩm quyền.");
  return { contractVersion, legalNodeId, location, beforeState, afterState, sourceType, ...(sourceReference ? { sourceReference } : {}), reason, ...(authorityBasis ? { authorityBasis } : {}), changesMeetingConclusion, correlationId };
}

export function parseDecideStep4Change(value: unknown): DecideStep4ChangeProposalRequest { const item = object(value, "Request body"), contractVersion = required(item, "contractVersion") as "1.0" | "1.1", reason = required(item, "reason"), authorityBasis = required(item, "authorityBasis"), correlationId = required(item, "correlationId"); if (item.decisionType !== "APPROVE" && item.decisionType !== "REJECT" && item.decisionType !== "REQUEST_REVISION") throw new AppError("INVALID_REQUEST", "decisionType không được hỗ trợ."); return { contractVersion, decisionType: item.decisionType, reason, authorityBasis, correlationId }; }
export function parseFinalizeStep4(value: unknown): FinalizeStep4Request { const item = object(value, "Request body"), contractVersion = required(item, "contractVersion") as "1.0" | "1.1", versionCode = required(item, "versionCode"), versionName = required(item, "versionName"), completionReport = required(item, "completionReport"), authorityBasis = required(item, "authorityBasis"), correlationId = required(item, "correlationId"); if (!Number.isSafeInteger(item.expectedRevision) || Number(item.expectedRevision) < 0) throw new AppError("INVALID_REQUEST", "expectedRevision phải là số nguyên không âm."); if (!/^[A-Z0-9][A-Z0-9._-]{1,49}$/i.test(versionCode)) throw new AppError("INVALID_REQUEST", "versionCode chỉ gồm chữ, số, dấu chấm, gạch ngang hoặc gạch dưới."); return { contractVersion, expectedRevision: Number(item.expectedRevision), versionCode, versionName, completionReport, authorityBasis, correlationId }; }

import type {
  LegalDocumentSnapshot,
  LegalNode,
  SaveWorkspaceCommand,
} from "@legal-document-builder/contracts";

import { AppError } from "../errors";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTRACT_VERSIONS = new Set(["1.0", "1.1"]);

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError("INVALID_REQUEST", `Trường ${field} phải là chuỗi không rỗng.`);
  }
  return value;
}

function requiredUuid(value: unknown, field: string): string {
  const text = requiredString(value, field);
  if (!UUID.test(text)) {
    throw new AppError("INVALID_REQUEST", `Trường ${field} phải là UUID hợp lệ.`);
  }
  return text;
}

function validateNodeShape(value: unknown, index: number): asserts value is LegalNode {
  if (!object(value)) throw new AppError("INVALID_DOCUMENT", `Node ${index} không hợp lệ.`);
  requiredUuid(value.id, `document.nodes[${index}].id`);
  requiredString(value.nodeTypeCode, `document.nodes[${index}].nodeTypeCode`);
  if (value.parentNodeId !== null) requiredUuid(value.parentNodeId, `document.nodes[${index}].parentNodeId`);
  requiredString(value.orderKey, `document.nodes[${index}].orderKey`);
  requiredString(value.lifecycleStatus, `document.nodes[${index}].lifecycleStatus`);
  if (!Array.isArray(value.content)) throw new AppError("INVALID_DOCUMENT", `Nội dung node ${index} phải là mảng.`);
  if (!object(value.metadata)) throw new AppError("INVALID_DOCUMENT", `Metadata node ${index} phải là object.`);
}

export function validateDocument(document: unknown): asserts document is LegalDocumentSnapshot {
  if (!object(document)) throw new AppError("INVALID_DOCUMENT", "Document phải là object.");
  if (!CONTRACT_VERSIONS.has(String(document.contractVersion))) {
    throw new AppError("INVALID_DOCUMENT", "Phiên bản hợp đồng document không được hỗ trợ.");
  }
  requiredUuid(document.legalDocumentId, "document.legalDocumentId");
  requiredString(document.documentTypeCode, "document.documentTypeCode");
  requiredString(document.relationType, "document.relationType");
  if (!object(document.metadata)) throw new AppError("INVALID_DOCUMENT", "Metadata document phải là object.");
  if (!object(document.ruleSet)) throw new AppError("INVALID_DOCUMENT", "RuleSet phải là object.");
  requiredUuid(document.ruleSet.definitionId, "document.ruleSet.definitionId");
  requiredUuid(document.ruleSet.versionId, "document.ruleSet.versionId");
  requiredString(document.ruleSet.versionCode, "document.ruleSet.versionCode");
  if (!Array.isArray(document.nodes)) throw new AppError("INVALID_DOCUMENT", "Nodes phải là mảng.");
  if (!Array.isArray(document.sourceRelations)) throw new AppError("INVALID_DOCUMENT", "Source relations phải là mảng.");

  document.nodes.forEach(validateNodeShape);
  validateTree(document.nodes);
}

export function validateTree(nodes: LegalNode[]): void {
  const byId = new Map<string, LegalNode>();
  const siblingOrder = new Set<string>();
  for (const node of nodes) {
    if (byId.has(node.id)) throw new AppError("INVALID_DOCUMENT", `LegalNode bị trùng ID: ${node.id}.`);
    byId.set(node.id, node);
    const siblingKey = `${node.parentNodeId ?? "ROOT"}\u0000${node.orderKey}`;
    if (siblingOrder.has(siblingKey)) {
      throw new AppError("INVALID_DOCUMENT", "Hai node cùng cấp không được trùng orderKey.");
    }
    siblingOrder.add(siblingKey);
  }

  for (const node of nodes) {
    if (node.parentNodeId !== null && !byId.has(node.parentNodeId)) {
      throw new AppError("INVALID_DOCUMENT", `Node ${node.id} tham chiếu parent không tồn tại.`);
    }
    const visited = new Set<string>([node.id]);
    let cursor = node;
    while (cursor.parentNodeId !== null) {
      if (visited.has(cursor.parentNodeId)) {
        throw new AppError("INVALID_DOCUMENT", `Cây nội dung có chu trình tại node ${node.id}.`);
      }
      visited.add(cursor.parentNodeId);
      cursor = byId.get(cursor.parentNodeId)!;
    }
  }
}

export interface SaveWorkspaceRequest {
  contractVersion: "1.0" | "1.1";
  expectedRevision: number;
  document: LegalDocumentSnapshot;
  correlationId: string;
}

export function parseSaveWorkspaceRequest(value: unknown): SaveWorkspaceRequest {
  if (!object(value)) throw new AppError("INVALID_REQUEST", "Request body phải là object.");
  const contractVersion = requiredString(value.contractVersion, "contractVersion");
  if (!CONTRACT_VERSIONS.has(contractVersion)) {
    throw new AppError("INVALID_REQUEST", "Phiên bản hợp đồng không được hỗ trợ.");
  }
  if (!Number.isSafeInteger(value.expectedRevision) || Number(value.expectedRevision) < 0) {
    throw new AppError("INVALID_REQUEST", "expectedRevision phải là số nguyên không âm.");
  }
  const correlationId = requiredString(value.correlationId, "correlationId");
  if (correlationId.length > 200) throw new AppError("INVALID_REQUEST", "correlationId quá dài.");
  validateDocument(value.document);
  if (value.document.contractVersion !== contractVersion) {
    throw new AppError("INVALID_REQUEST", "contractVersion của request và document phải khớp nhau.");
  }
  return {
    contractVersion: contractVersion as SaveWorkspaceRequest["contractVersion"],
    expectedRevision: Number(value.expectedRevision),
    document: value.document,
    correlationId,
  };
}

export function toSaveCommand(
  workspaceId: string,
  request: SaveWorkspaceRequest,
  actor: SaveWorkspaceCommand["actor"],
): SaveWorkspaceCommand {
  return { ...request, workspaceId, actor };
}

export function assertUuid(value: string, field: string): void {
  requiredUuid(value, field);
}

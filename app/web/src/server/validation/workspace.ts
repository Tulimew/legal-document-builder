import type {
  LegalContentBlock,
  LegalDocumentSnapshot,
  LegalNode,
  ParagraphBlock,
  SaveWorkspaceCommand,
} from "@legal-document-builder/contracts";

import { AppError } from "../errors";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTRACT_VERSIONS = new Set(["1.0", "1.1"]);
const INLINE_MARKS = new Set(["BOLD", "ITALIC", "UNDERLINE", "SUPERSCRIPT", "SUBSCRIPT"]);

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

function optionalUuid(value: unknown, field: string): void { if (value !== undefined) requiredUuid(value, field); }
function jsonObject(value: unknown, field: string): void { if (!object(value)) throw new AppError("INVALID_DOCUMENT", `${field} phải là object JSON.`); }
function paragraph(value: unknown, field: string): asserts value is ParagraphBlock {
  if (!object(value) || value.kind !== "PARAGRAPH" || !Array.isArray(value.spans)) throw new AppError("INVALID_DOCUMENT", `${field} phải là PARAGRAPH có spans.`);
  value.spans.forEach((span, index) => {
    const name=`${field}.spans[${index}]`;if(!object(span)||typeof span.text!=="string")throw new AppError("INVALID_DOCUMENT",`${name}.text phải là chuỗi.`);
    if(span.marks!==undefined&&(!Array.isArray(span.marks)||span.marks.some(mark=>typeof mark!=="string"||!INLINE_MARKS.has(mark))))throw new AppError("INVALID_DOCUMENT",`${name}.marks không hợp lệ.`);
    optionalUuid(span.footnoteId,`${name}.footnoteId`);
    if(span.reference!==undefined){if(!object(span.reference))throw new AppError("INVALID_DOCUMENT",`${name}.reference không hợp lệ.`);if(span.reference.kind==="INTERNAL_REFERENCE"){requiredUuid(span.reference.targetNodeId,`${name}.reference.targetNodeId`);requiredString(span.reference.referenceType,`${name}.reference.referenceType`)}else if(span.reference.kind==="EXTERNAL_REFERENCE"){requiredUuid(span.reference.sourceDocumentId,`${name}.reference.sourceDocumentId`);requiredString(span.reference.verificationStatus,`${name}.reference.verificationStatus`)}else throw new AppError("INVALID_DOCUMENT",`${name}.reference.kind không được hỗ trợ.`)}
  });
}
function validateContent(content: unknown, field: string): asserts content is LegalContentBlock[] {
  if(!Array.isArray(content))throw new AppError("INVALID_DOCUMENT",`${field} phải là mảng.`);const ids=new Set<string>();
  const unique=(value:unknown,name:string)=>{const id=requiredUuid(value,name);if(ids.has(id))throw new AppError("INVALID_DOCUMENT",`${name} bị trùng.`);ids.add(id)};
  content.forEach((block,index)=>{const name=`${field}[${index}]`;if(!object(block)||typeof block.kind!=="string")throw new AppError("INVALID_DOCUMENT",`${name} không hợp lệ.`);
    if(block.kind==="PARAGRAPH")return paragraph(block,name);
    if(block.kind==="LIST"){requiredString(block.styleCode,`${name}.styleCode`);if(!Array.isArray(block.items))throw new AppError("INVALID_DOCUMENT",`${name}.items phải là mảng.`);block.items.forEach((item,i)=>{if(!object(item))throw new AppError("INVALID_DOCUMENT",`${name}.items[${i}] không hợp lệ.`);unique(item.id,`${name}.items[${i}].id`);if(!Array.isArray(item.blocks))throw new AppError("INVALID_DOCUMENT",`${name}.items[${i}].blocks phải là mảng.`);item.blocks.forEach((p,j)=>paragraph(p,`${name}.items[${i}].blocks[${j}]`))});return}
    if(block.kind==="TABLE"){optionalUuid(block.tableId,`${name}.tableId`);if(block.tableId)unique(block.tableId,`${name}.tableId`);if(block.metadata!==undefined)jsonObject(block.metadata,`${name}.metadata`);if(block.caption!==undefined){if(!Array.isArray(block.caption))throw new AppError("INVALID_DOCUMENT",`${name}.caption phải là mảng.`);block.caption.forEach((p,i)=>paragraph(p,`${name}.caption[${i}]`))}if(!Array.isArray(block.rows))throw new AppError("INVALID_DOCUMENT",`${name}.rows phải là mảng.`);block.rows.forEach((row,r)=>{if(!object(row)||!Array.isArray(row.cells))throw new AppError("INVALID_DOCUMENT",`${name}.rows[${r}] không hợp lệ.`);unique(row.id,`${name}.rows[${r}].id`);row.cells.forEach((cell,c)=>{if(!object(cell)||!Array.isArray(cell.blocks))throw new AppError("INVALID_DOCUMENT",`${name}.rows[${r}].cells[${c}] không hợp lệ.`);unique(cell.id,`${name}.rows[${r}].cells[${c}].id`);cell.blocks.forEach((p,i)=>paragraph(p,`${name}.rows[${r}].cells[${c}].blocks[${i}]`))})});return}
    if(block.kind==="FIGURE"){unique(block.figureId,`${name}.figureId`);if(!object(block.asset))throw new AppError("INVALID_DOCUMENT",`${name}.asset không hợp lệ.`);requiredUuid(block.asset.assetId,`${name}.asset.assetId`);requiredUuid(block.asset.assetVersionId,`${name}.asset.assetVersionId`);requiredString(block.asset.mediaType,`${name}.asset.mediaType`);if(!Number.isSafeInteger(block.asset.byteSize)||Number(block.asset.byteSize)<0)throw new AppError("INVALID_DOCUMENT",`${name}.asset.byteSize không hợp lệ.`);if(!object(block.asset.checksum)||block.asset.checksum.algorithm!=="SHA-256"||typeof block.asset.checksum.value!=="string")throw new AppError("INVALID_DOCUMENT",`${name}.asset.checksum không hợp lệ.`);requiredString(block.alternativeText,`${name}.alternativeText`);requiredString(block.verificationStatus,`${name}.verificationStatus`);requiredString(block.displayRoleCode,`${name}.displayRoleCode`);jsonObject(block.metadata,`${name}.metadata`);if(block.caption!==undefined){if(!Array.isArray(block.caption))throw new AppError("INVALID_DOCUMENT",`${name}.caption phải là mảng.`);block.caption.forEach((p,i)=>paragraph(p,`${name}.caption[${i}]`))}return}
    throw new AppError("INVALID_DOCUMENT",`UNSUPPORTED STRUCTURED OPERATION: ${name}.kind=${block.kind}.`);
  });
}

function validateNodeShape(value: unknown, index: number): asserts value is LegalNode {
  if (!object(value)) throw new AppError("INVALID_DOCUMENT", `Node ${index} không hợp lệ.`);
  requiredUuid(value.id, `document.nodes[${index}].id`);
  requiredString(value.nodeTypeCode, `document.nodes[${index}].nodeTypeCode`);
  if (value.parentNodeId !== null) requiredUuid(value.parentNodeId, `document.nodes[${index}].parentNodeId`);
  requiredString(value.orderKey, `document.nodes[${index}].orderKey`);
  requiredString(value.lifecycleStatus, `document.nodes[${index}].lifecycleStatus`);
  validateContent(value.content, `document.nodes[${index}].content`);
  if (!object(value.metadata)) throw new AppError("INVALID_DOCUMENT", `Metadata node ${index} phải là object.`);
}
export function validateLegalNode(value:unknown):asserts value is LegalNode{validateNodeShape(value,0)}

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

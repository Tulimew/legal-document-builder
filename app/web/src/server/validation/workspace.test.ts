import assert from "node:assert/strict";
import test from "node:test";

import type { LegalDocumentSnapshot } from "@legal-document-builder/contracts";

import { AppError } from "../errors";
import { parseSaveWorkspaceRequest, validateTree } from "./workspace";

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, "0")}`;

function document(): LegalDocumentSnapshot {
  return {
    contractVersion: "1.1",
    legalDocumentId: id("1"),
    documentTypeCode: "TEST_DOCUMENT",
    relationType: "NEW_DOCUMENT",
    metadata: {},
    ruleSet: { definitionId: id("2"), versionId: id("3"), versionCode: "TEST-1" },
    nodes: [
      { id: id("10"), nodeTypeCode: "ARTICLE", parentNodeId: null, orderKey: "0001", content: [], metadata: {}, lifecycleStatus: "ACTIVE" },
      { id: id("11"), nodeTypeCode: "CLAUSE", parentNodeId: id("10"), orderKey: "0001", content: [], metadata: {}, lifecycleStatus: "ACTIVE" },
    ],
    sourceRelations: [],
  };
}

test("chấp nhận request lưu workspace hợp lệ", () => {
  const result = parseSaveWorkspaceRequest({
    contractVersion: "1.1",
    expectedRevision: 2,
    correlationId: "test-save-1",
    document: document(),
  });
  assert.equal(result.expectedRevision, 2);
  assert.equal(result.document.nodes.length, 2);
});

test("từ chối parent không tồn tại", () => {
  const value = document();
  value.nodes[1].parentNodeId = id("99");
  assert.throws(() => validateTree(value.nodes), (error: unknown) =>
    error instanceof AppError && error.code === "INVALID_DOCUMENT");
});

test("từ chối cây có chu trình", () => {
  const value = document();
  value.nodes[0].parentNodeId = value.nodes[1].id;
  assert.throws(() => validateTree(value.nodes), (error: unknown) =>
    error instanceof AppError && error.code === "INVALID_DOCUMENT");
});

test("từ chối orderKey trùng giữa hai node cùng cấp", () => {
  const value = document();
  value.nodes.push({
    id: id("12"), nodeTypeCode: "CLAUSE", parentNodeId: id("10"), orderKey: "0001",
    content: [], metadata: {}, lifecycleStatus: "ACTIVE",
  });
  assert.throws(() => validateTree(value.nodes), (error: unknown) =>
    error instanceof AppError && error.code === "INVALID_DOCUMENT");
});

test("không nhận actor từ request công khai", () => {
  const result = parseSaveWorkspaceRequest({
    contractVersion: "1.1",
    expectedRevision: 0,
    correlationId: "test-actor-ignored",
    actor: { userId: id("999") },
    document: document(),
  });
  assert.equal("actor" in result, false);
});

test("chấp nhận đầy đủ PARAGRAPH LIST TABLE FIGURE",()=>{const value=document();value.nodes[0].content=[{kind:"PARAGRAPH",spans:[{text:"Việt Nam",marks:["BOLD"],reference:{kind:"INTERNAL_REFERENCE",targetNodeId:value.nodes[1].id,referenceType:"CROSS_REFERENCE"},footnoteId:id("20")}]},{kind:"LIST",styleCode:"NUMBER",items:[{id:id("21"),blocks:[{kind:"PARAGRAPH",spans:[{text:"Mục một"}]}]}]},{kind:"TABLE",tableId:id("22"),metadata:{safe:true},rows:[{id:id("23"),cells:[{id:id("24"),blocks:[{kind:"PARAGRAPH",spans:[{text:"Ô"}]}]}]}]},{kind:"FIGURE",figureId:id("25"),asset:{assetId:id("26"),assetVersionId:id("27"),mediaType:"image/png",byteSize:12,checksum:{algorithm:"SHA-256",value:"0".repeat(64)}},alternativeText:"Hình",verificationStatus:"VERIFIED",displayRoleCode:"INLINE",metadata:{kept:true}}];assert.doesNotThrow(()=>parseSaveWorkspaceRequest({contractVersion:"1.1",expectedRevision:1,correlationId:"structured",document:value}))});
test("từ chối block kind không hỗ trợ",()=>{const value=document();value.nodes[0].content=[{kind:"VIDEO"} as never];assert.throws(()=>parseSaveWorkspaceRequest({contractVersion:"1.1",expectedRevision:1,correlationId:"unsupported",document:value}),(error:unknown)=>error instanceof AppError&&error.code==="INVALID_DOCUMENT"&&/UNSUPPORTED STRUCTURED OPERATION/.test(error.message))});
test("từ chối ID item/cell trùng trong node",()=>{const value=document(),same=id("30");value.nodes[0].content=[{kind:"LIST",styleCode:"BULLET",items:[{id:same,blocks:[]}]},{kind:"TABLE",rows:[{id:same,cells:[]}]}];assert.throws(()=>parseSaveWorkspaceRequest({contractVersion:"1.1",expectedRevision:1,correlationId:"duplicate",document:value}),(error:unknown)=>error instanceof AppError&&error.code==="INVALID_DOCUMENT")});
test("từ chối TABLE overlap hoặc span vượt biên",()=>{const value=document();value.nodes[0].content=[{kind:"TABLE",tableId:id("40"),rows:[{id:id("41"),cells:[{id:id("42"),rowSpan:2,blocks:[]}]}]}];assert.throws(()=>parseSaveWorkspaceRequest({contractVersion:"1.1",expectedRevision:1,correlationId:"bad-grid",document:value}),(error:unknown)=>error instanceof AppError&&error.code==="INVALID_DOCUMENT"&&/INVALID_TABLE_TOPOLOGY/.test(error.message))});

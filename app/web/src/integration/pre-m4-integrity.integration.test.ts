import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { LegalContentBlock, LegalDocumentSnapshot } from "@legal-document-builder/contracts";
import { Pool } from "pg";

import { authorizeProject } from "@/server/authorization";
import { CANONICAL_CHECKSUM_ALGORITHM, verifyCanonicalSha256 } from "@/server/canonical-json";
import { AppError } from "@/server/errors";
import { PostgresStep4ChangeRepository } from "@/server/step4-change-repository";
import { PostgresWorkspaceRepository } from "@/server/workspace-repository";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env.local");
const localEnv = Object.fromEntries(readFileSync(envPath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => { const index = line.indexOf("="); return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "")]; }));

const paragraph = (text: string, bold = false): LegalContentBlock => ({ kind: "PARAGRAPH", spans: [{ text, ...(bold ? { marks: ["BOLD"] } : {}) }] });
function structuredContent(suffix: string, phase: "before" | "after"): LegalContentBlock[] {
  const text = `${phase}-${suffix}`;
  return [
    { kind: "PARAGRAPH", spans: [{ text: `Đoạn ${text}`, marks: ["BOLD"], reference: { kind: "INTERNAL_REFERENCE", targetNodeId: randomUUID(), referenceType: "CROSS_REFERENCE" } }] },
    { kind: "LIST", styleCode: "BULLET", items: [{ id: randomUUID(), blocks: [paragraph(`Danh sách ${text}`) as Extract<LegalContentBlock, { kind: "PARAGRAPH" }>] }] },
    { kind: "TABLE", tableId: randomUUID(), metadata: { purpose: "integrity" }, rows: [{ id: randomUUID(), cells: [{ id: randomUUID(), blocks: [paragraph(`Ô ${text}`) as Extract<LegalContentBlock, { kind: "PARAGRAPH" }>] }] }] },
    { kind: "FIGURE", figureId: randomUUID(), asset: { assetId: randomUUID(), assetVersionId: randomUUID(), mediaType: "image/png", byteSize: 12, checksum: { algorithm: "SHA-256", value: "0".repeat(64) } }, alternativeText: `Hình ${text}`, verificationStatus: "TEST_ONLY", displayRoleCode: "INLINE", metadata: { source: "fixture" }, caption: [paragraph(`Chú thích ${text}`) as Extract<LegalContentBlock, { kind: "PARAGRAPH" }>] },
  ];
}

test("pre-M4 integrity chạy trên PostgreSQL development thật", async (t) => {
  const connectionString = process.env.DATABASE_URL || localEnv.DATABASE_URL;
  assert.ok(connectionString);
  const pool = new Pool({ connectionString, max: 3, application_name: "legal-builder-pre-m4-integrity" });
  assert.match((await pool.query("SELECT current_database() AS name")).rows[0].name, /_dev$/);
  const projectId = process.env.NEXT_PUBLIC_SAMPLE_PROJECT_ID || localEnv.NEXT_PUBLIC_SAMPLE_PROJECT_ID;
  const workspaceId = process.env.NEXT_PUBLIC_SAMPLE_WORKSPACE_ID || localEnv.NEXT_PUBLIC_SAMPLE_WORKSPACE_ID;
  const userId = process.env.NEXT_PUBLIC_DEVELOPMENT_USER_ID || localEnv.NEXT_PUBLIC_DEVELOPMENT_USER_ID;
  assert.ok(projectId && workspaceId && userId);

  const workspaceRepository = new PostgresWorkspaceRepository(pool), step4 = new PostgresStep4ChangeRepository(pool);
  const original = await workspaceRepository.findById(workspaceId);
  assert.ok(original && original.document.nodes.length >= 2);
  let revision = original.revision;
  const proposalActor = await authorizeProject(pool, { userId }, projectId, "STEP4_CHANGE_CREATE");
  const actor = proposalActor;
  const decisionActor = await authorizeProject(pool, { userId }, projectId, "STEP4_CHANGE_DECIDE");
  const finalizeActor = await authorizeProject(pool, { userId }, projectId, "STEP4_FINALIZE");
  const suffix = Date.now().toString(36).toUpperCase();
  const target = original.document.nodes[0];

  async function save(document: LegalDocumentSnapshot, expected = revision): Promise<number> {
    const result = await workspaceRepository.save({ contractVersion: "1.1", workspaceId, expectedRevision: expected, document, actor, correlationId: `pre-m4-save-${randomUUID()}` });
    revision = result.revision;
    return revision;
  }

  t.after(async () => {
    const current = await workspaceRepository.findById(workspaceId);
    if (current) await workspaceRepository.save({ contractVersion: "1.1", workspaceId, expectedRevision: current.revision, document: original.document, actor, correlationId: `pre-m4-restore-${suffix}` });
    await pool.end();
  });

  const beforeContent = structuredContent(suffix, "before"), afterContent = structuredContent(suffix, "after");
  const structuredDocument = structuredClone(original.document);
  structuredDocument.nodes.find((node) => node.id === target.id)!.content = beforeContent;
  await save(structuredDocument);

  const proposal = await step4.create(projectId, workspaceId, { contractVersion: "1.1", legalNodeId: target.id, location: `Structured ${suffix}`, beforeState: { content: beforeContent }, afterState: { content: afterContent }, sourceType: "TECHNICAL_EDIT", reason: "Regression structured content", changesMeetingConclusion: false, correlationId: `pre-m4-proposal-${suffix}` }, proposalActor);
  await step4.decide(projectId, proposal.id, { contractVersion: "1.1", decisionType: "APPROVE", reason: "Regression approval", authorityBasis: "Pre-M4 integrity verification", correlationId: `pre-m4-decision-${suffix}` }, decisionActor);
  const ready = await step4.readiness(workspaceId);
  assert.equal(ready.ready, true, JSON.stringify(ready.conflicts));
  const finalized = await step4.finalize(projectId, workspaceId, { contractVersion: "1.1", expectedRevision: ready.workspaceRevision, versionCode: `PRE-M4-${suffix}`, versionName: `Pre-M4 ${suffix}`, completionReport: "Structured content regression", authorityBasis: "Pre-M4 integrity verification", correlationId: `pre-m4-finalize-${suffix}` }, finalizeActor);
  revision = finalized.workspaceRevision;

  await t.test("finalize giữ PARAGRAPH/LIST/TABLE/FIGURE, marks, IDs và stable node", async () => {
    const row = (await pool.query("SELECT document_snapshot,snapshot_checksum_sha256,snapshot_checksum_algorithm_code FROM legal_builder.draft_version WHERE id=$1", [finalized.draftVersionId])).rows[0];
    const node = row.document_snapshot.nodes.find((value: { id: string }) => value.id === target.id);
    assert.equal(node.id, target.id);
    assert.equal(node.parentNodeId, target.parentNodeId);
    assert.equal(node.orderKey, target.orderKey);
    assert.equal(node.displayNumber, target.displayNumber);
    assert.deepEqual(node.content, afterContent);
    assert.deepEqual(node.content.map((block: { kind: string }) => block.kind), ["PARAGRAPH", "LIST", "TABLE", "FIGURE"]);
    assert.deepEqual(node.content[0].spans[0].marks, ["BOLD"]);
    assert.equal(node.content[0].spans[0].reference.kind, "INTERNAL_REFERENCE");
    assert.equal(node.content[3].asset.assetVersionId, (afterContent[3] as Extract<LegalContentBlock, { kind: "FIGURE" }>).asset.assetVersionId);
    assert.equal(row.snapshot_checksum_algorithm_code, CANONICAL_CHECKSUM_ALGORITHM);
    assert.equal(verifyCanonicalSha256(row.document_snapshot, row.snapshot_checksum_sha256), true);
  });

  await t.test("LegalChange giữ structured before/after", async () => {
    const row = (await pool.query("SELECT before_state,after_state FROM legal_builder.draft_legal_node_change WHERE id=$1", [finalized.legalChangeIds[0]])).rows[0];
    assert.deepEqual(row.before_state.content, beforeContent);
    assert.deepEqual(row.after_state.content, afterContent);
  });

  const referencedBase = (await workspaceRepository.findById(workspaceId))!;
  const referencedNode = referencedBase.document.nodes.find((node) => node.id === target.id)!;
  await t.test("unchanged nodes không bị ghi lại", async () => {
    const timestampsBefore = await pool.query("SELECT legal_node_id,updated_at FROM legal_builder.workspace_legal_node WHERE workspace_id=$1 ORDER BY legal_node_id", [workspaceId]);
    await save(structuredClone(referencedBase.document));
    const timestampsAfter = await pool.query("SELECT legal_node_id,updated_at FROM legal_builder.workspace_legal_node WHERE workspace_id=$1 ORDER BY legal_node_id", [workspaceId]);
    assert.deepEqual(timestampsAfter.rows, timestampsBefore.rows);
  });
  const contentUpdate = structuredClone(referencedBase.document);
  contentUpdate.nodes.find((node) => node.id === target.id)!.metadata = { ...referencedNode.metadata, integrityUpdate: suffix };
  contentUpdate.nodes.find((node) => node.id === target.id)!.content = [...referencedNode.content, paragraph(`Bổ sung ${suffix}`)];
  await t.test("update content node có Step 4 proposal tham chiếu vẫn thành công", async () => { await save(contentUpdate); });

  const reordered = structuredClone(contentUpdate);
  reordered.nodes.find((node) => node.id === target.id)!.orderKey = `ZZ-${suffix}`;
  await t.test("reorder node được tham chiếu không delete/reinsert", async () => { await save(reordered); });

  const insertedId = randomUUID(), withInsert = structuredClone(reordered);
  withInsert.nodes.push({ id: insertedId, nodeTypeCode: "ARTICLE", parentNodeId: null, orderKey: `NEW-${suffix}`, content: [paragraph("Nút mới")], metadata: {}, lifecycleStatus: "ACTIVE" });
  await t.test("insert node mới", async () => { await save(withInsert); assert.ok((await workspaceRepository.findById(workspaceId))!.document.nodes.some((node) => node.id === insertedId)); });

  const withoutInsert = structuredClone(withInsert);
  withoutInsert.nodes = withoutInsert.nodes.filter((node) => node.id !== insertedId);
  await t.test("delete node không được tham chiếu", async () => { await save(withoutInsert); assert.ok(!(await workspaceRepository.findById(workspaceId))!.document.nodes.some((node) => node.id === insertedId)); });

  await t.test("delete node được proposal tham chiếu trả domain conflict và rollback", async () => {
    const withoutReferenced = structuredClone(withoutInsert);
    withoutReferenced.nodes = withoutReferenced.nodes.filter((node) => node.id !== target.id);
    const before = await workspaceRepository.findById(workspaceId);
    await assert.rejects(() => save(withoutReferenced), (error: unknown) => error instanceof AppError && error.code === "REVISION_CONFLICT" && /phiếu thay đổi/.test(error.message));
    const after = await workspaceRepository.findById(workspaceId);
    assert.equal(after!.revision, before!.revision);
    assert.ok(after!.document.nodes.some((node) => node.id === target.id));
  });

  await t.test("stale expectedRevision rollback", async () => {
    const before = await workspaceRepository.findById(workspaceId);
    await assert.rejects(() => save(withoutInsert, revision - 1), (error: unknown) => error instanceof AppError && error.code === "REVISION_CONFLICT");
    assert.equal((await workspaceRepository.findById(workspaceId))!.revision, before!.revision);
  });

  await t.test("constraint failure rollback toàn transaction", async () => {
    const invalid = structuredClone(withoutInsert);
    invalid.nodes[1].parentNodeId = invalid.nodes[0].parentNodeId;
    invalid.nodes[1].orderKey = invalid.nodes[0].orderKey;
    const before = await workspaceRepository.findById(workspaceId);
    await assert.rejects(() => save(invalid));
    const after = await workspaceRepository.findById(workspaceId);
    assert.equal(after!.revision, before!.revision);
    assert.deepEqual(after!.document.nodes, before!.document.nodes);
  });
});

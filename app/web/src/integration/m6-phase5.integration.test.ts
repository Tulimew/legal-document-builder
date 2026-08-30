import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { LegalContentBlock, LegalDocumentSnapshot } from "@legal-document-builder/contracts";
import { Pool } from "pg";

import { createTable } from "@/lib/table-authoring";
import { authorizeProject } from "@/server/authorization";
import { PostgresAuthoringFinalizationRepository } from "@/server/authoring-finalization-repository";
import { canonicalJson, verifyCanonicalSha256 } from "@/server/canonical-json";
import { PostgresDraftBranchRepository } from "@/server/draft-branch-repository";
import { PostgresMergeCompletionRepository } from "@/server/merge-completion-repository";
import { PostgresMergeOperationRepository } from "@/server/merge-operation-repository";
import { PostgresWorkspaceRepository } from "@/server/workspace-repository";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env.local");
const localEnv = Object.fromEntries(readFileSync(envPath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")]; }));
const paragraph = (text: string): Extract<LegalContentBlock, { kind: "PARAGRAPH" }> => ({ kind: "PARAGRAPH", spans: [{ text, marks: ["BOLD"] }] });

test("M6 Phase 5 structured authoring survives fork and merge end-to-end", async (t) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || localEnv.DATABASE_URL, max: 4, application_name: "legal-builder-m6-p5" });
  t.after(() => pool.end());
  assert.match((await pool.query("SELECT current_database() name")).rows[0].name, /_dev$/);
  const projectId = process.env.NEXT_PUBLIC_SAMPLE_PROJECT_ID || localEnv.NEXT_PUBLIC_SAMPLE_PROJECT_ID;
  const userId = process.env.NEXT_PUBLIC_DEVELOPMENT_USER_ID || localEnv.NEXT_PUBLIC_DEVELOPMENT_USER_ID;
  const base = (await pool.query("SELECT id,document_snapshot FROM legal_builder.draft_version WHERE project_id=$1 AND document_snapshot ? 'nodes' ORDER BY sealed_at DESC,id DESC LIMIT 1", [projectId])).rows[0];
  const asset = (await pool.query("SELECT a.id asset_id,av.* FROM legal_builder.asset a JOIN legal_builder.asset_version av ON av.asset_id=a.id WHERE a.project_id=$1 LIMIT 1", [projectId])).rows[0];
  assert.ok(base && asset && base.document_snapshot.nodes.length >= 3);

  const suffix = `${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const branchRepository = new PostgresDraftBranchRepository(pool);
  const branchActor = await authorizeProject(pool, { userId }, projectId, "DRAFT_BRANCH_CREATE");
  const target = await branchRepository.create(projectId, { contractVersion: "1.1", code: `M6T-${suffix}`, name: `M6 target ${suffix}`, purpose: "M6 structured merge acceptance", sourceVersionId: base.id, correlationId: `m6-target-${suffix}` }, branchActor);
  const source = await branchRepository.create(projectId, { contractVersion: "1.1", code: `M6S-${suffix}`, name: `M6 source ${suffix}`, purpose: "M6 structured merge acceptance", sourceVersionId: base.id, correlationId: `m6-source-${suffix}` }, branchActor);
  const workspaces = new PostgresWorkspaceRepository(pool);
  const targetWorkspace = (await workspaces.findById(target.branch.workspaceId))!;
  const sourceWorkspace = (await workspaces.findById(source.branch.workspaceId))!;
  const ours = sanitize(targetWorkspace.document), theirs = sanitize(sourceWorkspace.document);
  ours.nodes[0].content = richContent("OURS", asset);
  theirs.nodes[0].content = richContent("THEIRS", asset);
  ours.nodes[1].content = [paragraph("Thay đổi chỉ ở nhánh đích")];
  theirs.nodes[2].content = [paragraph("Thay đổi chỉ ở nhánh nguồn")];

  const editor = await authorizeProject(pool, { userId }, projectId, "WORKSPACE_EDIT");
  const oursSave = await workspaces.save({ contractVersion: "1.1", workspaceId: targetWorkspace.id, expectedRevision: targetWorkspace.revision, document: ours, actor: editor, correlationId: `m6-save-ours-${suffix}` });
  const theirsSave = await workspaces.save({ contractVersion: "1.1", workspaceId: sourceWorkspace.id, expectedRevision: sourceWorkspace.revision, document: theirs, actor: editor, correlationId: `m6-save-theirs-${suffix}` });
  const finalizer = new PostgresAuthoringFinalizationRepository(pool);
  const finalActor = await authorizeProject(pool, { userId }, projectId, "DRAFT_VERSION_CREATE");
  const oursVersion = await finalizer.finalize(projectId, targetWorkspace.id, finalRequest(`M6-O-${suffix}`, oursSave.revision), finalActor);
  const theirsVersion = await finalizer.finalize(projectId, sourceWorkspace.id, finalRequest(`M6-S-${suffix}`, theirsSave.revision), finalActor);

  const resolver = await authorizeProject(pool, { userId }, projectId, "DRAFT_MERGE_RESOLVE");
  const operations = new PostgresMergeOperationRepository(pool);
  let operation = await operations.create(projectId, { contractVersion: "1.1", targetBranchId: target.branch.id, oursVersionId: oursVersion.draftVersionId, theirsVersionId: theirsVersion.draftVersionId, expectedTargetWorkspaceRevision: oursSave.revision, reason: "M6 structured merge", authorityBasis: "M6 approved scope", correlationId: `m6-merge-${suffix}` }, resolver);
  assert.equal(operation.status, "CONFLICTS_OPEN");
  assert.ok(operation.conflicts.some((item) => item.legalNodeId === ours.nodes[0].id));
  for (const conflict of operation.conflicts) {
    const manual = structuredClone(conflict.ours!);
    manual.content = richContent("MANUAL", asset);
    await operations.resolve(projectId, operation.id, conflict.id, { contractVersion: "1.1", choice: "USE_MANUAL_RESULT", manualResult: manual, reason: "Giữ cấu trúc rich có kiểm soát", authorityBasis: "M6 acceptance", correlationId: `m6-resolve-${conflict.id}` }, resolver);
  }
  operation = (await operations.find(projectId, operation.id))!;
  assert.equal(operation.status, "READY");
  const completionActor = await authorizeProject(pool, { userId }, projectId, "DRAFT_MERGE_COMPLETE");
  const completed = await new PostgresMergeCompletionRepository(pool).complete(projectId, operation.id, { contractVersion: "1.1", expectedTargetWorkspaceRevision: operation.targetWorkspaceRevision, previewToken: operation.previewChecksum, versionCode: `M6-M-${suffix}`, versionName: "M6 structured merged version", reason: "Chứng minh compatibility M5/M6", authorityBasis: "M6 approved scope", correlationId: `m6-complete-${suffix}` }, completionActor);

  await t.test("merged snapshot keeps structured conflict and non-conflicting changes", async () => {
    const version = (await pool.query("SELECT document_snapshot,snapshot_checksum_sha256 FROM legal_builder.draft_version WHERE id=$1", [completed.draftVersionId])).rows[0];
    assert.equal(verifyCanonicalSha256(version.document_snapshot, String(version.snapshot_checksum_sha256).trim()), true);
    assert.match(canonicalJson(version.document_snapshot.nodes.find((node: { id: string }) => node.id === ours.nodes[0].id).content), /MANUAL/);
    assert.match(canonicalJson(version.document_snapshot.nodes.find((node: { id: string }) => node.id === ours.nodes[1].id).content), /nhánh đích/);
    assert.match(canonicalJson(version.document_snapshot.nodes.find((node: { id: string }) => node.id === ours.nodes[2].id).content), /nhánh nguồn/);
    assert.deepEqual((await pool.query("SELECT edge_type,source_version_id FROM legal_builder.draft_version_edge WHERE version_id=$1 ORDER BY source_order", [completed.draftVersionId])).rows, [{ edge_type: "PARENT", source_version_id: oursVersion.draftVersionId }, { edge_type: "MERGE_SOURCE", source_version_id: theirsVersion.draftVersionId }]);
    assert.equal((await pool.query("SELECT count(*) count FROM legal_builder.snapshot_asset_ref WHERE draft_version_id=$1", [completed.draftVersionId])).rows[0].count, "1");
  });
  await t.test("resolution provenance and immutable inputs remain intact", async () => {
    assert.equal((await pool.query("SELECT count(*) count FROM legal_builder.draft_merge_conflict_resolution r JOIN legal_builder.draft_merge_conflict c ON c.id=r.conflict_id WHERE c.merge_operation_id=$1", [operation.id])).rows[0].count, String(operation.conflicts.length));
    assert.equal((await pool.query("SELECT count(*) count FROM legal_builder.audit_event WHERE aggregate_id=$1 AND event_type_code='DRAFT_MERGE_COMPLETED'", [operation.id])).rows[0].count, "1");
    assert.equal(canonicalJson((await pool.query("SELECT document_snapshot FROM legal_builder.draft_version WHERE id=$1", [theirsVersion.draftVersionId])).rows[0].document_snapshot), canonicalJson(theirs));
  });
});

function sanitize(document: LegalDocumentSnapshot): LegalDocumentSnapshot { const copy = structuredClone(document); for (const node of copy.nodes) node.content = node.content.filter((block) => block.kind !== "FIGURE"); return copy; }
function richContent(label: string, asset: Record<string, unknown>): LegalContentBlock[] { return [paragraph(`Nội dung tiếng Việt ${label}`), { kind: "LIST", styleCode: "BULLET", items: [{ id: randomUUID(), blocks: [paragraph(`Mục ${label}`)] }] }, createTable(2, 2), { kind: "FIGURE", figureId: randomUUID(), asset: { assetId: String(asset.asset_id), assetVersionId: String(asset.id), mediaType: String(asset.media_type), byteSize: Number(asset.byte_size), checksum: { algorithm: "SHA-256", value: String(asset.checksum_sha256).trim() } }, alternativeText: `Hình ${label}`, caption: [paragraph(`Chú thích ${label}`)], verificationStatus: String(asset.verification_status_code), displayRoleCode: "INLINE", metadata: { m6: true } }]; }
function finalRequest(code: string, revision: number) { return { contractVersion: "1.1" as const, expectedRevision: revision, versionCode: code, versionName: code, reason: "M6 rich authoring acceptance", authorityBasis: "M6 approved scope", correlationId: code }; }

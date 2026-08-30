import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { authorizeProject } from "@/server/authorization";
import { PostgresAssetRepository } from "@/server/asset-repository";
import { PostgresWorkspaceRepository } from "@/server/workspace-repository";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env.local");
const env = Object.fromEntries(readFileSync(envPath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => { const index = line.indexOf("="); return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "")]; }));

test("M6 Phase 3 uses immutable PostgreSQL AssetVersion for FIGURE authoring", async () => {
  const connectionString = process.env.DATABASE_URL || env.DATABASE_URL; assert.ok(connectionString);
  const pool = new Pool({ connectionString, max: 3, application_name: "legal-builder-m6-phase3" });
  const projectId = process.env.NEXT_PUBLIC_SAMPLE_PROJECT_ID || env.NEXT_PUBLIC_SAMPLE_PROJECT_ID;
  const workspaceId = process.env.NEXT_PUBLIC_SAMPLE_WORKSPACE_ID || env.NEXT_PUBLIC_SAMPLE_WORKSPACE_ID;
  assert.ok(projectId && workspaceId); assert.match((await pool.query("SELECT current_database() name")).rows[0].name, /_dev$/);
  const grant = await pool.query<{ user_id: string }>(`SELECT m.user_id FROM legal_builder.project_membership m JOIN legal_builder.membership_role mr ON mr.membership_id=m.id JOIN legal_builder.role_permission rp ON rp.role_definition_id=mr.role_definition_id WHERE m.project_id=$1 AND m.status_code='ACTIVE' AND rp.permission_code='WORKSPACE_EDIT' LIMIT 1`, [projectId]);
  assert.equal(grant.rowCount, 1); const actor = await authorizeProject(pool, { userId: grant.rows[0].user_id }, projectId, "WORKSPACE_EDIT");
  const assets = await new PostgresAssetRepository(pool).listAvailable(projectId); assert.ok(assets.length > 0, "Development fixture cần AssetVersion cho M6"); const asset = assets[0];
  const workspaceRepository = new PostgresWorkspaceRepository(pool), original = await workspaceRepository.findById(workspaceId); assert.ok(original);
  const changed = structuredClone(original.document), target = changed.nodes[0], figureId = randomUUID();
  target.content.push({ kind: "FIGURE", figureId, asset: { assetId: asset.assetId, assetVersionId: asset.assetVersionId, mediaType: asset.mediaType, byteSize: asset.byteSize, checksum: asset.checksum }, alternativeText: "Sơ đồ quy trình xây dựng văn bản", caption: [{ kind: "PARAGRAPH", spans: [{ text: "Hình minh họa tiếng Việt" }] }], verificationStatus: asset.verificationStatus, displayRoleCode: "INLINE", metadata: { originalFileName: asset.originalFileName, roundTrip: true } });
  try {
    await workspaceRepository.save({ contractVersion: "1.1", workspaceId, expectedRevision: original.revision, document: changed, actor, correlationId: `m6-phase3-${randomUUID()}` });
    const loaded = await workspaceRepository.findById(workspaceId), figure = loaded!.document.nodes[0].content.find((block) => block.kind === "FIGURE" && block.figureId === figureId); assert.ok(figure && figure.kind === "FIGURE");
    assert.equal(figure.asset.assetVersionId, asset.assetVersionId); assert.equal(figure.caption?.[0].spans[0].text, "Hình minh họa tiếng Việt"); assert.equal(figure.metadata.roundTrip, true);
  } finally {
    const current = await workspaceRepository.findById(workspaceId); if (current) await workspaceRepository.save({ contractVersion: "1.1", workspaceId, expectedRevision: current.revision, document: original.document, actor, correlationId: `m6-phase3-restore-${randomUUID()}` });
    await pool.end();
  }
});

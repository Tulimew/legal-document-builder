import { randomUUID } from "node:crypto";

import type {
  ActorRef,
  DraftWorkspace,
  LegalDocumentSnapshot,
  LegalNode,
  SaveWorkspaceCommand,
  SaveWorkspaceResult,
} from "@legal-document-builder/contracts";
import type { Pool, PoolClient } from "pg";

import { inTransaction } from "./database";
import { AppError } from "./errors";

interface WorkspaceRow {
  id: string;
  project_id: string;
  branch_id: string;
  legal_document_id: string;
  document_type_code: string;
  relation_type_code: LegalDocumentSnapshot["relationType"];
  revision: string;
  contract_version: DraftWorkspace["contractVersion"];
  ruleset_definition_id: string;
  ruleset_version_id: string;
  ruleset_version_code: string;
  document_metadata: LegalDocumentSnapshot["metadata"];
  source_relations: LegalDocumentSnapshot["sourceRelations"];
  updated_at: Date;
  updated_by_user_id: string;
  updated_by_person_id: string | null;
  updated_by_membership_id: string | null;
  updated_under_delegation_id: string | null;
}

interface NodeRow {
  legal_node_id: string;
  node_type_code: string;
  parent_node_id: string | null;
  order_key: string;
  title: string | null;
  content_blocks: LegalNode["content"];
  metadata: LegalNode["metadata"];
  display_number: string | null;
  display_number_locked: boolean;
  lifecycle_status_code: string;
}

function actorFromRow(row: WorkspaceRow): ActorRef {
  return {
    userId: row.updated_by_user_id,
    ...(row.updated_by_person_id ? { personId: row.updated_by_person_id } : {}),
    ...(row.updated_by_membership_id ? { projectMembershipId: row.updated_by_membership_id } : {}),
    ...(row.updated_under_delegation_id ? { delegationId: row.updated_under_delegation_id } : {}),
  };
}

function nodeFromRow(row: NodeRow): LegalNode {
  return {
    id: row.legal_node_id,
    nodeTypeCode: row.node_type_code,
    parentNodeId: row.parent_node_id,
    orderKey: row.order_key,
    ...(row.title ? { title: row.title } : {}),
    content: row.content_blocks,
    metadata: row.metadata,
    ...(row.display_number ? { displayNumber: row.display_number } : {}),
    displayNumberLocked: row.display_number_locked,
    lifecycleStatus: row.lifecycle_status_code,
  };
}

export class PostgresWorkspaceRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<DraftWorkspace | null> {
    const workspace = await this.pool.query<WorkspaceRow>(
      `SELECT w.*, p.document_type_code, d.relation_type_code
         FROM legal_builder.draft_workspace w
         JOIN legal_builder.legal_document d ON d.id = w.legal_document_id
         JOIN legal_builder.legal_document_project p ON p.id = w.project_id
        WHERE w.id = $1`,
      [id],
    );
    if (workspace.rowCount === 0) return null;
    const row = workspace.rows[0];
    const nodes = await this.pool.query<NodeRow>(
      `SELECT * FROM legal_builder.workspace_legal_node
        WHERE workspace_id = $1
        ORDER BY parent_node_id NULLS FIRST, order_key, legal_node_id`,
      [id],
    );

    return {
      contractVersion: row.contract_version,
      id: row.id,
      projectId: row.project_id,
      branchId: row.branch_id,
      revision: Number(row.revision),
      document: {
        contractVersion: row.contract_version,
        legalDocumentId: row.legal_document_id,
        documentTypeCode: row.document_type_code,
        relationType: row.relation_type_code,
        metadata: row.document_metadata,
        ruleSet: {
          definitionId: row.ruleset_definition_id,
          versionId: row.ruleset_version_id,
          versionCode: row.ruleset_version_code,
        },
        nodes: nodes.rows.map(nodeFromRow),
        sourceRelations: row.source_relations,
      },
      ruleSet: {
        definitionId: row.ruleset_definition_id,
        versionId: row.ruleset_version_id,
        versionCode: row.ruleset_version_code,
      },
      updatedAt: row.updated_at.toISOString(),
      updatedBy: actorFromRow(row),
    };
  }

  async save(command: SaveWorkspaceCommand): Promise<SaveWorkspaceResult> {
    return inTransaction(this.pool, async (client) => {
      const current = await client.query<Pick<WorkspaceRow,
        "project_id" | "legal_document_id" | "document_type_code" | "relation_type_code" | "revision">>(
        `SELECT w.project_id, w.legal_document_id, w.revision,
                p.document_type_code, d.relation_type_code
           FROM legal_builder.draft_workspace w
           JOIN legal_builder.legal_document d ON d.id = w.legal_document_id
           JOIN legal_builder.legal_document_project p ON p.id = w.project_id
          WHERE w.id = $1
          FOR UPDATE`,
        [command.workspaceId],
      );
      if (current.rowCount === 0) throw new AppError("NOT_FOUND", "Không tìm thấy workspace.");
      const row = current.rows[0];
      const actualRevision = Number(row.revision);
      if (actualRevision !== command.expectedRevision) {
        throw new AppError("REVISION_CONFLICT", "Workspace đã được cập nhật bởi phiên làm việc khác.", {
          expectedRevision: command.expectedRevision,
          actualRevision,
        });
      }
      if (row.legal_document_id !== command.document.legalDocumentId) {
        throw new AppError("INVALID_DOCUMENT", "Document không thuộc workspace này.");
      }
      if (row.document_type_code !== command.document.documentTypeCode || row.relation_type_code !== command.document.relationType) {
        throw new AppError("INVALID_DOCUMENT", "Loại hoặc quan hệ của document không khớp hồ sơ.");
      }

      const databaseClock = await client.query<{ synchronized_at: Date }>("SELECT clock_timestamp() AS synchronized_at");
      const synchronizedAt = databaseClock.rows[0].synchronized_at;
      const nextRevision = actualRevision + 1;
      await client.query("SET CONSTRAINTS ALL DEFERRED");
      await client.query("DELETE FROM legal_builder.workspace_legal_node WHERE workspace_id = $1", [command.workspaceId]);
      await insertNodes(client, command.workspaceId, command.document.nodes, command.actor, synchronizedAt);
      await client.query(
        `UPDATE legal_builder.draft_workspace
            SET revision = $2,
                contract_version = $3,
                ruleset_definition_id = $4,
                ruleset_version_id = $5,
                ruleset_version_code = $6,
                document_metadata = $7::jsonb,
                source_relations = $8::jsonb,
                updated_at = $9,
                updated_by_user_id = $10,
                updated_by_person_id = $11,
                updated_by_membership_id = $12,
                updated_under_delegation_id = $13
          WHERE id = $1`,
        [
          command.workspaceId,
          nextRevision,
          command.contractVersion,
          command.document.ruleSet.definitionId,
          command.document.ruleSet.versionId,
          command.document.ruleSet.versionCode,
          JSON.stringify(command.document.metadata),
          JSON.stringify(command.document.sourceRelations),
          synchronizedAt,
          command.actor.userId,
          command.actor.personId ?? null,
          command.actor.projectMembershipId ?? null,
          command.actor.delegationId ?? null,
        ],
      );
      await insertAudit(client, row.project_id, command, nextRevision, synchronizedAt);

      return {
        contractVersion: command.contractVersion,
        workspaceId: command.workspaceId,
        revision: nextRevision,
        synchronizedAt: synchronizedAt.toISOString(),
      };
    });
  }
}

async function insertNodes(
  client: PoolClient,
  workspaceId: string,
  nodes: LegalNode[],
  actor: ActorRef,
  updatedAt: Date,
): Promise<void> {
  for (const node of nodes) {
    await client.query(
      `INSERT INTO legal_builder.workspace_legal_node (
         workspace_id, legal_node_id, node_type_code, parent_node_id, order_key,
         title, content_blocks, metadata, display_number, display_number_locked,
         lifecycle_status_code, updated_at, updated_by_user_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13)`,
      [workspaceId, node.id, node.nodeTypeCode, node.parentNodeId, node.orderKey, node.title ?? null,
        JSON.stringify(node.content), JSON.stringify(node.metadata), node.displayNumber ?? null,
        node.displayNumberLocked ?? false, node.lifecycleStatus, updatedAt, actor.userId],
    );
  }
}

async function insertAudit(
  client: PoolClient,
  projectId: string,
  command: SaveWorkspaceCommand,
  nextRevision: number,
  occurredAt: Date,
): Promise<void> {
  await client.query(
    `INSERT INTO legal_builder.audit_event (
       id, project_id, event_type_code, aggregate_type_code, aggregate_id,
       actor_user_id, actor_person_id, actor_membership_id, actor_delegation_id,
       correlation_id, occurred_at, metadata
     ) VALUES ($1,$2,'WORKSPACE_SAVED','DRAFT_WORKSPACE',$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
    [randomUUID(), projectId, command.workspaceId, command.actor.userId, command.actor.personId ?? null,
      command.actor.projectMembershipId ?? null, command.actor.delegationId ?? null,
      command.correlationId, occurredAt,
      JSON.stringify({ previousRevision: command.expectedRevision, revision: nextRevision, nodeCount: command.document.nodes.length })],
  );
}

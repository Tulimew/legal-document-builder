import type { ActorRef, AuthorizedProjectSummary, ProjectDashboard } from "@legal-document-builder/contracts";
import type { Pool } from "pg";

import { AppError } from "./errors";

type Row = Record<string, unknown>;

function project(row: Row): AuthorizedProjectSummary {
  return {
    contractVersion: "1.1",
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    documentTypeCode: String(row.document_type_code),
    status: String(row.status_code),
    createdAt: new Date(String(row.created_at)).toISOString(),
    access: String(row.access_kind) as AuthorizedProjectSummary["access"],
  };
}

const ACCESS_CTE = `WITH actor_projects AS (
  SELECT m.project_id, 'MEMBERSHIP'::text access_kind, 1 priority
  FROM legal_builder.project_membership m
  JOIN legal_builder.user_account u ON u.id=m.user_id AND u.status_code='ACTIVE'
  JOIN legal_builder.membership_role mr ON mr.membership_id=m.id
  JOIN legal_builder.role_definition r ON r.id=mr.role_definition_id AND r.status_code='ACTIVE'
  JOIN legal_builder.role_permission rp ON rp.role_definition_id=r.id
  WHERE m.user_id=$1 AND m.status_code='ACTIVE'
    AND m.valid_from<=clock_timestamp() AND (m.valid_until IS NULL OR m.valid_until>clock_timestamp())
    AND r.effective_from<=clock_timestamp() AND (r.effective_until IS NULL OR r.effective_until>clock_timestamp())
  UNION ALL
  SELECT target.project_id, 'DELEGATION'::text, 2
  FROM legal_builder.project_membership target
  JOIN legal_builder.user_account u ON u.id=target.user_id AND u.status_code='ACTIVE'
  JOIN legal_builder.delegation d ON d.to_membership_id=target.id AND d.project_id=target.project_id
  JOIN legal_builder.delegation_permission dp ON dp.delegation_id=d.id
  WHERE target.user_id=$1 AND target.status_code='ACTIVE'
    AND target.valid_from<=clock_timestamp() AND (target.valid_until IS NULL OR target.valid_until>clock_timestamp())
    AND d.status_code='ACTIVE' AND d.valid_from<=clock_timestamp() AND d.valid_until>clock_timestamp()
), authorized AS (
  SELECT DISTINCT ON(project_id) project_id,access_kind FROM actor_projects ORDER BY project_id,priority
)`;

export class PostgresProductShellRepository {
  constructor(private readonly pool: Pool) {}

  async listProjects(actor: ActorRef): Promise<AuthorizedProjectSummary[]> {
    const result = await this.pool.query(`${ACCESS_CTE}
      SELECT p.*,a.access_kind FROM authorized a
      JOIN legal_builder.legal_document_project p ON p.id=a.project_id
      ORDER BY p.created_at DESC,p.id`, [actor.userId]);
    return result.rows.map(project);
  }

  async dashboard(actor: ActorRef, projectId: string): Promise<ProjectDashboard> {
    const result = await this.pool.query(`${ACCESS_CTE}
      SELECT p.*,a.access_kind,d.id legal_document_id,w.id workspace_id,w.branch_id,rr.id review_round_id,rr.source_draft_version_id review_source_version_id,rr.code review_round_code,rr.name review_round_name,
        (SELECT count(*) FROM legal_builder.workflow_stage_instance s WHERE s.project_id=p.id AND s.status_code IN('ACTIVE','BLOCKED')) active_workflow_stages,
        (SELECT count(*) FROM legal_builder.comment c WHERE c.project_id=p.id) total_comments,
        (SELECT count(*) FROM legal_builder.comment c WHERE c.project_id=p.id AND NOT EXISTS(SELECT 1 FROM legal_builder.comment_resolution r WHERE r.comment_id=c.id)) unresolved_comments,
        (SELECT count(*) FROM legal_builder.draft_branch b WHERE b.project_id=p.id AND b.status='ACTIVE') active_branches,
        (SELECT count(*) FROM legal_builder.draft_merge_operation m WHERE m.project_id=p.id AND m.status_code IN('CONFLICTS_OPEN','READY')) open_merge_operations,
        (SELECT count(*) FROM legal_builder.publishing_job j WHERE j.project_id=p.id AND j.status_code IN('QUEUED','RUNNING')) active_publishing_jobs,
        (SELECT count(*) FROM legal_builder.generated_document g WHERE g.project_id=p.id AND g.status_code='AVAILABLE') available_artifacts,
        (SELECT count(*) FROM legal_builder.release_package x WHERE x.project_id=p.id AND x.status_code='DRAFT') draft_packages,
        (SELECT count(*) FROM legal_builder.release_package x WHERE x.project_id=p.id AND x.status_code='SEALED') sealed_packages
      FROM authorized a JOIN legal_builder.legal_document_project p ON p.id=a.project_id
      JOIN legal_builder.legal_document d ON d.project_id=p.id
      JOIN LATERAL(SELECT x.id,x.branch_id FROM legal_builder.draft_workspace x JOIN legal_builder.draft_branch b ON b.id=x.branch_id WHERE x.project_id=p.id AND b.status='ACTIVE' ORDER BY x.updated_at DESC,x.id LIMIT 1) w ON true
      LEFT JOIN LATERAL(SELECT r.id,r.source_draft_version_id,r.code,r.name FROM legal_builder.review_round r WHERE r.project_id=p.id AND r.closed_at IS NULL ORDER BY r.opened_at DESC,r.id LIMIT 1) rr ON true
      WHERE p.id=$2`, [actor.userId, projectId]);
    if (!result.rowCount) throw new AppError("FORBIDDEN", "Bạn không có quyền xem hồ sơ này.");
    const row = result.rows[0];
    const versions = await this.pool.query(
      "SELECT id,code,name,sealed_at FROM legal_builder.draft_version WHERE project_id=$1 ORDER BY sealed_at DESC,id DESC LIMIT 8",
      [projectId],
    );
    const recentVersions = versions.rows.map((item) => ({ id: String(item.id), code: String(item.code), name: String(item.name), sealedAt: new Date(item.sealed_at).toISOString() }));
    return {
      contractVersion: "1.1",
      project: project(row),
      context: { legalDocumentId: String(row.legal_document_id), workspaceId: String(row.workspace_id), branchId: String(row.branch_id), ...(row.review_round_id ? { reviewRound: { id: String(row.review_round_id), sourceDraftVersionId: String(row.review_source_version_id), code: String(row.review_round_code), name: String(row.review_round_name) } } : {}) },
      ...(recentVersions[0] ? { latestVersion: recentVersions[0] } : {}),
      counts: {
        activeWorkflowStages: Number(row.active_workflow_stages), totalComments: Number(row.total_comments), unresolvedComments: Number(row.unresolved_comments),
        activeBranches: Number(row.active_branches), openMergeOperations: Number(row.open_merge_operations), queuedOrRunningPublishingJobs: Number(row.active_publishing_jobs),
        availableArtifacts: Number(row.available_artifacts), draftPackages: Number(row.draft_packages), sealedPackages: Number(row.sealed_packages),
      },
      recentVersions,
    };
  }
}

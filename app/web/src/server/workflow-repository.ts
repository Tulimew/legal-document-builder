import { randomUUID } from "node:crypto";
import type { ActorRef, AssignProjectWorkflowRequest, CreateWorkflowStageInstanceRequest, ProjectWorkflowReadModel, UpdateWorkflowStageInstanceRequest, WorkflowStageInstance } from "@legal-document-builder/contracts";
import type { Pool, PoolClient } from "pg";
import { inTransaction } from "./database";
import { AppError } from "./errors";

export class PostgresWorkflowRepository {
  constructor(private readonly pool: Pool) {}

  async configuration(projectId: string): Promise<ProjectWorkflowReadModel> {
    const result = await this.pool.query(`SELECT pw.workflow_version_id,v.version_code,s.stage_code,s.name,s.stage_order,s.repeatable,s.parallel_allowed,s.applicability_expression
      FROM legal_builder.project_workflow pw JOIN legal_builder.workflow_version v ON v.id=pw.workflow_version_id
      JOIN legal_builder.workflow_stage_definition s ON s.workflow_version_id=v.id
      WHERE pw.project_id=$1 ORDER BY s.stage_order,s.stage_code`, [projectId]);
    if (!result.rowCount) throw new AppError("NOT_FOUND", "Hồ sơ chưa được gán workflow.");
    return { contractVersion: "1.1", projectId, workflowVersionId: result.rows[0].workflow_version_id, versionCode: result.rows[0].version_code, stages: result.rows.map((row) => ({ code: row.stage_code, name: row.name, order: Number(row.stage_order), repeatable: row.repeatable, parallelAllowed: row.parallel_allowed, ...(row.applicability_expression ? { applicabilityExpression: row.applicability_expression } : {}) })) };
  }

  async list(projectId: string): Promise<WorkflowStageInstance[]> {
    const result = await this.pool.query("SELECT * FROM legal_builder.workflow_stage_instance WHERE project_id=$1 ORDER BY recorded_at,sequence", [projectId]);
    return result.rows.map((row) => ({ contractVersion: "1.1", id: row.id, projectId: row.project_id, workflowVersionId: row.workflow_version_id, stageCode: row.stage_code, sequence: Number(row.sequence), status: row.status_code, gateResult: row.gate_result_code, ...(row.assignee_membership_id ? { assigneeMembershipId: row.assignee_membership_id } : {}), ...(row.started_at ? { startedAt: row.started_at.toISOString() } : {}), ...(row.completed_at ? { completedAt: row.completed_at.toISOString() } : {}), ...(row.return_reason ? { returnReason: row.return_reason } : {}), recordedBy: { userId: row.recorded_by_user_id } }));
  }

  async assign(projectId: string, request: AssignProjectWorkflowRequest, actor: ActorRef) {
    return inTransaction(this.pool, async (client) => {
      const version = await client.query("SELECT 1 FROM legal_builder.workflow_version WHERE id=$1 AND status_code='APPROVED'", [request.workflowVersionId]);
      if (!version.rowCount) throw new AppError("INVALID_REQUEST", "Phiên bản workflow chưa được phê duyệt.");
      await client.query(`INSERT INTO legal_builder.project_workflow(project_id,workflow_version_id,assigned_at,assigned_by_user_id,migration_decision)
        VALUES($1,$2,clock_timestamp(),$3,$4) ON CONFLICT(project_id) DO UPDATE SET workflow_version_id=excluded.workflow_version_id,assigned_at=excluded.assigned_at,assigned_by_user_id=excluded.assigned_by_user_id,migration_decision=excluded.migration_decision`, [projectId, request.workflowVersionId, actor.userId, request.migrationDecision ?? null]);
      await audit(client, projectId, "WORKFLOW_ASSIGNED", projectId, actor, request.correlationId, { workflowVersionId: request.workflowVersionId });
      return { projectId, workflowVersionId: request.workflowVersionId };
    });
  }

  async create(projectId: string, request: CreateWorkflowStageInstanceRequest, actor: ActorRef) {
    return inTransaction(this.pool, async (client) => {
      const assigned = await client.query(`SELECT pw.workflow_version_id FROM legal_builder.project_workflow pw
        JOIN legal_builder.workflow_stage_definition s ON s.workflow_version_id=pw.workflow_version_id AND s.stage_code=$2
        WHERE pw.project_id=$1 FOR UPDATE OF pw`, [projectId, request.stageCode]);
      if (!assigned.rowCount) throw new AppError("INVALID_REQUEST", "Hồ sơ chưa được gán workflow hoặc bước không thuộc phiên bản đã gán.");
      const id = randomUUID();
      const sequence = await client.query("SELECT coalesce(max(sequence),0)+1 value FROM legal_builder.workflow_stage_instance WHERE project_id=$1 AND stage_code=$2", [projectId, request.stageCode]);
      await client.query(`INSERT INTO legal_builder.workflow_stage_instance(id,project_id,workflow_version_id,stage_code,sequence,status_code,gate_result_code,assignee_membership_id,started_at,recorded_at,recorded_by_user_id)
        VALUES($1,$2,$3,$4,$5,'ACTIVE','PENDING',$6,$7,clock_timestamp(),$8)`, [id, projectId, assigned.rows[0].workflow_version_id, request.stageCode, Number(sequence.rows[0].value), request.assigneeMembershipId ?? null, request.startedAt ?? new Date(), actor.userId]);
      await audit(client, projectId, "WORKFLOW_STAGE_STARTED", id, actor, request.correlationId, { stageCode: request.stageCode });
      return id;
    });
  }

  async update(projectId: string, id: string, request: UpdateWorkflowStageInstanceRequest, actor: ActorRef) {
    return inTransaction(this.pool, async (client) => {
      const result = await client.query(`UPDATE legal_builder.workflow_stage_instance SET status_code=$3,gate_result_code=$4,return_reason=$5,
        completed_at=CASE WHEN $3='COMPLETED' THEN clock_timestamp() ELSE NULL END WHERE id=$1 AND project_id=$2 RETURNING id`, [id, projectId, request.status, request.gateResult, request.returnReason ?? null]);
      if (!result.rowCount) throw new AppError("NOT_FOUND", "Không tìm thấy lần thực hiện bước.");
      await audit(client, projectId, "WORKFLOW_STAGE_UPDATED", id, actor, request.correlationId, { status: request.status, gateResult: request.gateResult });
      return { id, status: request.status, gateResult: request.gateResult };
    });
  }
}

async function audit(client: PoolClient, projectId: string, event: string, id: string, actor: ActorRef, correlationId: string, metadata: object) {
  await client.query(`INSERT INTO legal_builder.audit_event(id,project_id,event_type_code,aggregate_type_code,aggregate_id,actor_user_id,actor_person_id,actor_membership_id,actor_delegation_id,correlation_id,occurred_at,metadata)
    VALUES($1,$2,$3,'WORKFLOW_STAGE',$4,$5,$6,$7,$8,$9,clock_timestamp(),$10::jsonb)`, [randomUUID(), projectId, event, id, actor.userId, actor.personId ?? null, actor.projectMembershipId ?? null, actor.delegationId ?? null, correlationId, JSON.stringify(metadata)]);
}

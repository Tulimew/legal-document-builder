import { randomUUID } from "node:crypto";

import type { ActorRef, Comment, CommentResolution, CreateCommentRequest, ResolveCommentRequest } from "@legal-document-builder/contracts";
import type { Pool, PoolClient } from "pg";

import { inTransaction } from "./database";
import { AppError } from "./errors";

export class PostgresReviewRepository {
  constructor(private readonly pool: Pool) {}

  async listComments(projectId: string): Promise<Comment[]> {
    const result = await this.pool.query(
      `SELECT c.*,
              coalesce(array_agg(DISTINCT t.legal_node_id) FILTER (WHERE t.legal_node_id IS NOT NULL), '{}') AS target_node_ids,
              CASE WHEN latest.id IS NULL THEN 'PENDING' ELSE 'RESOLVED' END AS status,
              latest.id AS resolution_id, latest.sequence AS resolution_sequence,
              latest.resolution_type_code, latest.explanation, latest.effective_draft_version_id,
              latest.decided_at, latest.decided_by_user_id, latest.supersedes_resolution_id
         FROM legal_builder.comment c
         LEFT JOIN legal_builder.comment_target_node t ON t.comment_id = c.id
         LEFT JOIN LATERAL (SELECT * FROM legal_builder.comment_resolution r WHERE r.comment_id=c.id ORDER BY r.sequence DESC LIMIT 1) latest ON true
        WHERE c.project_id = $1
        GROUP BY c.id,latest.id,latest.sequence,latest.resolution_type_code,latest.explanation,
                 latest.effective_draft_version_id,latest.decided_at,latest.decided_by_user_id,latest.supersedes_resolution_id
        ORDER BY c.recorded_at DESC, c.id`,
      [projectId],
    );
    return result.rows.map((row) => ({
      contractVersion: "1.1",
      id: row.id,
      projectId: row.project_id,
      reviewRoundId: row.review_round_id,
      sourceDraftVersionId: row.source_draft_version_id,
      targetScopeType: row.target_scope_type_code,
      issueGroup: row.issue_group,
      targetNodeIds: row.target_node_ids,
      targetDescription: row.target_description,
      contributorOrganizationName: row.contributor_organization_name,
      commentContent: row.comment_content,
      status: row.status,
      receivedAt: row.received_at.toISOString(),
      recordedAt: row.recorded_at.toISOString(),
      recordedBy: { userId: row.recorded_by_user_id },
      ...(row.resolution_id?{latestResolution:{contractVersion:"1.1",id:row.resolution_id,commentId:row.id,sequence:Number(row.resolution_sequence),resolutionType:row.resolution_type_code,...(row.explanation?{explanation:row.explanation}:{}),linkedChangeIds:[],...(row.effective_draft_version_id?{effectiveDraftVersionId:row.effective_draft_version_id}:{}),decidedAt:row.decided_at.toISOString(),decidedBy:{userId:row.decided_by_user_id},...(row.supersedes_resolution_id?{supersedesResolutionId:row.supersedes_resolution_id}:{})}}:{})
    }));
  }

  async createComment(projectId: string, request: CreateCommentRequest, actor: ActorRef): Promise<Comment> {
    return inTransaction(this.pool, async (client) => {
      const round = await client.query(
        `SELECT 1 FROM legal_builder.review_round
          WHERE id = $1 AND project_id = $2 AND source_draft_version_id = $3 AND closed_at IS NULL
          FOR SHARE`,
        [request.reviewRoundId, projectId, request.sourceDraftVersionId],
      );
      if (!round.rowCount) throw new AppError("INVALID_REQUEST", "Đợt góp ý không tồn tại, đã đóng hoặc không dùng phiên bản nguồn này.");
      const id = randomUUID();
      const recordedAt = new Date();
      await client.query(
        `INSERT INTO legal_builder.comment (
          id, project_id, review_round_id, source_draft_version_id, target_scope_type_code, issue_group,
          target_description, contributor_organization_name, comment_content,
          received_at, recorded_at, recorded_by_user_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [id, projectId, request.reviewRoundId, request.sourceDraftVersionId, request.targetScopeType, request.issueGroup,
          request.targetDescription, request.contributorOrganizationName, request.commentContent,
          request.receivedAt, recordedAt, actor.userId],
      );
      for (const nodeId of request.targetNodeIds) {
        await client.query(
          `INSERT INTO legal_builder.comment_target_node(comment_id, draft_version_id, legal_node_id)
           VALUES ($1,$2,$3)`,
          [id, request.sourceDraftVersionId, nodeId],
        );
      }
      await audit(client, projectId, "COMMENT_RECORDED", "COMMENT", id, actor, request.correlationId, recordedAt, {
        reviewRoundId: request.reviewRoundId, targetCount: request.targetNodeIds.length,
      });
      return {
        contractVersion: request.contractVersion, id, projectId, reviewRoundId: request.reviewRoundId,
        sourceDraftVersionId: request.sourceDraftVersionId, targetScopeType: request.targetScopeType, issueGroup: request.issueGroup,
        targetNodeIds: request.targetNodeIds, targetDescription: request.targetDescription,
        contributorOrganizationName: request.contributorOrganizationName, commentContent: request.commentContent,
        status: "PENDING", receivedAt: request.receivedAt, recordedAt: recordedAt.toISOString(), recordedBy: actor,
      };
    });
  }

  async resolve(projectId: string, commentId: string, request: ResolveCommentRequest, actor: ActorRef): Promise<CommentResolution> {
    return inTransaction(this.pool, async (client) => {
      const comment = await client.query(
        `SELECT source_draft_version_id FROM legal_builder.comment WHERE id = $1 AND project_id = $2 FOR UPDATE`,
        [commentId, projectId],
      );
      if (!comment.rowCount) throw new AppError("NOT_FOUND", "Không tìm thấy ý kiến góp ý.");
      const previous = await client.query(
        `SELECT id, sequence FROM legal_builder.comment_resolution WHERE comment_id = $1 ORDER BY sequence DESC LIMIT 1`,
        [commentId],
      );
      if (request.effectiveDraftVersionId) {
        const version = await client.query("SELECT 1 FROM legal_builder.draft_version WHERE id = $1 AND project_id = $2", [request.effectiveDraftVersionId, projectId]);
        if (!version.rowCount) throw new AppError("INVALID_REQUEST", "Phiên bản dự thảo áp dụng không thuộc hồ sơ.");
      }
      if (request.linkedChangeIds.length) {
        const changes = await client.query(
          `SELECT id FROM legal_builder.draft_legal_node_change WHERE project_id = $1 AND id = ANY($2::uuid[])`,
          [projectId, request.linkedChangeIds],
        );
        if (changes.rowCount !== request.linkedChangeIds.length) throw new AppError("INVALID_REQUEST", "Có thay đổi dự thảo không thuộc hồ sơ.");
      }
      const id = randomUUID();
      const sequence = previous.rowCount ? Number(previous.rows[0].sequence) + 1 : 1;
      const decidedAt = new Date();
      await client.query(
        `INSERT INTO legal_builder.comment_resolution (
          id, comment_id, sequence, resolution_type_code, explanation, effective_draft_version_id,
          supersedes_resolution_id, decided_at, decided_by_user_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, commentId, sequence, request.resolutionType, request.explanation ?? null,
          request.effectiveDraftVersionId ?? null, previous.rows[0]?.id ?? null, decidedAt, actor.userId],
      );
      for (const changeId of request.linkedChangeIds) {
        await client.query("INSERT INTO legal_builder.comment_resolution_change(resolution_id, change_id) VALUES ($1,$2)", [id, changeId]);
        await client.query(
          `INSERT INTO legal_builder.draft_change_basis(change_id, source_type_code, source_id, label)
           VALUES ($1,'COMMENT_RESOLUTION',$2,$3) ON CONFLICT DO NOTHING`,
          [changeId, id, request.resolutionType],
        );
      }
      await audit(client, projectId, "COMMENT_RESOLVED", "COMMENT", commentId, actor, request.correlationId, decidedAt, {
        resolutionId: id, resolutionType: request.resolutionType, linkedChangeCount: request.linkedChangeIds.length,
      });
      return {
        contractVersion: request.contractVersion, id, commentId, sequence,
        resolutionType: request.resolutionType, ...(request.explanation ? { explanation: request.explanation } : {}),
        linkedChangeIds: request.linkedChangeIds,
        ...(request.effectiveDraftVersionId ? { effectiveDraftVersionId: request.effectiveDraftVersionId } : {}),
        decidedAt: decidedAt.toISOString(), decidedBy: actor,
        ...(previous.rows[0]?.id ? { supersedesResolutionId: previous.rows[0].id } : {}),
      };
    });
  }
}

async function audit(client: PoolClient, projectId: string, event: string, aggregateType: string,
  aggregateId: string, actor: ActorRef, correlationId: string, occurredAt: Date, metadata: object): Promise<void> {
  await client.query(
    `INSERT INTO legal_builder.audit_event(id, project_id, event_type_code, aggregate_type_code,
      aggregate_id, actor_user_id, actor_person_id, actor_membership_id, actor_delegation_id,
      correlation_id, occurred_at, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
    [randomUUID(), projectId, event, aggregateType, aggregateId, actor.userId, actor.personId ?? null,
      actor.projectMembershipId ?? null, actor.delegationId ?? null, correlationId, occurredAt, JSON.stringify(metadata)],
  );
}

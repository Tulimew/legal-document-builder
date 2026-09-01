import type { ActorRef, BaselinePermissionCode, SystemPermissionCode } from "@legal-document-builder/contracts";
import type { Pool } from "pg";

import { AppError } from "./errors";

export const canonicalPermissionMatrix = Object.freeze({
  "workspace:read": "WORKSPACE_READ",
  "workspace:save": "WORKSPACE_EDIT",
  "comment:list": "COMMENT_READ",
  "comment:create": "COMMENT_CREATE",
  "resolution:create": "COMMENT_RESOLVE",
  "workflow:read": "WORKFLOW_READ",
  "workflow:manage": "WORKFLOW_MANAGE",
  "branch:read": "DRAFT_BRANCH_READ",
  "branch:create": "DRAFT_BRANCH_CREATE",
  "merge:analyze": "DRAFT_MERGE_ANALYZE",
  "merge:resolve": "DRAFT_MERGE_RESOLVE",
  "merge:complete": "DRAFT_MERGE_COMPLETE",
  "publishing:request": "PUBLISHING_REQUEST",
  "release:seal": "RELEASE_PACKAGE_SEAL",
  "operations:read": "PROJECT_AUDIT_READ",
} satisfies Record<string, BaselinePermissionCode>);

interface GrantRow { membership_id:string; delegation_id:string|null; person_id:string|null }

export async function authorizeSystem(
  pool: Pool,
  actor: ActorRef,
  permission: SystemPermissionCode,
): Promise<ActorRef> {
  const result = await pool.query(
    `SELECT u.person_id FROM legal_builder.user_account u
      JOIN legal_builder.user_system_role_assignment a ON a.user_id=u.id AND a.revoked_at IS NULL
      JOIN legal_builder.system_role_definition r ON r.code=a.role_code AND r.status_code='ACTIVE'
      JOIN legal_builder.system_role_permission p ON p.role_code=r.code
      WHERE u.id=$1 AND u.status_code='ACTIVE' AND p.permission_code=$2 LIMIT 1`,
    [actor.userId, permission],
  );
  if (!result.rowCount) throw new AppError("FORBIDDEN", "Bạn không có quyền quản trị hệ thống.");
  return { userId: actor.userId, ...(result.rows[0].person_id ? { personId: String(result.rows[0].person_id) } : {}) };
}

export async function authorizeProject(
  pool: Pool,
  actor: ActorRef,
  projectId: string,
  permission: BaselinePermissionCode,
): Promise<ActorRef> {
  if (process.env.AUTH_MODE === "development" && process.env.AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION === "true") {
    return actor;
  }
  const result = await pool.query<GrantRow>(
    `WITH direct_grant AS (
       SELECT m.id AS membership_id, NULL::uuid AS delegation_id, m.person_id
         FROM legal_builder.project_membership m
         JOIN legal_builder.user_account u ON u.id = m.user_id
         JOIN legal_builder.membership_role mr ON mr.membership_id = m.id
         JOIN legal_builder.role_definition r ON r.id = mr.role_definition_id
         JOIN legal_builder.role_permission rp ON rp.role_definition_id = r.id
        WHERE m.project_id = $1 AND m.user_id = $2 AND m.status_code = 'ACTIVE'
          AND m.valid_from <= clock_timestamp() AND (m.valid_until IS NULL OR m.valid_until > clock_timestamp())
          AND u.status_code = 'ACTIVE' AND r.status_code = 'ACTIVE'
          AND r.effective_from <= clock_timestamp() AND (r.effective_until IS NULL OR r.effective_until > clock_timestamp())
          AND rp.permission_code = $3
     ), delegated_grant AS (
       SELECT target.id AS membership_id, d.id AS delegation_id, target.person_id
         FROM legal_builder.project_membership target
         JOIN legal_builder.user_account u ON u.id = target.user_id
         JOIN legal_builder.delegation d ON d.to_membership_id = target.id AND d.project_id = target.project_id
         JOIN legal_builder.delegation_permission dp ON dp.delegation_id = d.id
        WHERE target.project_id = $1 AND target.user_id = $2 AND target.status_code = 'ACTIVE'
          AND target.valid_from <= clock_timestamp() AND (target.valid_until IS NULL OR target.valid_until > clock_timestamp())
          AND u.status_code = 'ACTIVE' AND d.status_code = 'ACTIVE'
          AND d.valid_from <= clock_timestamp() AND d.valid_until > clock_timestamp()
          AND dp.permission_code = $3
     ) SELECT * FROM direct_grant UNION ALL SELECT * FROM delegated_grant LIMIT 1`,
    [projectId, actor.userId, permission],
  );
  if (!result.rowCount) throw new AppError("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này trong hồ sơ.");
  const grant = result.rows[0];
  return {
    userId: actor.userId,
    ...(grant.person_id ? { personId: grant.person_id } : {}),
    projectMembershipId: grant.membership_id,
    ...(grant.delegation_id ? { delegationId: grant.delegation_id } : {}),
  };
}

export async function projectIdForWorkspace(pool: Pool, workspaceId: string): Promise<string> {
  const result = await pool.query<{project_id:string}>("SELECT project_id FROM legal_builder.draft_workspace WHERE id = $1", [workspaceId]);
  if (!result.rowCount) throw new AppError("NOT_FOUND", "Không tìm thấy workspace.");
  return result.rows[0].project_id;
}

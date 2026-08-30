import type { ContractVersion, EntityId, IsoDateTime } from "./common";

export type MembershipStatus = "ACTIVE" | "SUSPENDED" | "ENDED";
export type DelegationStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export interface AuthenticatedIdentity {
  contractVersion: ContractVersion;
  userId: EntityId;
  externalProviderCode: string;
  externalSubject: string;
}

export interface ProjectMembership {
  contractVersion: ContractVersion;
  id: EntityId;
  projectId: EntityId;
  userId: EntityId;
  personId?: EntityId;
  organizationId?: EntityId;
  status: MembershipStatus;
  validFrom: IsoDateTime;
  validUntil?: IsoDateTime;
  roleCodes: string[];
}

export interface Delegation {
  contractVersion: ContractVersion;
  id: EntityId;
  projectId: EntityId;
  fromMembershipId: EntityId;
  toMembershipId: EntityId;
  permissionCodes: string[];
  validFrom: IsoDateTime;
  validUntil: IsoDateTime;
  status: DelegationStatus;
  reason: string;
}

export type BaselinePermissionCode =
  | "WORKSPACE_READ"
  | "WORKSPACE_EDIT"
  | "COMMENT_READ"
  | "COMMENT_CREATE"
  | "COMMENT_RESOLVE"
  | "RESOLUTION_OPINION_CREATE"
  | "RESOLUTION_DECIDE"
  | "WORKFLOW_READ"
  | "WORKFLOW_MANAGE"
  | "WORKFLOW_GATE_DECIDE"
  | "AMENDMENT_TARGET_READ"
  | "AMENDMENT_TARGET_MANAGE"
  | "STEP4_CHANGE_READ"
  | "STEP4_CHANGE_CREATE"
  | "STEP4_CHANGE_DECIDE"
  | "STEP4_FINALIZE"
  | "DRAFT_VERSION_CREATE"
  | "DRAFT_BRANCH_READ"
  | "DRAFT_BRANCH_CREATE"
  | "DRAFT_BRANCH_CLOSE"
  | "DRAFT_MERGE_ANALYZE"
  | "DRAFT_MERGE_RESOLVE"
  | "DRAFT_MERGE_COMPLETE"
  | "PUBLISHING_TEMPLATE_READ"
  | "PUBLISHING_TEMPLATE_MANAGE"
  | "PUBLISHING_REQUEST"
  | "PUBLISHING_READ"
  | "RELEASE_PACKAGE_CREATE"
  | "RELEASE_PACKAGE_SEAL"
  | "RELEASE_PACKAGE_READ";

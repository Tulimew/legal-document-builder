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
  | "WORKFLOW_GATE_DECIDE";

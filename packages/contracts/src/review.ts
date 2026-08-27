import type { ActorRef, BusinessSourceRef, ContractVersion, EntityId, IsoDateTime } from "./common";

export type ReviewRoundType = "CONSULTATION" | "MEETING" | "DIRECTION" | "REVISION" | "APPRAISAL";
export type CommentStatus = "PENDING" | "RESOLVED";
export type CommentTargetScopeType = "SECTION" | "CHAPTER" | "ARTICLE" | "CLAUSE" | "POINT" | "OTHER";
export type CommentResolutionType =
  | "ACCEPTED_AND_UPDATED"
  | "PARTIALLY_ACCEPTED"
  | "EXPLAINED_NOT_ACCEPTED";
export type DraftAdjustmentSourceType = "COMMENT" | "DIRECTION" | "DRAFTING_TEAM_INITIATIVE";

export interface ReviewRound {
  contractVersion: ContractVersion;
  id: EntityId;
  projectId: EntityId;
  sourceDraftVersionId: EntityId;
  roundType: ReviewRoundType;
  code: string;
  name: string;
  openedAt: IsoDateTime;
  openedBy: ActorRef;
  closedAt?: IsoDateTime;
}

export interface Comment {
  contractVersion: ContractVersion;
  id: EntityId;
  projectId: EntityId;
  reviewRoundId: EntityId;
  sourceDraftVersionId: EntityId;
  targetScopeType: CommentTargetScopeType;
  issueGroup: string;
  targetNodeIds: EntityId[];
  targetDescription: string;
  contributorOrganizationName: string;
  commentContent: string;
  status: CommentStatus;
  receivedAt: IsoDateTime;
  recordedAt: IsoDateTime;
  recordedBy: ActorRef;
}

export interface CommentResolution {
  contractVersion: ContractVersion;
  id: EntityId;
  commentId: EntityId;
  sequence: number;
  resolutionType: CommentResolutionType;
  explanation?: string;
  linkedChangeIds: EntityId[];
  effectiveDraftVersionId?: EntityId;
  decidedAt: IsoDateTime;
  decidedBy: ActorRef;
  supersedesResolutionId?: EntityId;
}

export interface DraftAdjustmentBasis {
  sourceType: DraftAdjustmentSourceType;
  source: BusinessSourceRef;
  note?: string;
}

export interface CreateCommentRequest {
  contractVersion: ContractVersion;
  reviewRoundId: EntityId;
  sourceDraftVersionId: EntityId;
  targetScopeType: CommentTargetScopeType;
  issueGroup: string;
  targetNodeIds: EntityId[];
  targetDescription: string;
  contributorOrganizationName: string;
  commentContent: string;
  receivedAt: IsoDateTime;
  correlationId: string;
}

export interface ResolveCommentRequest {
  contractVersion: ContractVersion;
  resolutionType: CommentResolutionType;
  explanation?: string;
  linkedChangeIds: EntityId[];
  effectiveDraftVersionId?: EntityId;
  correlationId: string;
}

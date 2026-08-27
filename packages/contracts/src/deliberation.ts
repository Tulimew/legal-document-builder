import type { ActorRef, ContractVersion, EntityId, IsoDateTime } from "./common";
import type { CommentResolutionType } from "./review";

export type ResolutionCaseStatus = "OPEN" | "DECIDED" | "CLOSED";
export type ResolutionDecisionType = "SELECT_OPTION" | "KEEP_CURRENT" | "COMBINE" | "RESEARCH_MORE" | "SEEK_AUTHORITY";

export interface MemberResolutionOpinion {
  contractVersion: ContractVersion;
  id: EntityId;
  resolutionCaseId: EntityId;
  memberMembershipId: EntityId;
  proposedResolutionType: CommentResolutionType;
  reasoning: string;
  proposedDraftContent?: string;
  recordedAt: IsoDateTime;
  recordedBy: ActorRef;
  supersedesOpinionId?: EntityId;
}

export interface ResolutionOption {
  contractVersion: ContractVersion;
  id: EntityId;
  resolutionCaseId: EntityId;
  code: string;
  proposedResolutionType: CommentResolutionType;
  summary: string;
  proposedDraftContent?: string;
  sourceOpinionIds: EntityId[];
  createdAt: IsoDateTime;
  createdBy: ActorRef;
}

export interface ResolutionDecision {
  contractVersion: ContractVersion;
  id: EntityId;
  resolutionCaseId: EntityId;
  sequence: number;
  decisionType: ResolutionDecisionType;
  selectedOptionId?: EntityId;
  reason: string;
  authorityBasis: string;
  draftingInstruction?: string;
  decidedAt: IsoDateTime;
  decidedBy: ActorRef;
  supersedesDecisionId?: EntityId;
}

export interface DecideResolutionCaseRequest {
  contractVersion: ContractVersion;
  decisionType: ResolutionDecisionType;
  selectedOptionId?: EntityId;
  reason: string;
  authorityBasis: string;
  draftingInstruction?: string;
  correlationId: string;
}

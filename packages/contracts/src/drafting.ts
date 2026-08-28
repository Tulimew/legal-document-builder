import type {
  ActorRef,
  BusinessSourceRef,
  ContractVersion,
  EntityId,
  IsoDateTime,
  RevisionNumber,
  VersionedConfigRef,
} from "./common";
import type { LegalDocumentSnapshot, LegalNode } from "./legal-content";

export type DraftBranchStatus = "ACTIVE" | "CLOSED" | "MERGED";
export type CheckpointKind = "AUTOMATIC" | "MANUAL" | "PRE_VERSION" | "PRE_RESTORE" | "PRE_MERGE";
export type DraftNodeChangeType =
  | "DRAFT_ADD"
  | "DRAFT_REMOVE"
  | "DRAFT_RENUMBER"
  | "DRAFT_MOVE"
  | "DRAFT_CONTENT_CHANGE"
  | "DRAFT_MOVE_AND_CONTENT_CHANGE";
export type Step4ChangeSourceType="MEETING_CONCLUSION"|"TECHNICAL_EDIT"|"DRAFTING_TEAM_INITIATIVE"|"NEW_DIRECTION";
export type Step4ChangeDecisionType="APPROVE"|"REJECT"|"REQUEST_REVISION";
export interface Step4ChangeDecision{contractVersion:ContractVersion;id:EntityId;proposalId:EntityId;sequence:number;decisionType:Step4ChangeDecisionType;reason:string;authorityBasis:string;decidedAt:IsoDateTime;decidedBy:ActorRef;supersedesDecisionId?:EntityId}
export interface Step4ChangeProposal{contractVersion:ContractVersion;id:EntityId;projectId:EntityId;workspaceId:EntityId;legalNodeId:EntityId;location:string;beforeState:Record<string,unknown>;afterState:Record<string,unknown>;sourceType:Step4ChangeSourceType;sourceReference?:string;reason:string;authorityBasis?:string;changesMeetingConclusion:boolean;status:"PENDING_APPROVAL"|"APPROVED"|"REJECTED"|"REVISION_REQUESTED";recordedAt:IsoDateTime;recordedBy:ActorRef;latestDecision?:Step4ChangeDecision}
export interface CreateStep4ChangeProposalRequest{contractVersion:ContractVersion;legalNodeId:EntityId;location:string;beforeState:Record<string,unknown>;afterState:Record<string,unknown>;sourceType:Step4ChangeSourceType;sourceReference?:string;reason:string;authorityBasis?:string;changesMeetingConclusion:boolean;correlationId:string}
export interface DecideStep4ChangeProposalRequest{contractVersion:ContractVersion;decisionType:Step4ChangeDecisionType;reason:string;authorityBasis:string;correlationId:string}
export interface Step4FinalizationReadiness{contractVersion:ContractVersion;workspaceId:EntityId;workspaceRevision:RevisionNumber;parentVersionId:EntityId;parentVersionCode:string;approvedProposalCount:number;pendingProposalCount:number;revisionRequestedCount:number;conflicts:Array<{proposalId:EntityId;legalNodeId:EntityId;message:string}>;ready:boolean}
export interface FinalizeStep4Request{contractVersion:ContractVersion;expectedRevision:RevisionNumber;versionCode:string;versionName:string;completionReport:string;authorityBasis:string;correlationId:string}
export interface Step4FinalizationResult{contractVersion:ContractVersion;finalizationId:EntityId;workspaceId:EntityId;checkpointId:EntityId;parentVersionId:EntityId;draftVersionId:EntityId;draftVersionCode:string;appliedProposalIds:EntityId[];legalChangeIds:EntityId[];workspaceRevision:RevisionNumber;sealedAt:IsoDateTime;sealedBy:ActorRef}

export interface DraftBranch {
  contractVersion: ContractVersion;
  id: EntityId;
  projectId: EntityId;
  code: string;
  name: string;
  purpose: string;
  status: DraftBranchStatus;
  forkedFromVersionId?: EntityId;
  createdAt: IsoDateTime;
  createdBy: ActorRef;
  closedAt?: IsoDateTime;
  closedReason?: string;
}

export interface DraftWorkspace {
  contractVersion: ContractVersion;
  id: EntityId;
  projectId: EntityId;
  branchId: EntityId;
  revision: RevisionNumber;
  document: LegalDocumentSnapshot;
  ruleSet: VersionedConfigRef;
  updatedAt: IsoDateTime;
  updatedBy: ActorRef;
}

export interface DraftCheckpoint {
  contractVersion: ContractVersion;
  id: EntityId;
  workspaceId: EntityId;
  branchId: EntityId;
  sourceRevision: RevisionNumber;
  kind: CheckpointKind;
  label?: string;
  reason?: string;
  document: LegalDocumentSnapshot;
  createdAt: IsoDateTime;
  createdBy: ActorRef;
}

export interface DraftVersionBasis {
  id: EntityId;
  basisTypeCode: string;
  source: BusinessSourceRef;
  roleCode: string;
  summary: string;
  note?: string;
  recordedAt: IsoDateTime;
  recordedBy: ActorRef;
}

export interface DraftVersion {
  contractVersion: ContractVersion;
  id: EntityId;
  projectId: EntityId;
  branchId: EntityId;
  code: string;
  name: string;
  description?: string;
  parentVersionIds: EntityId[];
  mergedSourceVersionIds: EntityId[];
  sourceCheckpointId?: EntityId;
  document: LegalDocumentSnapshot;
  ruleSet: VersionedConfigRef;
  bases: DraftVersionBasis[];
  sealedAt: IsoDateTime;
  sealedBy: ActorRef;
}

export interface LegalNodeVersionState {
  draftVersionId: EntityId;
  legalNodeId: EntityId;
  exists: boolean;
  parentNodeId: EntityId | null;
  orderKey: string;
  displayNumber?: string;
  node?: LegalNode;
}

export interface DraftLegalNodeChange {
  contractVersion: ContractVersion;
  id: EntityId;
  projectId: EntityId;
  branchId: EntityId;
  legalNodeId: EntityId;
  changeType: DraftNodeChangeType;
  fromVersionId: EntityId;
  effectiveVersionId: EntityId;
  before: LegalNodeVersionState;
  after: LegalNodeVersionState;
  reason: string;
  basisRefs: BusinessSourceRef[];
  proposedBy: ActorRef;
  performedBy: ActorRef;
  decidedBy: ActorRef;
  decidedAt: IsoDateTime;
}

export interface SaveWorkspaceCommand {
  contractVersion: ContractVersion;
  workspaceId: EntityId;
  expectedRevision: RevisionNumber;
  document: LegalDocumentSnapshot;
  actor: ActorRef;
  correlationId: string;
}

export interface SaveWorkspaceResult {
  contractVersion: ContractVersion;
  workspaceId: EntityId;
  revision: RevisionNumber;
  synchronizedAt: IsoDateTime;
}

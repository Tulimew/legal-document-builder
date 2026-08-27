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

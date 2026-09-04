import type { ContractVersion, EntityId, IsoDateTime } from "./common";

export interface AuthorizedProjectSummary {
  contractVersion: ContractVersion;
  id: EntityId;
  code: string;
  name: string;
  description?: string;
  documentTypeCode: string;
  status: string;
  createdAt: IsoDateTime;
  access: "MEMBERSHIP" | "DELEGATION";
}

export interface UpdateLegalProjectRequest { contractVersion:ContractVersion; name:string; description:string; status:"ACTIVE"|"PAUSED"|"COMPLETED"|"ARCHIVED"; reason:string; correlationId:string }

export interface ProjectDashboard {
  contractVersion: ContractVersion;
  project: AuthorizedProjectSummary;
  context: { legalDocumentId: EntityId; workspaceId: EntityId; branchId: EntityId; reviewRound?: { id: EntityId; sourceDraftVersionId: EntityId; code: string; name: string } };
  latestVersion?: { id: EntityId; code: string; name: string; sealedAt: IsoDateTime };
  counts: {
    activeWorkflowStages: number;
    totalComments: number;
    unresolvedComments: number;
    activeBranches: number;
    openMergeOperations: number;
    queuedOrRunningPublishingJobs: number;
    availableArtifacts: number;
    draftPackages: number;
    sealedPackages: number;
  };
  recentVersions: Array<{ id: EntityId; code: string; name: string; sealedAt: IsoDateTime }>;
}

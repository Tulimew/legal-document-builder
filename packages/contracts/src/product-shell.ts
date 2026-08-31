import type { ContractVersion, EntityId, IsoDateTime } from "./common";

export interface AuthorizedProjectSummary {
  contractVersion: ContractVersion;
  id: EntityId;
  code: string;
  name: string;
  documentTypeCode: string;
  status: string;
  createdAt: IsoDateTime;
  access: "MEMBERSHIP" | "DELEGATION";
}

export interface ProjectDashboard {
  contractVersion: ContractVersion;
  project: AuthorizedProjectSummary;
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

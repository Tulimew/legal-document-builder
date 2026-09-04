import type { ContractVersion, EntityId, IsoDateTime } from "./common";

export type ProjectCreationMode = "NEW_DOCUMENT" | "AMEND_DOCUMENTS";

export interface LegalDocumentTypeOption {
  contractVersion: ContractVersion;
  code: string;
  name: string;
}

export interface CreateLegalProjectRequest {
  contractVersion: ContractVersion;
  code: string;
  name: string;
  description?: string;
  documentTypeCode: string;
  creationMode: ProjectCreationMode;
  targetDocumentCount: number;
  correlationId: string;
}

export interface CreatedLegalProject {
  contractVersion: ContractVersion;
  projectId: EntityId;
  workspaceId: EntityId;
  draftVersionId: EntityId;
  createdAt: IsoDateTime;
}

export type RuleSetStatus = "REFERENCE_ONLY" | "DEVELOPMENT_ONLY" | "ACTIVE" | "RETIRED";
export interface LegalRuleSource {
  sourceName: string;
  documentNumber: string;
  issuedDate: string;
  effectiveStatus: string;
  effectiveDate?: string;
  relevantProvisions: string;
  approvalBasis: string;
}
export interface LegalStructureRuleSetSummary {
  contractVersion: ContractVersion;
  definitionId: EntityId;
  code: string;
  name: string;
  definitionStatus: RuleSetStatus;
  versionId: EntityId;
  versionCode: string;
  versionStatus: RuleSetStatus;
  configuration: Record<string, unknown>;
  provenance: LegalRuleSource & Record<string, unknown>;
  createdAt: IsoDateTime;
}
export interface CreateLegalStructureRuleSetRequest {
  contractVersion: ContractVersion;
  code: string;
  name: string;
  versionCode: string;
  allowedNodeTypes: string[];
  allowedRootTypes: string[];
  allowedChildren: Record<string, string[]>;
  managedNumberTypes: string[];
  provenance: LegalRuleSource;
  correlationId: string;
}

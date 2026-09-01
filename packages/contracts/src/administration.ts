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

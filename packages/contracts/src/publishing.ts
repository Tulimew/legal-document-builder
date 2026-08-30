import type { ActorRef, ContractVersion, EntityId, IsoDateTime, JsonValue, RevisionNumber } from "./common";

export type PublishingTemplateStatus="DEVELOPMENT_ONLY"|"APPROVED"|"RETIRED";
export type PublishingArtifactKind="DRAFT_DOCX"|"DRAFT_PDF"|"REVIEW_SYNTHESIS_DOCX"|"DRAFT_COMPARISON_DOCX";
export type PublishingJobStatus="QUEUED"|"RUNNING"|"SUCCEEDED"|"FAILED"|"CANCELLED";
export type GeneratedDocumentStatus="AVAILABLE"|"FAILED_VERIFICATION"|"ORPHANED";
export type ReleasePackageStatus="DRAFT"|"SEALED"|"SUPERSEDED";

export interface PublishingTemplateVersion { contractVersion:ContractVersion;id:EntityId;definitionId:EntityId;code:string;name:string;versionCode:string;status:PublishingTemplateStatus;rendererKind:string;schemaVersion:string;configuration:Record<string,JsonValue>;provenance:Record<string,JsonValue>;createdAt:IsoDateTime }
export interface CreatePublishingJobRequest { contractVersion:ContractVersion;artifactKind:PublishingArtifactKind;sourceDraftVersionId:EntityId;templateVersionId:EntityId;idempotencyKey:string;correlationId:string }
export interface PublishingJob { contractVersion:ContractVersion;id:EntityId;projectId:EntityId;artifactKind:PublishingArtifactKind;sourceDraftVersionId:EntityId;templateVersionId:EntityId;inputFingerprint:string;status:PublishingJobStatus;attempts:number;maxAttempts:number;requestedAt:IsoDateTime;requestedBy:ActorRef;generatedDocumentId?:EntityId }
export interface GeneratedDocument { contractVersion:ContractVersion;id:EntityId;projectId:EntityId;jobId:EntityId;artifactKind:PublishingArtifactKind;sourceDraftVersionId:EntityId;templateVersionId:EntityId;rendererVersion:string;mediaType:string;byteSize:number;checksumSha256:string;status:GeneratedDocumentStatus;createdAt:IsoDateTime }
export interface CreateReleasePackageRequest { contractVersion:ContractVersion;code:string;name:string;purpose:string;correlationId:string }
export interface AddReleasePackageItemRequest { contractVersion:ContractVersion;expectedRevision:RevisionNumber;itemType:"DRAFT_VERSION"|"GENERATED_DOCUMENT"|"SUPPORTING_DOCUMENT";itemId:EntityId;roleCode:string;label:string;itemOrder:number;correlationId:string }
export interface SealReleasePackageRequest { contractVersion:ContractVersion;expectedRevision:RevisionNumber;authorityBasis:string;correlationId:string }
export interface ReleasePackage { contractVersion:ContractVersion;id:EntityId;projectId:EntityId;code:string;name:string;purpose:string;status:ReleasePackageStatus;revision:RevisionNumber;manifestChecksumSha256?:string;createdAt:IsoDateTime;sealedAt?:IsoDateTime }

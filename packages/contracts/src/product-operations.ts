import type { ContractVersion, EntityId, IsoDateTime } from "./common";

export type ProjectSearchEntityType="PROJECT"|"DRAFT_VERSION"|"COMMENT"|"GENERATED_DOCUMENT"|"RELEASE_PACKAGE";
export interface ProjectSearchItem{type:ProjectSearchEntityType;id:EntityId;title:string;detail:string;occurredAt:IsoDateTime}
export interface ProjectSearchPage{contractVersion:ContractVersion;items:ProjectSearchItem[];nextCursor?:string}
export interface ProjectActivityItem{id:EntityId;eventType:string;aggregateType:string;aggregateId:EntityId;actorDisplayName:string;correlationId:string;occurredAt:IsoDateTime}
export interface ProjectActivityPage{contractVersion:ContractVersion;items:ProjectActivityItem[];nextCursor?:string}
export interface ProjectMembershipSummary{id:EntityId;displayName:string;organizationName?:string;status:string;validFrom:IsoDateTime;validUntil?:IsoDateTime;roles:string[]}

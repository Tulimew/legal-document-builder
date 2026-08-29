import type {ActorRef,ContractVersion,EntityId,IsoDateTime} from "./common";
export type ProvenanceLinkStatus="VERIFIED"|"MISSING"|"UNVERIFIED_REFERENCE"|"REDACTED";
export interface ProvenanceEntityRef{type:string;id:EntityId;label?:string}
export interface ProvenanceEdge{from:ProvenanceEntityRef;to?:ProvenanceEntityRef;relation:string;status:ProvenanceLinkStatus}
export interface ProvenanceEntry{entity:ProvenanceEntityRef;occurredAt?:IsoDateTime;actor?:ActorRef;summary?:string;edges:ProvenanceEdge[]}
export interface ProvenancePage{contractVersion:ContractVersion;anchor:ProvenanceEntityRef;entries:ProvenanceEntry[];nextCursor?:string}

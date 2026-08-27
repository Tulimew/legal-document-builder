export const SUPPORTED_CONTRACT_VERSIONS = ["1.0", "1.1"] as const;
export const CONTRACT_VERSION = "1.1" as const;

export type ContractVersion = (typeof SUPPORTED_CONTRACT_VERSIONS)[number];
export type EntityId = string;
export type IsoDateTime = string;
export type RevisionNumber = number;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface ActorRef {
  userId: EntityId;
  personId?: EntityId;
  projectMembershipId?: EntityId;
  delegationId?: EntityId;
}

export interface VersionedConfigRef {
  definitionId: EntityId;
  versionId: EntityId;
  versionCode: string;
}

export interface BusinessSourceRef {
  sourceType: string;
  sourceId: EntityId;
  sourceVersionId?: EntityId;
  label?: string;
}

export interface ContractEnvelope<T> {
  contractVersion: ContractVersion;
  data: T;
}

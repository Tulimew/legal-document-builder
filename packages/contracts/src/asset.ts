import type {
  ActorRef,
  BusinessSourceRef,
  ContractVersion,
  EntityId,
  IsoDateTime,
  JsonValue,
} from "./common";

export interface AssetChecksum {
  algorithm: "SHA-256";
  value: string;
}

export interface AssetRef {
  assetId: EntityId;
  assetVersionId: EntityId;
  mediaType: string;
  byteSize: number;
  checksum: AssetChecksum;
}

export interface AssetDescriptor extends AssetRef {
  contractVersion: ContractVersion;
  originalFileName: string;
  verificationStatus: string;
  source?: BusinessSourceRef;
  metadata: Record<string, JsonValue>;
  createdAt: IsoDateTime;
  createdBy: ActorRef;
}

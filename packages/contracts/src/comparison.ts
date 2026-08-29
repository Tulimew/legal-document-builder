import type { ContractVersion, EntityId, IsoDateTime } from "./common";
import type { LegalContentBlock, LegalNode } from "./legal-content";

export type DraftVersionChangeKind = "ADDED" | "DELETED" | "MODIFIED" | "MOVED" | "RENUMBERED";
export type MovementDetail = "REORDERED" | "REPARENTED";
export type ComparedNodeState =
  | { exists: true; node: LegalNode; parentNodeId: EntityId | null; orderKey: string; displayNumber?: string }
  | { exists: false };
export interface StructuredBlockDiff { index: number; kind: string; before?: LegalContentBlock; after?: LegalContentBlock }
export interface DraftVersionSummary { id: EntityId; code: string; name: string; branchId: EntityId; legalDocumentId: EntityId; sealedAt: IsoDateTime }
export interface DraftVersionNodeDiff { legalNodeId: EntityId; kinds: DraftVersionChangeKind[]; before: ComparedNodeState; after: ComparedNodeState; movementDetail?: MovementDetail; blockChanges: StructuredBlockDiff[] }
export interface DraftVersionComparisonPage { contractVersion: ContractVersion; base: DraftVersionSummary; target: DraftVersionSummary; changes: DraftVersionNodeDiff[]; counts: Record<DraftVersionChangeKind,number>; evolution: { available: boolean; versionIds?: EntityId[] }; nextCursor?: string }

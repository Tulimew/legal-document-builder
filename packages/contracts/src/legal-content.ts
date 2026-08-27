import type {
  BusinessSourceRef,
  ContractVersion,
  EntityId,
  JsonValue,
  VersionedConfigRef,
} from "./common";
import type { AssetRef } from "./asset";

export type LegalDocumentRelationType =
  | "NEW_DOCUMENT"
  | "AMENDING_DOCUMENT"
  | "REPLACING_DOCUMENT"
  | "REPEALING_DOCUMENT"
  | "OTHER_CONFIGURED_RELATION";

export type InlineMark =
  | "BOLD"
  | "ITALIC"
  | "UNDERLINE"
  | "SUPERSCRIPT"
  | "SUBSCRIPT";

export interface InternalReference {
  kind: "INTERNAL_REFERENCE";
  targetNodeId: EntityId;
  referenceType: string;
}

export interface ExternalReference {
  kind: "EXTERNAL_REFERENCE";
  sourceDocumentId: EntityId;
  locator?: string;
  verificationStatus: string;
}

export interface InlineSpan {
  text: string;
  marks?: InlineMark[];
  reference?: InternalReference | ExternalReference;
  footnoteId?: EntityId;
}

export interface ParagraphBlock {
  kind: "PARAGRAPH";
  spans: InlineSpan[];
}

export interface ListItem {
  id: EntityId;
  blocks: ParagraphBlock[];
}

export interface ListBlock {
  kind: "LIST";
  styleCode: string;
  items: ListItem[];
}

export interface TableCell {
  id: EntityId;
  rowSpan?: number;
  columnSpan?: number;
  blocks: ParagraphBlock[];
}

export interface TableRow {
  id: EntityId;
  cells: TableCell[];
}

export interface TableBlock {
  kind: "TABLE";
  tableId?: EntityId;
  caption?: ParagraphBlock[];
  source?: BusinessSourceRef;
  verificationStatus?: string;
  metadata?: Record<string, JsonValue>;
  rows: TableRow[];
}

export interface FigureBlock {
  kind: "FIGURE";
  figureId: EntityId;
  asset: AssetRef;
  alternativeText: string;
  caption?: ParagraphBlock[];
  source?: BusinessSourceRef;
  verificationStatus: string;
  displayRoleCode: string;
  metadata: Record<string, JsonValue>;
}

export type LegalContentBlock = ParagraphBlock | ListBlock | TableBlock | FigureBlock;

export interface LegalNode {
  id: EntityId;
  nodeTypeCode: string;
  parentNodeId: EntityId | null;
  orderKey: string;
  title?: string;
  content: LegalContentBlock[];
  metadata: Record<string, JsonValue>;
  displayNumber?: string;
  displayNumberLocked?: boolean;
  lifecycleStatus: string;
}

export interface LegalDocumentSourceRelation {
  relationType: LegalDocumentRelationType;
  sourceDocumentId: EntityId;
  sourceVersionId?: EntityId;
  verificationStatus: string;
}

export interface LegalDocumentSnapshot {
  contractVersion: ContractVersion;
  legalDocumentId: EntityId;
  documentTypeCode: string;
  relationType: LegalDocumentRelationType;
  metadata: Record<string, JsonValue>;
  ruleSet: VersionedConfigRef;
  nodes: LegalNode[];
  sourceRelations: LegalDocumentSourceRelation[];
}

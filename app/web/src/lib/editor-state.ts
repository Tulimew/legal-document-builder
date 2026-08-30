import type { LegalContentBlock, LegalDocumentSnapshot, LegalNode } from "@legal-document-builder/contracts";

export type EditorSaveStatus = "LOADING" | "CLEAN" | "DIRTY" | "SAVING" | "SAVED" | "STALE" | "VALIDATION_ERROR" | "AUTH_ERROR" | "BACKEND_ERROR" | "UNSUPPORTED";

export interface EditorSaveError { code: string; message: string; details?: Record<string, unknown> }
export interface EditorSaveState { status: EditorSaveStatus; revision: number; serverRevision?: number; error?: EditorSaveError }
export interface SaveSnapshot { document: LegalDocumentSnapshot; expectedRevision: number }
export interface SaveAcknowledgement { revision: number; synchronizedAt: string }

function normalize(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Object.is(value, -0) ? 0 : value;
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalize(item)]));
  throw new TypeError(`UNSUPPORTED STRUCTURED OPERATION: ${typeof value}`);
}

export function canonicalDocument(document: LegalDocumentSnapshot): string { return JSON.stringify(normalize(document)); }
export function documentChanged(a: LegalDocumentSnapshot, b: LegalDocumentSnapshot): boolean { return canonicalDocument(a) !== canonicalDocument(b); }

export function replaceNodeContent(document: LegalDocumentSnapshot, nodeId: string, content: LegalContentBlock[]): LegalDocumentSnapshot {
  if (!document.nodes.some((node) => node.id === nodeId)) throw new Error("UNSUPPORTED STRUCTURED OPERATION: LegalNode không tồn tại.");
  return { ...document, nodes: document.nodes.map((node) => node.id === nodeId ? { ...node, content: structuredClone(content) } : node) };
}

const nextOrderKey=(nodes:LegalNode[],parentNodeId:string|null)=>String(Math.max(0,...nodes.filter(node=>node.parentNodeId===parentNodeId).map(node=>Number.parseInt(node.orderKey,10)||0))+1).padStart(4,"0");
export function addLegalNode(document:LegalDocumentSnapshot,parentNodeId:string|null,nodeTypeCode:string,title?:string):LegalDocumentSnapshot{
  if(parentNodeId!==null&&!document.nodes.some(node=>node.id===parentNodeId))throw new Error("UNSUPPORTED STRUCTURED OPERATION: parent không tồn tại.");
  const node:LegalNode={id:crypto.randomUUID(),nodeTypeCode,parentNodeId,orderKey:nextOrderKey(document.nodes,parentNodeId),...(title?.trim()?{title:title.trim()}:{}),content:[{kind:"PARAGRAPH",spans:[{text:""}]}],metadata:{},lifecycleStatus:"ACTIVE"};return{...document,nodes:[...document.nodes,node]};
}
export function deleteLegalNode(document:LegalDocumentSnapshot,nodeId:string):LegalDocumentSnapshot{
  if(!document.nodes.some(node=>node.id===nodeId))throw new Error("UNSUPPORTED STRUCTURED OPERATION: LegalNode không tồn tại.");if(document.nodes.some(node=>node.parentNodeId===nodeId))throw new Error("UNSUPPORTED STRUCTURED OPERATION: phải di chuyển hoặc xóa node con trước.");return{...document,nodes:document.nodes.filter(node=>node.id!==nodeId)};
}
export function moveLegalNode(document:LegalDocumentSnapshot,nodeId:string,parentNodeId:string|null,orderKey?:string):LegalDocumentSnapshot{
  const node=document.nodes.find(item=>item.id===nodeId);if(!node)throw new Error("UNSUPPORTED STRUCTURED OPERATION: LegalNode không tồn tại.");if(parentNodeId===nodeId)throw new Error("UNSUPPORTED STRUCTURED OPERATION: node không thể là parent của chính nó.");
  let cursor=parentNodeId;while(cursor){if(cursor===nodeId)throw new Error("UNSUPPORTED STRUCTURED OPERATION: thao tác tạo chu trình.");cursor=document.nodes.find(item=>item.id===cursor)?.parentNodeId??null}
  const targetOrder=orderKey??nextOrderKey(document.nodes.filter(item=>item.id!==nodeId),parentNodeId);if(document.nodes.some(item=>item.id!==nodeId&&item.parentNodeId===parentNodeId&&item.orderKey===targetOrder))throw new Error("UNSUPPORTED STRUCTURED OPERATION: orderKey đã được sử dụng cùng parent.");
  return{...document,nodes:document.nodes.map(item=>item.id===nodeId?{...item,parentNodeId,orderKey:targetOrder}:item)};
}
export function reorderLegalNode(document:LegalDocumentSnapshot,nodeId:string,direction:-1|1):LegalDocumentSnapshot{
  const node=document.nodes.find(item=>item.id===nodeId);if(!node)throw new Error("UNSUPPORTED STRUCTURED OPERATION: LegalNode không tồn tại.");const siblings=document.nodes.filter(item=>item.parentNodeId===node.parentNodeId).sort((a,b)=>a.orderKey.localeCompare(b.orderKey)),index=siblings.findIndex(item=>item.id===nodeId),other=siblings[index+direction];if(!other)return document;return{...document,nodes:document.nodes.map(item=>item.id===node.id?{...item,orderKey:other.orderKey}:item.id===other.id?{...item,orderKey:node.orderKey}:item)};
}

export function classifySaveError(error: EditorSaveError, revision: number): EditorSaveState {
  if (error.code === "REVISION_CONFLICT") return { status: "STALE", revision, serverRevision: typeof error.details?.actualRevision === "number" ? error.details.actualRevision : undefined, error };
  if (error.code === "INVALID_REQUEST" || error.code === "INVALID_DOCUMENT") return { status: "VALIDATION_ERROR", revision, error };
  if (error.code === "UNAUTHENTICATED" || error.code === "FORBIDDEN" || error.code === "AUTH_NOT_CONFIGURED") return { status: "AUTH_ERROR", revision, error };
  return { status: "BACKEND_ERROR", revision, error };
}

export class AutosaveCoordinator {
  private baseline: LegalDocumentSnapshot;
  private current: LegalDocumentSnapshot;
  private revision: number;
  private inFlight = false;
  private queued = false;

  constructor(document: LegalDocumentSnapshot, revision: number, private readonly save: (snapshot: SaveSnapshot) => Promise<SaveAcknowledgement>, private readonly state: (value: EditorSaveState) => void) {
    this.baseline = structuredClone(document); this.current = structuredClone(document); this.revision = revision;
  }

  update(document: LegalDocumentSnapshot): void { this.current = structuredClone(document); this.queued = this.inFlight; this.state({ status: this.inFlight ? "SAVING" : documentChanged(this.baseline, this.current) ? "DIRTY" : "CLEAN", revision: this.revision }); }
  snapshot(): LegalDocumentSnapshot { return structuredClone(this.current); }
  getRevision(): number { return this.revision; }

  async flush(): Promise<void> {
    if (this.inFlight) { this.queued = true; return; }
    if (!documentChanged(this.baseline, this.current)) { this.state({ status: "CLEAN", revision: this.revision }); return; }
    this.inFlight = true;
    const saving = structuredClone(this.current), expectedRevision = this.revision;
    let succeeded = false;
    this.state({ status: "SAVING", revision: this.revision });
    try {
      const result = await this.save({ document: saving, expectedRevision });
      succeeded = true;
      this.baseline = saving; this.revision = result.revision;
      const hasQueuedChange = this.queued || documentChanged(this.baseline, this.current);
      this.queued = false;
      this.state({ status: hasQueuedChange ? "DIRTY" : "SAVED", revision: this.revision });
    } catch (cause) {
      const error = cause as EditorSaveError;
      this.state(classifySaveError(error, this.revision));
      this.queued = false;
    } finally {
      this.inFlight = false;
    }
    if (succeeded && documentChanged(this.baseline, this.current) && !this.inFlight) await this.flush();
  }
}

export function requiresNavigationWarning(status: EditorSaveStatus): boolean { return ["DIRTY", "SAVING", "STALE", "VALIDATION_ERROR", "AUTH_ERROR", "BACKEND_ERROR", "UNSUPPORTED"].includes(status); }

"use client";

import type { LegalNode } from "@legal-document-builder/contracts";
import { useMemo } from "react";
import { allowedChildNodeTypes, canPlaceLegalNode } from "@/lib/editor-state";
import { viLabel } from "@/lib/vietnamese-labels";

const ROOT_TYPES = new Set(["DOCUMENT_HEADER", "DOCUMENT_BODY", "DOCUMENT_FOOTER"]);
const SINGLETON_TYPES = new Set([
  "NATIONAL_HEADER", "MOTTO", "ISSUING_AUTHORITY", "DOCUMENT_NUMBER", "PLACE_AND_DATE",
  "DOCUMENT_TYPE_NAME", "ABSTRACT", "SIGNATORY_TITLE", "SIGNATORY_NAME", "SIGNATURE",
  "SEAL", "RECIPIENTS", "TECHNICAL_INSTRUCTION",
]);

function nodeName(node: LegalNode): string {
  return node.displayNumber ?? node.title ?? viLabel(node.nodeTypeCode);
}

export function flattenStructureTree(nodes: LegalNode[]): Array<{ node: LegalNode; depth: number }> {
  const children = new Map<string | null, LegalNode[]>();
  for (const node of nodes) {
    const siblings = children.get(node.parentNodeId) ?? [];
    siblings.push(node);
    children.set(node.parentNodeId, siblings);
  }
  for (const siblings of children.values()) siblings.sort((a, b) => a.orderKey.localeCompare(b.orderKey));
  const result: Array<{ node: LegalNode; depth: number }> = [];
  const visited = new Set<string>();
  function visit(parentId: string | null, depth: number) {
    for (const node of children.get(parentId) ?? []) {
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      result.push({ node, depth });
      visit(node.id, depth + 1);
    }
  }
  visit(null, 0);
  for (const node of nodes) if (!visited.has(node.id)) result.push({ node, depth: 0 });
  return result;
}

export function StructureTree({ nodes, selectedId, onSelect, onAdd, onDelete, onMove, onReorder }: {
  nodes: LegalNode[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: (parentId: string | null, type: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, parentId: string | null) => void;
  onReorder: (id: string, direction: -1 | 1) => void;
}) {
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const visibleNodes = useMemo(() => flattenStructureTree(nodes), [nodes]);
  const selected = byId.get(selectedId);
  const selectedIsRegion = Boolean(selected && ROOT_TYPES.has(selected.nodeTypeCode));
  const existingChildren = new Set(nodes.filter((node) => node.parentNodeId === selected?.id).map((node) => node.nodeTypeCode));
  const addableTypes = selected
    ? allowedChildNodeTypes(selected.nodeTypeCode).filter((type) => !SINGLETON_TYPES.has(type) || !existingChildren.has(type))
    : [];
  const validDestinations = nodes.filter((node) =>
    node.id !== selected?.id && selected && canPlaceLegalNode(selected.nodeTypeCode, node.nodeTypeCode),
  );

  function remove() {
    if (!selected || selectedIsRegion) return;
    if (window.confirm(`Xóa “${nodeName(selected)}” khỏi dự thảo? Thao tác này sẽ được tự động lưu; bạn có thể hoàn tác trước khi rời trang.`)) onDelete(selected.id);
  }

  return <aside className="workspace-scroll border-r border-slate-200 bg-white" aria-label="Cây cấu trúc văn bản">
    <div className="sticky top-0 z-10 space-y-3 border-b border-slate-200 bg-white p-3">
      <div><p className="eyebrow">Dữ liệu cấu trúc</p><h2 className="text-sm font-bold">Cây nội dung</h2></div>
      <p className="text-[11px] leading-4 text-slate-600">Chọn một phần hoặc một mục trong cây để xem các nội dung có thể thêm đúng vị trí.</p>
      {selected && <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Thêm vào {nodeName(selected)}</p>
        {addableTypes.length > 0
          ? <div className="mt-2 flex flex-wrap gap-1">{addableTypes.map((type) => <button className="tiny-button" key={type} type="button" onClick={() => onAdd(selected.id, type)}>＋ {viLabel(type)}</button>)}</div>
          : <p className="mt-1 text-[10px] text-slate-500">Không có loại nội dung nào có thể thêm tại đây.</p>}
      </div>}
      {selected && !selectedIsRegion && <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          <button className="tiny-button" type="button" onClick={() => onReorder(selected.id, -1)}>↑ Đưa lên</button>
          <button className="tiny-button" type="button" onClick={() => onReorder(selected.id, 1)}>↓ Đưa xuống</button>
          <button className="tiny-button" type="button" onClick={remove}>Xóa</button>
        </div>
        {validDestinations.length > 0 && <label className="block text-[10px] font-semibold">Chuyển vào
          <select className="compact-select mt-1 w-full" value={selected.parentNodeId ?? ""} onChange={(event) => onMove(selected.id, event.target.value)}>
            {validDestinations.map((node) => <option key={node.id} value={node.id}>{nodeName(node)}</option>)}
          </select>
        </label>}
      </div>}
    </div>
    <div className="p-2">{visibleNodes.map(({ node, depth }) => <button key={node.id} className={`tree-node ${selectedId === node.id ? "tree-node-active" : ""}`} style={{ paddingLeft: `${8 + depth * 16}px` }} onClick={() => onSelect(node.id)} aria-current={selectedId === node.id ? "true" : undefined}>
      <span className="tree-icon">{depth === 0 ? "▤" : "└"}</span><span className="min-w-0 flex-1 truncate">{nodeName(node)}</span>
    </button>)}</div>
  </aside>;
}

"use client";
import type { LegalNode } from "@legal-document-builder/contracts";
import { useMemo, useState } from "react";
import { allowedChildNodeTypes, canPlaceLegalNode } from "@/lib/editor-state";
import { legalNodeTypeOptions, viLabel } from "@/lib/vietnamese-labels";

function depth(node:LegalNode,byId:Map<string,LegalNode>){let value=0,current=node;const visited=new Set<string>();while(current.parentNodeId&&byId.has(current.parentNodeId)&&!visited.has(current.parentNodeId)){visited.add(current.parentNodeId);current=byId.get(current.parentNodeId)!;value++}return value}
export function StructureTree({nodes,selectedId,onSelect,onAdd,onDelete,onMove,onReorder}:{nodes:LegalNode[];selectedId:string;onSelect:(id:string)=>void;onAdd:(parentId:string|null,type:string)=>void;onDelete:(id:string)=>void;onMove:(id:string,parentId:string|null)=>void;onReorder:(id:string,direction:-1|1)=>void}){
 const byId=useMemo(()=>new Map(nodes.map(node=>[node.id,node])),[nodes]),[type,setType]=useState("ARTICLE"),selected=byId.get(selectedId),rootTypes=allowedChildNodeTypes(null),childTypes=allowedChildNodeTypes(selected?.nodeTypeCode??null),availableTypes=selected?Array.from(new Set([...rootTypes,...childTypes])):rootTypes,effectiveType=availableTypes.includes(type)?type:availableTypes[0]??"OTHER";
 const canAddRoot=rootTypes.includes(effectiveType),canAddChild=Boolean(selected&&childTypes.includes(effectiveType)),validParents=nodes.filter(node=>node.id!==selected?.id&&selected&&canPlaceLegalNode(selected.nodeTypeCode,node.nodeTypeCode)),canMoveToRoot=Boolean(selected&&canPlaceLegalNode(selected.nodeTypeCode,null));
 function remove(){if(!selected)return;const name=selected.displayNumber??selected.title??viLabel(selected.nodeTypeCode);if(window.confirm(`Xóa “${name}” khỏi dự thảo? Thao tác này sẽ được tự động lưu; bạn có thể hoàn tác trước khi rời trang.`))onDelete(selected.id)}
 return <aside className="workspace-scroll border-r border-slate-200 bg-white" aria-label="Cây cấu trúc văn bản">
  <div className="sticky top-0 z-10 space-y-2 border-b border-slate-200 bg-white p-3">
   <div><p className="eyebrow">Dữ liệu cấu trúc</p><h2 className="text-sm font-bold">Cây nội dung</h2></div>
   <select className="compact-select w-full" aria-label="Loại cấu trúc mới" value={effectiveType} onChange={event=>setType(event.target.value)}>{legalNodeTypeOptions.filter(item=>availableTypes.includes(item.code)).map(item=><option key={item.code} value={item.code}>{item.name}</option>)}</select>
   <p className="text-[10px] text-slate-500">Thứ bậc: Phần → Chương → Mục → Điều → Khoản → Điểm</p>
   <div className="flex flex-wrap gap-1"><button className="tiny-button" type="button" disabled={!canAddRoot} title={canAddRoot?"":"Loại này không được đặt ở cấp gốc"} onClick={()=>onAdd(null,effectiveType)}>＋ Cấp gốc</button><button className="tiny-button" type="button" disabled={!canAddChild} title={canAddChild?"":"Loại này không thể là cấp con của nội dung đang chọn"} onClick={()=>onAdd(selectedId,effectiveType)}>＋ Cấp con</button><button className="tiny-button" type="button" disabled={!selected} onClick={()=>onReorder(selectedId,-1)} aria-label="Chuyển lên">↑</button><button className="tiny-button" type="button" disabled={!selected} onClick={()=>onReorder(selectedId,1)} aria-label="Chuyển xuống">↓</button><button className="tiny-button" type="button" disabled={!selected} onClick={remove}>Xóa</button></div>
   {selected&&<label className="text-[10px] font-semibold">Chuyển sang cấp cha<select className="compact-select mt-1 w-full" value={selected.parentNodeId??"ROOT"} onChange={event=>onMove(selected.id,event.target.value==="ROOT"?null:event.target.value)}>{canMoveToRoot&&<option value="ROOT">Cấp gốc</option>}{validParents.map(node=><option key={node.id} value={node.id}>{node.displayNumber??node.title??viLabel(node.nodeTypeCode)}</option>)}</select></label>}
  </div>
  <div className="p-2">{nodes.map(node=><button key={node.id} className={`tree-node ${selectedId===node.id?"tree-node-active":""}`} style={{paddingLeft:`${8+depth(node,byId)*16}px`}} onClick={()=>onSelect(node.id)} aria-current={selectedId===node.id?"true":undefined}><span className="tree-icon">{node.parentNodeId?"└":"▤"}</span><span className="min-w-0 flex-1 truncate">{node.displayNumber??node.title??viLabel(node.nodeTypeCode)}</span></button>)}</div>
 </aside>
}

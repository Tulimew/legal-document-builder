"use client";

import { useState } from "react";
import type { DraftNodeChangeType, StructureMapping } from "@/lib/mock-data";

export type StructureView="new"|"original"|"mapping";
const filterOptions:[string,DraftNodeChangeType|"ALL"][]=[["Tất cả","ALL"],["Đánh lại số","DRAFT_RENUMBER"],["Chuyển vị trí","DRAFT_MOVE"],["Chuyển vị trí và sửa nội dung","DRAFT_MOVE_AND_CONTENT_CHANGE"],["Thay đổi nội dung","DRAFT_CONTENT_CHANGE"]];
const typeLabel:Record<DraftNodeChangeType,string>={DRAFT_RENUMBER:"Đánh lại số tự động",DRAFT_MOVE:"Chuyển vị trí",DRAFT_CONTENT_CHANGE:"Thay đổi nội dung",DRAFT_MOVE_AND_CONTENT_CHANGE:"Chuyển vị trí",NO_CHANGE:"Không thay đổi"};
const changeSummary=(mapping:StructureMapping)=>Array.from(new Set(mapping.history.filter((event)=>event.type!=="NO_CHANGE").flatMap((event)=>event.type==="DRAFT_MOVE_AND_CONTENT_CHANGE"?["DRAFT_MOVE","DRAFT_CONTENT_CHANGE"]:[event.type]))).join(" + ");
const changeVersions=(mapping:StructureMapping)=>mapping.history.filter((event)=>event.type!=="NO_CHANGE").map((event)=>event.version).join(", ");

function ChangedContent({mapping,final}:{mapping:StructureMapping;final:boolean}) {
  if (!mapping.contentChanged || final) return <p>{mapping.after}</p>;
  return <p><del>{mapping.removed}</del> <ins>{mapping.added}</ins>{mapping.after.replace(mapping.added??"","")}</p>;
}

export function StructureMappingView({mappings,base,target,view,final,showMarkers,onSelect}:{mappings:StructureMapping[];base:string;target:string;view:StructureView;final:boolean;showMarkers:boolean;onSelect:(mapping:StructureMapping)=>void}) {
  const [filter,setFilter]=useState<DraftNodeChangeType|"ALL">("ALL");
  const scoped=mappings.map((mapping)=>{const from=mapping.history.findIndex((event)=>event.version===base);const to=mapping.history.findIndex((event)=>event.version===target);if(from<0||to<from)return mapping;const history=mapping.history.slice(from,to+1);const first=history[0],last=history.at(-1)!;return{...mapping,oldPosition:first.displayNumber,newPosition:last.displayNumber,oldParent:first.parent,newParent:last.parent,history,contentChanged:history.slice(1).some((event)=>event.contentChanged),before:first.after,after:last.after}});
  const visible=scoped.filter((mapping)=>filter==="ALL"||mapping.history.some((event)=>event.type===filter||(filter==="DRAFT_MOVE"&&event.type==="DRAFT_MOVE_AND_CONTENT_CHANGE")));
  if (view==="mapping") return <section className="card mx-auto mb-4 max-w-[1000px] overflow-hidden" aria-label="Ánh xạ cấu trúc dự thảo">
    <header className="flex items-end justify-between gap-3 border-b border-slate-200 p-4"><div><p className="eyebrow">Ánh xạ giữa DraftVersion</p><h3 className="font-bold">LegalNode từ {base} đến {target}</h3><p className="mt-1 text-xs text-slate-500">Dùng ID ổn định; đây không phải AmendmentOperation đối với văn bản gốc.</p></div><label className="text-xs font-semibold">Lọc biến động<select className="compact-select ml-2" value={filter} onChange={(event)=>setFilter(event.target.value as DraftNodeChangeType|"ALL")}>{filterOptions.map(([label,value])=><option value={value} key={value}>{label}</option>)}</select></label></header>
    <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{[`Vị trí ${base}`,`Vị trí ${target}`,"LegalNode ID","Biến động","Đổi nội dung","Phiên bản phát sinh","Lý do và căn cứ"].map((label)=><th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody>{visible.map((mapping)=><tr className="cursor-pointer border-t border-slate-100 hover:bg-blue-50" key={mapping.id} onClick={()=>onSelect(mapping)}><td className="p-3">{mapping.oldParent} · {mapping.oldPosition}</td><td className="p-3">{mapping.newParent} · {mapping.newPosition}</td><td className="p-3 font-bold text-blue-800">{mapping.legalNodeId}</td><td className="p-3"><span className="badge badge-slate">{changeSummary(mapping)||"NO_CHANGE"}</span></td><td className="p-3">{mapping.contentChanged?"Có":"Không"}</td><td className="p-3">{changeVersions(mapping)||"Không thay đổi"}</td><td className="p-3"><b>{mapping.reason}</b><br/><span className="text-slate-500">{mapping.basis}</span></td></tr>)}</tbody></table></div>
  </section>;

  return <section className="comparison-paper mb-4" aria-label={view==="new"?"Theo cấu trúc phiên bản mới":"Theo cấu trúc phiên bản gốc"}>
    <p className="mb-6 text-center text-[10px] font-bold tracking-wide text-slate-500">LỊCH SỬ NÚT TRONG DỰ THẢO · DỮ LIỆU GIẢ ĐỊNH</p>
    {visible.map((mapping)=><article key={mapping.id} className="document-block document-article structural-destination cursor-pointer" onClick={()=>onSelect(mapping)}>
      {showMarkers&&!final&&<button className="move-marker" onClick={()=>onSelect(mapping)} aria-label={`${mapping.oldPosition} tại ${base}; mở lịch sử`}>{mapping.oldPosition} tại {base}</button>}
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{view==="new"||final?mapping.newParent:mapping.oldParent} · ID {mapping.legalNodeId}</p>
      <h3>{view==="new"||final?mapping.newPosition:mapping.oldPosition}. Nội dung minh họa</h3>
      <ChangedContent mapping={mapping} final={final}/>
      {!final&&<p className="mt-2 text-[10px] text-slate-500">Đổi số chỉ ghi marker nhẹ; lần chuyển vị trí và lần sửa nội dung được truy nguyên riêng.</p>}
    </article>)}
  </section>;
}

export function StructureTracePanel({mapping,onClose}:{mapping:StructureMapping;onClose:()=>void}) {
  return <aside className="trace-panel" aria-label="Lịch sử LegalNode giữa các DraftVersion"><header className="flex items-start justify-between border-b border-slate-200 p-3"><div><p className="eyebrow">Lịch sử nút dự thảo</p><h3 className="font-bold">{mapping.legalNodeId}</h3></div><button className="icon-button" onClick={onClose} aria-label="Đóng lịch sử">×</button></header><div className="workspace-scroll p-3"><p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900">Cùng một LegalNode qua các DraftVersion; không phải thao tác sửa đổi văn bản gốc.</p><ol className="mt-3 space-y-3">{mapping.history.map((event)=><li className="rounded-lg border border-slate-200 p-3 text-xs" key={event.version}><div className="flex items-center justify-between"><strong>{event.version} · {event.displayNumber}</strong><span className="badge badge-slate">{typeLabel[event.type]}</span></div><p className="mt-1 font-semibold">{event.parent}</p>{event.contentChanged&&<div className="mt-2 rounded bg-slate-50 p-2"><span className="text-slate-500">Trước</span><p>{event.before}</p><span className="mt-1 block text-slate-500">Sau</span><p>{event.after}</p></div>}<dl className="mt-2 space-y-1 text-slate-600"><div><dt className="inline font-semibold">Người sửa: </dt><dd className="inline">{event.editor}</dd></div><div><dt className="inline font-semibold">Lý do: </dt><dd className="inline">{event.reason}</dd></div><div><dt className="inline font-semibold">Căn cứ: </dt><dd className="inline">{event.basis}</dd></div><div><dt className="inline font-semibold">Phê duyệt: </dt><dd className="inline">{event.approver}</dd></div></dl>{event.type==="DRAFT_MOVE_AND_CONTENT_CHANGE"&&<p className="mt-2 font-semibold text-amber-900">Hai khía cạnh: DRAFT_MOVE và DRAFT_CONTENT_CHANGE.</p>}</li>)}</ol></div></aside>;
}

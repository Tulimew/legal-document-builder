"use client";

import { useState } from "react";
import type { ComparedBlock, DraftChange } from "@/lib/mock-data";
import { ChangeSummaryPopover } from "./change-summary-popover";

type ViewMode="track"|"final"|"changes";

export function ComparisonDocument({blocks,changes,matchingIds,selectedId,mode,showMarkers,onSelect}:{blocks:ComparedBlock[];changes:DraftChange[];matchingIds:Set<string>;selectedId?:string;mode:ViewMode;showMarkers:boolean;onSelect:(id:string)=>void}) {
  const [expanded,setExpanded]=useState<Set<string>>(new Set());
  const changeMap=new Map(changes.map((change)=>[change.id,change]));
  const blockChangeIds=(block:ComparedBlock)=>Array.from(new Set(block.segments.flatMap((segment)=>segment.changeId&&matchingIds.has(segment.changeId)?[segment.changeId]:[])));
  const toggle=(id:string)=>setExpanded((old)=>{const next=new Set(old);if(next.has(id))next.delete(id);else next.add(id);return next});
  const renderSegment=(segment:ComparedBlock["segments"][number],index:number)=>{
    if(!segment.changeId)return <span key={index}>{segment.text}</span>;
    const change=changeMap.get(segment.changeId);
    const matches=matchingIds.has(segment.changeId);
    if(mode==="final")return segment.kind==="deleted"?null:<span key={index}>{segment.text}</span>;
    if(!change)return segment.kind==="deleted"?null:<span key={index}>{segment.text}</span>;
    const Tag=segment.kind==="added"?"ins":segment.kind==="deleted"?"del":"span";
    return <span key={index} className={`change-anchor group ${selectedId===change.id?"change-anchor-selected":""} ${matches?"":"change-anchor-muted"}`} data-change-id={change.id} role="button" tabIndex={0} aria-label={`${segment.kind==="added"?"Nội dung bổ sung":"Nội dung bị bỏ"} ${change.id}`} onClick={()=>onSelect(change.id)} onKeyDown={(event)=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onSelect(change.id)}}}><Tag>{segment.text}</Tag><ChangeSummaryPopover change={change}/></span>;
  };

  return <article className="comparison-paper" aria-label="Toàn văn bản so sánh"><p className="mb-8 text-center text-[10px] font-bold tracking-wide text-slate-500">DỮ LIỆU MẪU - KHÔNG CÓ GIÁ TRỊ PHÁP LÝ</p>{blocks.map((block)=>{
    const ids=blockChangeIds(block);const changed=ids.length>0;const hidden=mode==="changes"&&!changed&&!expanded.has(block.id)&&!["opening","basis","chapter","signature"].includes(block.kind);
    if(hidden)return <button key={block.id} className="collapsed-context" onClick={()=>toggle(block.id)}>… {block.label??"Nội dung không thay đổi"} · Mở rộng</button>;
    return <section key={block.id} className={`document-block document-${block.kind}`}>{showMarkers&&ids.map((id,index)=>{const change=changeMap.get(id);if(!change)return null;return <button key={id} className={`business-marker group ${change.status==="Thiếu căn cứ"?"business-marker-warning":""}`} style={{top:`${index*22}px`}} onClick={()=>onSelect(id)} aria-label={`${change.type}; ${change.status}; mở truy nguyên`}><span>{change.status==="Thiếu căn cứ"?"!":change.type==="Thay đổi cấu trúc"?"↕":"●"}</span><ChangeSummaryPopover change={change}/></button>})}{block.label&&<h3 className="whitespace-pre-line">{block.label}</h3>}<p className="whitespace-pre-line">{block.segments.map(renderSegment)}</p>{mode==="changes"&&!changed&&expanded.has(block.id)&&<button className="tiny-button mt-2" onClick={()=>toggle(block.id)}>Thu gọn nội dung không thay đổi</button>}</section>;
  })}</article>;
}

"use client";

import {useEffect,useState} from "react";
import type {MultiDocumentAmendmentLayout} from "@legal-document-builder/contracts";

const projectId=process.env.NEXT_PUBLIC_SAMPLE_PROJECT_ID;
const userId=process.env.NEXT_PUBLIC_DEVELOPMENT_USER_ID;
const storageKey="legal-builder:multi-document-layout";
const options:{value:MultiDocumentAmendmentLayout;title:string;description:string}[]=[
  {value:"ARTICLE_PER_DOCUMENT",title:"Một điều sửa một văn bản",description:"Mỗi văn bản đích được trình bày trong một điều riêng."},
  {value:"CHAPTER_PER_DOCUMENT",title:"Một chương sửa một văn bản",description:"Mỗi văn bản đích có một chương riêng, bên trong gồm các điều sửa đổi."},
];

export function AmendmentLayoutSelector(){
  const [value,setValue]=useState<MultiDocumentAmendmentLayout>("ARTICLE_PER_DOCUMENT");
  const [status,setStatus]=useState("Đang tải cấu hình…");
  useEffect(()=>{void (async()=>{
    if(!projectId||!userId){const saved=window.localStorage.getItem(storageKey) as MultiDocumentAmendmentLayout|null;if(saved==="ARTICLE_PER_DOCUMENT"||saved==="CHAPTER_PER_DOCUMENT")setValue(saved);setStatus("Nguyên mẫu cục bộ · chưa kết nối PostgreSQL");return;}
    try{const response=await fetch(`/api/v1/projects/${projectId}/amendment-layout`,{headers:{"x-development-user-id":userId}}),body=await response.json();if(!response.ok)throw new Error(body.error?.message??"Không tải được cấu hình.");if(body.data?.layoutMode)setValue(body.data.layoutMode);setStatus(body.data?`Đã lưu theo RuleSet ${body.data.rulesetVersionCode}`:"Chưa cấu hình · chọn một phương án");}catch(error){setStatus(error instanceof Error?error.message:"Không tải được cấu hình.");}
  })();},[]);

  async function choose(next:MultiDocumentAmendmentLayout){
    const previous=value;
    setValue(next);
    if(!projectId||!userId){window.localStorage.setItem(storageKey,next);setStatus("Đã lưu trong nguyên mẫu cục bộ");return;}
    setStatus("Đang lưu…");
    try{const correlationId=crypto.randomUUID(),response=await fetch(`/api/v1/projects/${projectId}/amendment-layout`,{method:"PUT",headers:{"content-type":"application/json","x-development-user-id":userId,"x-correlation-id":correlationId},body:JSON.stringify({contractVersion:"1.1",layoutMode:next,rulesetVersionCode:"1.1-user-confirmed",decisionBasis:"Quy tắc nghiệp vụ do người dùng xác nhận: cho phép lựa chọn một điều hoặc một chương sửa một văn bản.",correlationId})}),body=await response.json();if(!response.ok)throw new Error(body.error?.message??"Không lưu được cấu hình.");setStatus(`Đã lưu theo RuleSet ${body.data.rulesetVersionCode}`);}catch(error){setValue(previous);setStatus(error instanceof Error?error.message:"Không lưu được cấu hình.");}
  }

  return <section className="card p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="eyebrow">Bố cục sửa nhiều văn bản</p><h2 className="mt-1 font-bold">Chọn cách nhóm văn bản đích</h2></div><span className="badge badge-blue">{value==="ARTICLE_PER_DOCUMENT"?"Theo điều":"Theo chương"}</span></div><div className="mt-3 grid gap-2 md:grid-cols-2">{options.map(option=><label key={option.value} className={`cursor-pointer rounded-lg border p-3 text-sm ${value===option.value?"border-blue-400 bg-blue-50":"border-slate-200 bg-white"}`}><span className="flex gap-2"><input type="radio" name="amendment-layout" checked={value===option.value} onChange={()=>void choose(option.value)}/><span><strong>{option.title}</strong><small className="mt-1 block text-slate-600">{option.description}</small></span></span></label>)}</div><div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><strong>Xem trước cấu trúc</strong><p className="mt-1">{value==="ARTICLE_PER_DOCUMENT"?"Điều 1 · Sửa Văn bản A → Điều 2 · Sửa Văn bản B → Điều khoản thi hành":"Chương I · Sửa Văn bản A → Chương II · Sửa Văn bản B → Chương cuối · Điều khoản thi hành"}</p><p className="mt-2">{status}</p></div></section>;
}

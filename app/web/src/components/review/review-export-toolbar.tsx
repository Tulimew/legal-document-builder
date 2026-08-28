"use client";

import { structureNodes } from "@/lib/mock-data";
import type {Comment} from "@legal-document-builder/contracts";
import { exportReviewSynthesis } from "@/lib/document-exports";
import { loadPrototypeComments,type PrototypeComment } from "@/lib/review-prototype-store";

export function ReviewExportToolbar({projectId}:{projectId?:string}) {
  const exportFile=async()=>{
    if(!projectId){await exportReviewSynthesis(structureNodes,loadPrototypeComments());return}
    const userId=process.env.NEXT_PUBLIC_DEVELOPMENT_USER_ID!,response=await fetch(`/api/v1/projects/${projectId}/comments`,{headers:{"x-development-user-id":userId}}),body=await response.json();
    if(!response.ok)throw new Error(body.error?.message??"Không tải được dữ liệu xuất bản.");
    const persisted=body.data as Comment[],nodes=[...new Map(persisted.map(item=>[item.targetDescription,{id:item.targetNodeIds[0]??item.targetDescription,label:item.targetDescription,type:item.targetScopeType,level:0,content:"",parent:"Văn bản",displayNumber:item.targetDescription}])).values()];
    const comments:PrototypeComment[]=persisted.map(item=>({id:item.id,scope:"Ý kiến khác" as PrototypeComment["scope"],...(item.targetNodeIds[0]?{nodeId:item.targetNodeIds[0]}:{}),target:item.targetDescription,organization:item.contributorOrganizationName,content:item.commentContent,status:(item.latestResolution?item.latestResolution.resolutionType==="ACCEPTED_AND_UPDATED"?"Đã tiếp thu và cập nhật tại dự thảo":item.latestResolution.resolutionType==="PARTIALLY_ACCEPTED"?"Tiếp thu một phần ý kiến":"Giải trình":"Chưa xử lý") as PrototypeComment["status"],...(item.latestResolution?.explanation?{explanation:item.latestResolution.explanation}:{}),linkedChanges:[]}));
    await exportReviewSynthesis(nodes,comments)
  };
  return <div className="bg-slate-100 px-5 pt-5"><div className="mx-auto flex max-w-7xl justify-end"><button className="button button-primary" onClick={()=>void exportFile()}>↓ Xuất bản tổng hợp ý kiến (.docx)</button></div></div>;
}

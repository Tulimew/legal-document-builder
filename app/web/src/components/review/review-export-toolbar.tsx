"use client";

import { structureNodes } from "@/lib/mock-data";
import type {Comment,ReviewDraftChange} from "@legal-document-builder/contracts";
import { exportPersistentReviewSynthesis,exportReviewSynthesis } from "@/lib/document-exports";
import { loadPrototypeComments } from "@/lib/review-prototype-store";

export function ReviewExportToolbar({projectId}:{projectId?:string}) {
  const exportFile=async()=>{
    if(!projectId){await exportReviewSynthesis(structureNodes,loadPrototypeComments());return}
    const userId=process.env.NEXT_PUBLIC_DEVELOPMENT_USER_ID!,headers={"x-development-user-id":userId},[commentResponse,changeResponse]=await Promise.all([fetch(`/api/v1/projects/${projectId}/comments`,{headers}),fetch(`/api/v1/projects/${projectId}/draft-changes`,{headers})]),commentBody=await commentResponse.json(),changeBody=await changeResponse.json();
    if(!commentResponse.ok)throw new Error(commentBody.error?.message??"Không tải được dữ liệu góp ý để xuất bản.");
    if(!changeResponse.ok)throw new Error(changeBody.error?.message??"Không tải được thay đổi dự thảo để xuất bản.");
    await exportPersistentReviewSynthesis(commentBody.data as Comment[],changeBody.data as ReviewDraftChange[])
  };
  return <div className="bg-slate-100 px-5 pt-5"><div className="mx-auto flex max-w-7xl justify-end"><button className="button button-primary" onClick={()=>void exportFile()}>↓ Xuất bản tổng hợp ý kiến (.docx)</button></div></div>;
}

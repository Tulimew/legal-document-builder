import type { DecideResolutionCaseRequest } from "@legal-document-builder/contracts";
import { AppError } from "../errors";
import { assertUuid } from "./workspace";

const TYPES=new Set(["SELECT_OPTION","KEEP_CURRENT","COMBINE","RESEARCH_MORE","SEEK_AUTHORITY"]);
const text=(value:unknown,field:string)=>{if(typeof value!=="string"||!value.trim())throw new AppError("INVALID_REQUEST",`${field} không được để trống.`);return value.trim()};
export function parseResolutionDecision(value:unknown):DecideResolutionCaseRequest{
  if(typeof value!=="object"||value===null||Array.isArray(value))throw new AppError("INVALID_REQUEST","Request body phải là object.");const item=value as Record<string,unknown>;const decisionType=text(item.decisionType,"decisionType");if(!TYPES.has(decisionType))throw new AppError("INVALID_REQUEST","Loại kết luận không hợp lệ.");const selectedOptionId=typeof item.selectedOptionId==="string"?item.selectedOptionId:undefined;if(decisionType==="SELECT_OPTION"&&!selectedOptionId)throw new AppError("INVALID_REQUEST","Kết luận chọn phương án bắt buộc chỉ rõ phương án.");if(selectedOptionId)assertUuid(selectedOptionId,"selectedOptionId");return{contractVersion:text(item.contractVersion,"contractVersion") as "1.0"|"1.1",decisionType:decisionType as DecideResolutionCaseRequest["decisionType"],...(selectedOptionId?{selectedOptionId}:{}),reason:text(item.reason,"reason"),authorityBasis:text(item.authorityBasis,"authorityBasis"),...(typeof item.draftingInstruction==="string"&&item.draftingInstruction.trim()?{draftingInstruction:item.draftingInstruction.trim()}:{}),correlationId:text(item.correlationId,"correlationId")};
}

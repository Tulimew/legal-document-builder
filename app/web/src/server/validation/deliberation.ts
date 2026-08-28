import type { CreateMemberResolutionOpinionRequest, DecideResolutionCaseRequest, RecordMeetingDecisionRequest } from "@legal-document-builder/contracts";
import { AppError } from "../errors";
import { assertUuid } from "./workspace";

const TYPES=new Set(["SELECT_OPTION","KEEP_CURRENT","COMBINE","RESEARCH_MORE","SEEK_AUTHORITY"]);
const OPINION_TYPES=new Set(["ACCEPTED_AND_UPDATED","PARTIALLY_ACCEPTED","EXPLAINED_NOT_ACCEPTED"]);
const text=(value:unknown,field:string)=>{if(typeof value!=="string"||!value.trim())throw new AppError("INVALID_REQUEST",`${field} không được để trống.`);return value.trim()};
export function parseResolutionDecision(value:unknown):DecideResolutionCaseRequest{
  if(typeof value!=="object"||value===null||Array.isArray(value))throw new AppError("INVALID_REQUEST","Request body phải là object.");const item=value as Record<string,unknown>;const decisionType=text(item.decisionType,"decisionType");if(!TYPES.has(decisionType))throw new AppError("INVALID_REQUEST","Loại kết luận không hợp lệ.");const selectedOptionId=typeof item.selectedOptionId==="string"?item.selectedOptionId:undefined;if(decisionType==="SELECT_OPTION"&&!selectedOptionId)throw new AppError("INVALID_REQUEST","Kết luận chọn phương án bắt buộc chỉ rõ phương án.");if(selectedOptionId)assertUuid(selectedOptionId,"selectedOptionId");return{contractVersion:text(item.contractVersion,"contractVersion") as "1.0"|"1.1",decisionType:decisionType as DecideResolutionCaseRequest["decisionType"],...(selectedOptionId?{selectedOptionId}:{}),reason:text(item.reason,"reason"),authorityBasis:text(item.authorityBasis,"authorityBasis"),...(typeof item.draftingInstruction==="string"&&item.draftingInstruction.trim()?{draftingInstruction:item.draftingInstruction.trim()}:{}),correlationId:text(item.correlationId,"correlationId")};
}

export function parseMemberResolutionOpinion(value:unknown):CreateMemberResolutionOpinionRequest{
  if(typeof value!=="object"||value===null||Array.isArray(value))throw new AppError("INVALID_REQUEST","Request body phải là object.");
  const item=value as Record<string,unknown>;
  const proposedResolutionType=text(item.proposedResolutionType,"proposedResolutionType");
  if(!OPINION_TYPES.has(proposedResolutionType))throw new AppError("INVALID_REQUEST","Đề xuất xử lý không hợp lệ.");
  const proposedDraftContent=typeof item.proposedDraftContent==="string"&&item.proposedDraftContent.trim()?item.proposedDraftContent.trim():undefined;
  return {
    contractVersion:text(item.contractVersion,"contractVersion") as "1.0"|"1.1",
    proposedResolutionType:proposedResolutionType as CreateMemberResolutionOpinionRequest["proposedResolutionType"],
    reasoning:text(item.reasoning,"reasoning"),
    ...(proposedDraftContent?{proposedDraftContent}:{}),
    correlationId:text(item.correlationId,"correlationId"),
  };
}

export function parseMeetingDecision(value:unknown):RecordMeetingDecisionRequest{
  if(typeof value!=="object"||value===null||Array.isArray(value))throw new AppError("INVALID_REQUEST","Request body phải là object.");
  const item=value as Record<string,unknown>,decisionType=text(item.decisionType,"decisionType");
  if(!TYPES.has(decisionType))throw new AppError("INVALID_REQUEST","Loại kết luận không hợp lệ.");
  const selectedOpinionId=typeof item.selectedOpinionId==="string"&&item.selectedOpinionId?item.selectedOpinionId:undefined;
  const meetingOption=typeof item.meetingOption==="string"&&item.meetingOption.trim()?item.meetingOption.trim():undefined;
  if(decisionType==="SELECT_OPTION"&&!selectedOpinionId)throw new AppError("INVALID_REQUEST","Phải chọn một phương án thành viên.");
  if(decisionType==="COMBINE"&&!meetingOption)throw new AppError("INVALID_REQUEST","Phải nhập phương án thống nhất tại cuộc họp.");
  if(selectedOpinionId)assertUuid(selectedOpinionId,"selectedOpinionId");
  return{contractVersion:text(item.contractVersion,"contractVersion") as "1.0"|"1.1",decisionType:decisionType as RecordMeetingDecisionRequest["decisionType"],...(selectedOpinionId?{selectedOpinionId}:{}),...(meetingOption?{meetingOption}:{}),reason:text(item.reason,"reason"),authorityBasis:text(item.authorityBasis,"authorityBasis"),...(typeof item.draftingInstruction==="string"&&item.draftingInstruction.trim()?{draftingInstruction:item.draftingInstruction.trim()}:{}),correlationId:text(item.correlationId,"correlationId")};
}

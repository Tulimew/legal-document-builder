import type {CreateStep4ChangeProposalRequest,DecideStep4ChangeProposalRequest,FinalizeStep4Request,Step4ChangeSourceType} from "@legal-document-builder/contracts";
import {AppError} from "../errors";
import {assertUuid} from "./workspace";

const sources:Step4ChangeSourceType[]=["MEETING_CONCLUSION","TECHNICAL_EDIT","DRAFTING_TEAM_INITIATIVE","NEW_DIRECTION"];
function object(value:unknown,name:string):Record<string,unknown>{if(typeof value!=="object"||value===null||Array.isArray(value))throw new AppError("INVALID_REQUEST",`${name} phải là object.`);return value as Record<string,unknown>}
function required(item:Record<string,unknown>,name:string){if(typeof item[name]!=="string"||!item[name].trim())throw new AppError("INVALID_REQUEST",`${name} không được để trống.`);return (item[name] as string).trim()}

export function parseCreateStep4Change(value:unknown):CreateStep4ChangeProposalRequest{
  const item=object(value,"Request body"),contractVersion=required(item,"contractVersion") as "1.0"|"1.1",legalNodeId=required(item,"legalNodeId"),location=required(item,"location"),reason=required(item,"reason"),correlationId=required(item,"correlationId");
  assertUuid(legalNodeId,"legalNodeId");
  const beforeState=object(item.beforeState,"beforeState"),afterState=object(item.afterState,"afterState"),sourceType=item.sourceType as Step4ChangeSourceType;
  if(!sources.includes(sourceType))throw new AppError("INVALID_REQUEST","sourceType không được hỗ trợ.");
  if(JSON.stringify(beforeState)===JSON.stringify(afterState))throw new AppError("INVALID_REQUEST","Nội dung trước và sau không được giống nhau.");
  const sourceReference=typeof item.sourceReference==="string"?item.sourceReference.trim():"",authorityBasis=typeof item.authorityBasis==="string"?item.authorityBasis.trim():"",changesMeetingConclusion=item.changesMeetingConclusion===true;
  if((sourceType==="MEETING_CONCLUSION"||sourceType==="NEW_DIRECTION")&&!sourceReference)throw new AppError("INVALID_REQUEST","Phải ghi số hiệu hoặc mã nguồn phát sinh.");
  if((sourceType==="DRAFTING_TEAM_INITIATIVE"||sourceType==="NEW_DIRECTION"||changesMeetingConclusion)&&!authorityBasis)throw new AppError("INVALID_REQUEST","Phải ghi căn cứ thẩm quyền.");
  return{contractVersion,legalNodeId,location,beforeState,afterState,sourceType,...(sourceReference?{sourceReference}:{}),reason,...(authorityBasis?{authorityBasis}:{}),changesMeetingConclusion,correlationId};
}

export function parseDecideStep4Change(value:unknown):DecideStep4ChangeProposalRequest{
  const item=object(value,"Request body"),contractVersion=required(item,"contractVersion") as "1.0"|"1.1",reason=required(item,"reason"),authorityBasis=required(item,"authorityBasis"),correlationId=required(item,"correlationId");
  if(item.decisionType!=="APPROVE"&&item.decisionType!=="REJECT"&&item.decisionType!=="REQUEST_REVISION")throw new AppError("INVALID_REQUEST","decisionType không được hỗ trợ.");
  return{contractVersion,decisionType:item.decisionType,reason,authorityBasis,correlationId};
}

export function parseFinalizeStep4(value:unknown):FinalizeStep4Request{
  const item=object(value,"Request body"),contractVersion=required(item,"contractVersion") as "1.0"|"1.1",versionCode=required(item,"versionCode"),versionName=required(item,"versionName"),completionReport=required(item,"completionReport"),authorityBasis=required(item,"authorityBasis"),correlationId=required(item,"correlationId");
  if(!Number.isSafeInteger(item.expectedRevision)||Number(item.expectedRevision)<0)throw new AppError("INVALID_REQUEST","expectedRevision phải là số nguyên không âm.");
  if(!/^[A-Z0-9][A-Z0-9._-]{1,49}$/i.test(versionCode))throw new AppError("INVALID_REQUEST","versionCode chỉ gồm chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.");
  return{contractVersion,expectedRevision:Number(item.expectedRevision),versionCode,versionName,completionReport,authorityBasis,correlationId};
}

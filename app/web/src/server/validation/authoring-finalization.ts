import type { FinalizeAuthoringRequest } from "@legal-document-builder/contracts";
import { AppError } from "../errors";

export function parseFinalizeAuthoring(value:unknown):FinalizeAuthoringRequest{
  if(typeof value!=="object"||value===null||Array.isArray(value))throw new AppError("INVALID_REQUEST","Request body phải là object.");const item=value as Record<string,unknown>;
  const required=(name:string)=>{const result=typeof item[name]==="string"?item[name].trim():"";if(!result)throw new AppError("INVALID_REQUEST",`${name} không được để trống.`);return result};
  const contractVersion=required("contractVersion");if(contractVersion!=="1.0"&&contractVersion!=="1.1")throw new AppError("INVALID_REQUEST","contractVersion không được hỗ trợ.");
  const versionCode=required("versionCode");if(!/^[A-Z0-9][A-Z0-9._-]{1,49}$/i.test(versionCode))throw new AppError("INVALID_REQUEST","versionCode không hợp lệ.");
  if(!Number.isSafeInteger(item.expectedRevision)||Number(item.expectedRevision)<0)throw new AppError("INVALID_REQUEST","expectedRevision phải là số nguyên không âm.");
  return{contractVersion,expectedRevision:Number(item.expectedRevision),versionCode,versionName:required("versionName"),reason:required("reason"),authorityBasis:required("authorityBasis"),correlationId:required("correlationId")};
}

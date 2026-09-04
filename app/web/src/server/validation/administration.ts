import type { CreateLegalProjectRequest, ProjectCreationMode, SystemRoleCode, UpdateLegalProjectRequest } from "@legal-document-builder/contracts";

import { AppError } from "../errors";

const PROJECT_CODE=/^[A-Z0-9][A-Z0-9._-]{2,31}$/;
const USERNAME=/^[a-z0-9][a-z0-9._-]{2,63}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=="object"||Array.isArray(value))throw new AppError("INVALID_REQUEST","Dữ liệu không hợp lệ.");return value as Record<string,unknown>}
function text(value:unknown,label:string,max=200):string{if(typeof value!=="string"||!value.trim()||value.trim().length>max)throw new AppError("INVALID_REQUEST",`${label} không hợp lệ.`);return value.trim()}

export function parseCreateProject(value:unknown,correlationId:string):CreateLegalProjectRequest{
 const v=object(value),code=text(v.code,"Mã hồ sơ",32).toUpperCase(),name=text(v.name,"Tên hồ sơ"),description=typeof v.description==="string"?v.description.trim().slice(0,2000):"";
 if(!PROJECT_CODE.test(code))throw new AppError("INVALID_REQUEST","Mã hồ sơ chỉ gồm chữ in hoa, số, dấu chấm, gạch ngang hoặc gạch dưới.");
 const documentTypeCode=text(v.documentTypeCode,"Loại văn bản",64).toUpperCase();
 if(v.creationMode!=="NEW_DOCUMENT"&&v.creationMode!=="AMEND_DOCUMENTS")throw new AppError("INVALID_REQUEST","Phương thức xây dựng văn bản không hợp lệ.");
 const creationMode=v.creationMode as ProjectCreationMode,targetDocumentCount=Number(v.targetDocumentCount??0);
 if(!Number.isInteger(targetDocumentCount)||(creationMode==="NEW_DOCUMENT"?targetDocumentCount!==0:targetDocumentCount<1||targetDocumentCount>100))throw new AppError("INVALID_REQUEST","Số văn bản được sửa đổi không hợp lệ.");
 return{contractVersion:"1.1",code,name,description,documentTypeCode,creationMode,targetDocumentCount,correlationId};
}
export function parseUpdateProject(value:unknown,correlationId:string):UpdateLegalProjectRequest{const v=object(value),status=String(v.status) as UpdateLegalProjectRequest["status"];if(!["ACTIVE","PAUSED","COMPLETED","ARCHIVED"].includes(status))throw new AppError("INVALID_REQUEST","Trạng thái hồ sơ không hợp lệ.");return{contractVersion:"1.1",name:text(v.name,"Tên hồ sơ"),description:typeof v.description==="string"?v.description.trim().slice(0,2000):"",status,reason:text(v.reason,"Lý do thay đổi",500),correlationId}}

export type ProjectAccountRoleClass="COMMENT_CONTRIBUTOR"|"DRAFTING_TEAM_LEAD"|"DRAFTER";
export interface CreateManagedUserInput{username:string;displayName:string;password:string;systemRoles:SystemRoleCode[];projectAssignment?:{projectId:string;roleClass:ProjectAccountRoleClass}}
export function parseCreateManagedUser(value:unknown):CreateManagedUserInput{const v=object(value),username=text(v.username,"Tên đăng nhập",64).toLowerCase(),displayName=text(v.displayName,"Tên hiển thị",160),password=text(v.password,"Mật khẩu",256);if(!USERNAME.test(username))throw new AppError("INVALID_REQUEST","Tên đăng nhập không hợp lệ.");if(password.length<12)throw new AppError("INVALID_REQUEST","Mật khẩu phải có ít nhất 12 ký tự.");const allowed=new Set<SystemRoleCode>(["SYSTEM_ADMIN","ACCOUNT_ADMIN","PROJECT_CREATOR"]),systemRoles=Array.isArray(v.systemRoles)?v.systemRoles.map(String).filter((x):x is SystemRoleCode=>allowed.has(x as SystemRoleCode)):[];let projectAssignment:CreateManagedUserInput["projectAssignment"];if(v.projectAssignment!==undefined){const a=object(v.projectAssignment),projectId=text(a.projectId,"Hồ sơ",36),roleClass=text(a.roleClass,"Lớp tài khoản",64) as ProjectAccountRoleClass;if(!UUID.test(projectId)||!["COMMENT_CONTRIBUTOR","DRAFTING_TEAM_LEAD","DRAFTER"].includes(roleClass))throw new AppError("INVALID_REQUEST","Phân công hồ sơ không hợp lệ.");projectAssignment={projectId,roleClass}}return{username,displayName,password,systemRoles,...(projectAssignment?{projectAssignment}:{})}}

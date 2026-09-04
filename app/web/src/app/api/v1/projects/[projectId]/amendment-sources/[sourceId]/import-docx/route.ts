import { randomUUID } from "node:crypto";
import { authorizeProject } from "@/server/authorization";
import { databasePool } from "@/server/database";
import { extractDocxStructure } from "@/server/docx-structure-extractor";
import { AppError } from "@/server/errors";
import { correlationId, failure, success } from "@/server/http";
import { authenticate } from "@/server/identity";
import { PostgresAmendmentRepository } from "@/server/amendment-repository";
import { publishingStorage } from "@/server/publishing-storage";
import { parseImportAmendmentSource } from "@/server/validation/amendment";
import { assertUuid } from "@/server/validation/workspace";

export const runtime="nodejs";
const DOCX="application/vnd.openxmlformats-officedocument.wordprocessingml.document",MAX_BYTES=20*1024*1024;
type C=RouteContext<"/api/v1/projects/[projectId]/amendment-sources/[sourceId]/import-docx">;

export async function POST(request:Request,context:C){const cid=correlationId(request);try{
 const{projectId,sourceId}=await context.params;assertUuid(projectId,"projectId");assertUuid(sourceId,"sourceId");
 const pool=databasePool(),actor=await authorizeProject(pool,authenticate(request.headers),projectId,"AMENDMENT_TARGET_MANAGE"),form=await request.formData(),file=form.get("file");
 if(!(file instanceof File)||!file.name.toLowerCase().endsWith(".docx"))throw new AppError("INVALID_REQUEST","Chỉ chấp nhận tệp .docx.");if(file.size<=0||file.size>MAX_BYTES)throw new AppError("INVALID_REQUEST","Tệp DOCX phải có dung lượng từ 1 byte đến 20 MB.");
 const bytes=new Uint8Array(await file.arrayBuffer());let ruleSet:unknown;try{ruleSet=JSON.parse(String(form.get("ruleSet")??""))}catch{throw new AppError("INVALID_REQUEST","Bộ quy tắc cấu trúc không hợp lệ.")}const ruleRef=ruleSet as{versionId?:string},configured=await pool.query("SELECT configuration FROM legal_builder.legal_structure_rule_set_version WHERE id=$1",[ruleRef.versionId]),allowedRoots=configured.rows[0]?.configuration?.allowedRootTypes;const nodes=extractDocxStructure(bytes,Array.isArray(allowedRoots)&&allowedRoots.includes("DOCUMENT_BODY"));
 const sourceDescription=String(form.get("sourceDescription")??"").trim(),sourceUrl=String(form.get("sourceUrl")??"").trim(),collectedAt=String(form.get("collectedAt")??new Date().toISOString()),storageKey=`source-imports/${projectId}/${sourceId}/${randomUUID()}.docx`,storage=publishingStorage();await storage.checkReady();const stored=await storage.putOnce(storageKey,bytes);
 const version=await new PostgresAmendmentRepository(pool).importStructured(projectId,sourceId,parseImportAmendmentSource({ruleSet,nodes,sourceDescription,correlationId:cid}),actor),fileId=randomUUID();
 await pool.query("INSERT INTO legal_builder.source_import_file(id,project_id,source_document_id,source_version_id,original_filename,media_type,byte_size,checksum_sha256,storage_key,collected_at,source_url,recorded_at,recorded_by_user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,clock_timestamp(),$12)",[fileId,projectId,sourceId,version.id,file.name,DOCX,stored.byteSize,stored.checksumSha256,storageKey,new Date(collectedAt),sourceUrl||null,actor.userId]);
 return success({version,file:{id:fileId,originalFilename:file.name,mediaType:DOCX,byteSize:stored.byteSize,checksumSha256:stored.checksumSha256,collectedAt,sourceUrl:sourceUrl||undefined},nodeCount:nodes.length,classification:"RULE_BASED_UNVERIFIED",contentPreserved:true},201,cid);
 }catch(error){return failure(error,cid)}}

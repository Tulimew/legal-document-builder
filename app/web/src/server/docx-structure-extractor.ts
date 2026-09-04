import { randomUUID } from "node:crypto";
import type { LegalNode } from "@legal-document-builder/contracts";
import { strFromU8, unzipSync } from "fflate";
import { AppError } from "./errors";

const XML_ENTITIES:Record<string,string>={amp:"&",lt:"<",gt:">",quot:'"',apos:"'"};
const decode=(value:string)=>value.replace(/&#(x?[0-9a-f]+);|&([a-z]+);/gi,(_,numeric:string|undefined,named:string|undefined)=>numeric?String.fromCodePoint(Number.parseInt(numeric.replace(/^x/i,""),numeric.startsWith("x")?16:10)):(named?XML_ENTITIES[named]:undefined)??`&${named};`);
const textOf=(xml:string)=>decode(Array.from(xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g),m=>m[1]).join(""));
const paragraphBlock=(xml:string)=>({kind:"PARAGRAPH" as const,spans:[{text:textOf(xml).trim()}]});
function tableBlock(xml:string){
 const rows=Array.from(xml.matchAll(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g),row=>({id:randomUUID(),cells:Array.from(row[0].matchAll(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g),cell=>({id:randomUUID(),blocks:Array.from(cell[0].matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g),paragraph=>paragraphBlock(paragraph[0])).filter(block=>block.spans[0].text)}))}));
 return{kind:"TABLE" as const,tableId:randomUUID(),rows,metadata:{sourceEntry:"DOCX_IMPORT",classification:"STRUCTURE_PRESERVED",verificationStatus:"UNVERIFIED"}};
}

type Classified={type:string;display?:string};
export function classifyVietnameseLegalParagraph(text:string):Classified{
 const value=text.trim();
 if(/^chương\s+[ivxlcdm\d]+\b/i.test(value))return{type:"CHAPTER",display:value.match(/^chương\s+([^\s.:]+)/i)?.[1]};
 if(/^tiểu\s+mục\s+/i.test(value))return{type:"SUBSECTION",display:value.replace(/^tiểu\s+mục\s+/i,"").split(/[.:]/)[0]};
 if(/^mục\s+[ivxlcdm\d]+\b/i.test(value))return{type:"SECTION",display:value.match(/^mục\s+([^\s.:]+)/i)?.[1]};
 if(/^điều\s+\d+[a-zđ]?\b/i.test(value))return{type:"ARTICLE",display:value.match(/^điều\s+(\d+[a-zđ]?)/i)?.[1]};
 if(/^(?:khoản\s+)?\d+[.)]\s+/i.test(value))return{type:"CLAUSE",display:value.match(/^(?:khoản\s+)?(\d+)/i)?.[1]};
 if(/^[a-zđ][.)]\s+/i.test(value))return{type:"POINT",display:value.match(/^([a-zđ])/i)?.[1]};
 return{type:"OTHER"};
}

export function extractDocxStructure(bytes:Uint8Array,wrapDocumentBody=true):LegalNode[]{
 let files:Record<string,Uint8Array>;
 try{files=unzipSync(bytes)}catch{throw new AppError("INVALID_REQUEST","Tệp không phải DOCX hợp lệ hoặc đã bị hỏng.")}
 const entry=files["word/document.xml"];if(!entry)throw new AppError("INVALID_REQUEST","DOCX không có nội dung word/document.xml.");
 const xml=strFromU8(entry),body=xml.match(/<w:body(?:\s[^>]*)?>([\s\S]*?)<\/w:body>/)?.[1]??xml;
 const blocks=Array.from(body.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>|<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g),match=>match[0]).filter(block=>block.startsWith("<w:tbl")||Boolean(textOf(block).trim()));
 if(!blocks.length)throw new AppError("INVALID_REQUEST","Không tìm thấy nội dung văn bản trong DOCX.");
 const bodyId=wrapDocumentBody?randomUUID():null,nodes:LegalNode[]=bodyId?[{id:bodyId,nodeTypeCode:"DOCUMENT_BODY",parentNodeId:null,orderKey:"0001",title:"Phần nội dung",content:[{kind:"PARAGRAPH",spans:[{text:""}]}],metadata:{sourceEntry:"DOCX_IMPORT"},lifecycleStatus:"ACTIVE"}]:[];
 const parents:Record<string,string>={...(bodyId?{DOCUMENT_BODY:bodyId}:{})};let order=bodyId?1:0;
 const parentFor=(type:string):string|null=>type==="CHAPTER"?bodyId:type==="SECTION"?(parents.CHAPTER??bodyId):type==="SUBSECTION"?(parents.SECTION??parents.CHAPTER??bodyId):type==="ARTICLE"?(parents.SUBSECTION??parents.SECTION??parents.CHAPTER??bodyId):type==="CLAUSE"?(parents.ARTICLE??bodyId):type==="POINT"?(parents.CLAUSE??parents.ARTICLE??bodyId):(parents.POINT??parents.CLAUSE??parents.ARTICLE??parents.SUBSECTION??parents.SECTION??parents.CHAPTER??bodyId);
 for(const [index,block]of blocks.entries()){
  if(block.startsWith("<w:tbl")){const id=randomUUID();nodes.push({id,nodeTypeCode:"OTHER",parentNodeId:parentFor("OTHER"),orderKey:String(++order).padStart(6,"0"),title:"Bảng",content:[tableBlock(block)],metadata:{sourceEntry:"DOCX_IMPORT",sourceBlock:index+1,classification:"STRUCTURE_PRESERVED",verificationStatus:"UNVERIFIED"},displayNumberLocked:true,lifecycleStatus:"ACTIVE"});continue}
  const text=textOf(block).trim(),kind=classifyVietnameseLegalParagraph(text),id=randomUUID(),parentNodeId=parentFor(kind.type);nodes.push({id,nodeTypeCode:kind.type,parentNodeId,orderKey:String(++order).padStart(6,"0"),...(kind.display?{displayNumber:kind.display}:{}),content:[paragraphBlock(block)],metadata:{sourceEntry:"DOCX_IMPORT",sourceParagraph:index+1,classification:"RULE_BASED",verificationStatus:"UNVERIFIED"},displayNumberLocked:true,lifecycleStatus:"ACTIVE"});if(kind.type!=="OTHER"){parents[kind.type]=id;for(const child of descendantTypes(kind.type))delete parents[child]}
 }
 return nodes;
}
function descendantTypes(type:string){const order=["CHAPTER","SECTION","SUBSECTION","ARTICLE","CLAUSE","POINT"],index=order.indexOf(type);return index<0?[]:order.slice(index+1)}

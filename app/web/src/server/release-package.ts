import path from "node:path";

const FORBIDDEN_NAME=/(^|\/)\.env(?:\.|$)|(^|\/)(?:credentials?|secrets?|tokens?|private[-_]?keys?)(?:\.|$)|\.(?:dump|bak|log)$/i;
const FORBIDDEN_CONTENT=/(?:postgres(?:ql)?:\/\/[^:/\s"']+:[^@\s"']+@|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/i;

export function assertSafeReleaseEntry(relativePath:string,content?:string):void{
  const normalized=relativePath.replaceAll("\\","/");
  if(path.isAbsolute(relativePath)||normalized.includes("../")||FORBIDDEN_NAME.test(normalized))throw new Error(`Forbidden release entry: ${normalized}`);
  if(content&&FORBIDDEN_CONTENT.test(content))throw new Error(`Sensitive content in release entry: ${normalized}`);
}

export function releaseInventory(sourceCommit:string){
 if(!/^[0-9a-f]{40}$/i.test(sourceCommit))throw new Error("Release source commit must be full SHA");
 return{schemaVersion:"1",sourceCommit,components:["web-standalone","publishing-worker-source","database-migrations","runtime-manifest"] as const};
}

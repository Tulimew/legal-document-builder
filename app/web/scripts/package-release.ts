import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertSafeReleaseEntry, releaseInventory } from "../src/server/release-package";

async function scan(root:string,current=root):Promise<void>{for(const entry of await readdir(current,{withFileTypes:true})){const absolute=path.join(current,entry.name),relative=path.relative(root,absolute);assertSafeReleaseEntry(relative);if(entry.isDirectory())await scan(root,absolute);else if(/\.(?:json|js|mjs|ts|md|sql|txt)$/i.test(entry.name)){const text=await readFile(absolute,"utf8");assertSafeReleaseEntry(relative,text)}}}

async function main(){
 const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../.."),web=path.join(repo,"app/web"),outputArg=process.argv[2];
 if(!outputArg||!path.isAbsolute(outputArg))throw new Error("Usage: npm.cmd run release:package -- <absolute-output-directory>");
 const output=path.resolve(outputArg);if(output===repo||output.startsWith(`${repo}${path.sep}`))throw new Error("Release output must be outside repository");
 const sha=execFileSync("git",["rev-parse","HEAD"],{cwd:repo,encoding:"utf8"}).trim();
 await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
 await cp(path.join(web,".next/standalone"),path.join(output,"web"),{recursive:true,dereference:true,filter:(source)=>!source.endsWith(".test.ts")&&!source.includes(`${path.sep}src${path.sep}integration${path.sep}`)});
 await cp(path.join(web,".next/static"),path.join(output,"web/app/web/.next/static"),{recursive:true});
 await cp(path.join(web,"scripts/run-publishing-worker.ts"),path.join(output,"worker/run-publishing-worker.ts"),{recursive:true});
 await cp(path.join(web,"src/server"),path.join(output,"src/server"),{recursive:true,filter:(source)=>!source.endsWith(".test.ts")});
 await cp(path.join(repo,"packages/database/migrations"),path.join(output,"database/migrations"),{recursive:true});
 await writeFile(path.join(output,"RELEASE-INVENTORY.json"),`${JSON.stringify(releaseInventory(sha),null,2)}\n`);
 await scan(output);process.stdout.write(`${JSON.stringify({status:"PACKAGED",sourceCommit:sha,components:4})}\n`);
}
main().catch((error:unknown)=>{process.stdout.write(`${JSON.stringify({status:"PACKAGE_FAILED",reason:error instanceof Error?error.message:"Unknown failure"})}\n`);process.exitCode=1});

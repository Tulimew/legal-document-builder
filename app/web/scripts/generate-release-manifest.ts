import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createReleaseManifest } from "../src/server/release-manifest";

async function main(){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
 const migrations=(await readdir(path.join(root,"packages/database/migrations"))).filter(name=>/^\d{4}_.+\.sql$/.test(name)&&!name.includes("test_fixture")).sort();
 const pkg=JSON.parse(await readFile(path.join(root,"app/web/package.json"),"utf8")) as {dependencies:{next:string}};
 const manifest=createReleaseManifest({sourceCommit:execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim(),migrationHead:migrations.at(-1)!,nodeVersion:process.version,nextVersion:pkg.dependencies.next});
 process.stdout.write(`${JSON.stringify(manifest,null,2)}\n`);
}
main().catch(()=>{process.stdout.write('{"status":"MANIFEST_FAILED"}\n');process.exitCode=1});

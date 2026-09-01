export type ReleaseManifest = {
  schemaVersion: "1";
  sourceCommit: string;
  migrationHead: string;
  runtime: { node: string; next: string };
  capabilities: { web: true; publishingWorker: true; productionIdentity: true; productionStorage: true };
};

export function createReleaseManifest(input: { sourceCommit: string; migrationHead: string; nodeVersion: string; nextVersion: string }): ReleaseManifest {
  for (const [name, value] of Object.entries(input)) {
    if (!value || /(?:postgres(?:ql)?:\/\/|password|secret|token|private[ _-]?key|\\|:\/)/i.test(value)) throw new Error(`Unsafe release manifest field: ${name}`);
  }
  if (!/^[0-9a-f]{7,40}$/i.test(input.sourceCommit)) throw new Error("Invalid source commit");
  if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(input.migrationHead)) throw new Error("Invalid migration head");
  return { schemaVersion:"1",sourceCommit:input.sourceCommit,migrationHead:input.migrationHead,runtime:{node:input.nodeVersion,next:input.nextVersion},capabilities:{web:true,publishingWorker:true,productionIdentity:true,productionStorage:true} };
}

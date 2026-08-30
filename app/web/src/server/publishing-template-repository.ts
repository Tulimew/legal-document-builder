import type { PublishingTemplateVersion } from "@legal-document-builder/contracts";
import type { Pool } from "pg";

export class PostgresPublishingTemplateRepository {
  constructor(private readonly pool:Pool) {}
  async list():Promise<PublishingTemplateVersion[]> {
    const result=await this.pool.query(`SELECT v.*,d.code,d.name FROM legal_builder.publishing_template_version v JOIN legal_builder.publishing_template_definition d ON d.id=v.definition_id ORDER BY d.code,v.version_code`);
    return result.rows.map(row=>({contractVersion:"1.1",id:row.id,definitionId:row.definition_id,code:row.code,name:row.name,versionCode:row.version_code,status:row.status_code,rendererKind:row.renderer_kind_code,schemaVersion:row.schema_version,configuration:row.configuration,provenance:row.provenance,createdAt:new Date(row.created_at).toISOString()}));
  }
  async find(id:string):Promise<PublishingTemplateVersion|null>{return (await this.list()).find(item=>item.id===id)??null}
}

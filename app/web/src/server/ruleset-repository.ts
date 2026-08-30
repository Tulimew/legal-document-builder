import type { LegalDocumentSnapshot, LegalNode, VersionedConfigRef } from "@legal-document-builder/contracts";
import type { Pool, PoolClient } from "pg";
import { AppError } from "./errors";

interface RuleSetConfiguration { schemaVersion: string; mode: string; allowedNodeTypes?: string[]; allowedRootTypes?: string[]; allowedChildren?: Record<string,string[]>; managedNumberTypes?: string[] }
interface RuleSetRow { id:string; definition_id:string; version_code:string; status_code:string; configuration:RuleSetConfiguration }

export class PostgresRuleSetRepository {
  constructor(private readonly queryable: Pick<Pool,"query">|PoolClient) {}
  async validateDocument(ruleSet:VersionedConfigRef,document:LegalDocumentSnapshot):Promise<void>{
    const row=await this.loadWritableRuleSet(ruleSet);
    validateConfiguredTree(row.configuration,document.nodes);
  }
  async validateWorkspaceNodes(workspaceId:string,nodes:LegalNode[]):Promise<void>{
    const result=await this.queryable.query<RuleSetRow>(`SELECT r.* FROM legal_builder.draft_workspace w JOIN legal_builder.legal_structure_rule_set_version r ON r.id=w.ruleset_version_id AND r.definition_id=w.ruleset_definition_id AND r.version_code=w.ruleset_version_code WHERE w.id=$1`,[workspaceId]);
    if(!result.rowCount)throw new AppError("INVALID_DOCUMENT","Không tìm thấy persisted RuleSet version được workspace tham chiếu.");
    const row=await this.ensureWritable(result.rows[0]);
    validateConfiguredTree(row.configuration,nodes);
  }
  private async loadWritableRuleSet(ruleSet:VersionedConfigRef):Promise<RuleSetRow>{
    const result=await this.queryable.query<RuleSetRow>("SELECT * FROM legal_builder.legal_structure_rule_set_version WHERE id=$1 AND definition_id=$2 AND version_code=$3",[ruleSet.versionId,ruleSet.definitionId,ruleSet.versionCode]);
    if(!result.rowCount)throw new AppError("INVALID_DOCUMENT","Không tìm thấy persisted RuleSet version được workspace tham chiếu.");
    return this.ensureWritable(result.rows[0]);
  }
  private async ensureWritable(row:RuleSetRow):Promise<RuleSetRow>{
    if(row.status_code==="REFERENCE_ONLY")throw new AppError("INVALID_DOCUMENT","RuleSet chỉ có reference lịch sử và chưa đủ cấu hình để structure write.",{ruleSetVersionId:row.id,status:row.status_code});
    if(row.status_code==="DEVELOPMENT_ONLY"){const database=await this.queryable.query<{name:string}>("SELECT current_database() name");if(!database.rows[0].name.endsWith("_dev"))throw new AppError("INVALID_DOCUMENT","RuleSet DEVELOPMENT_ONLY không được dùng ngoài database development.")}
    if(row.status_code==="RETIRED")throw new AppError("INVALID_DOCUMENT","RuleSet đã retired; không được dùng cho structure write mới.");
    return row;
  }
}

export function validateConfiguredTree(config:RuleSetConfiguration,nodes:LegalNode[]):void{
  if(config.schemaVersion!=="1"||!config.allowedNodeTypes||!config.allowedRootTypes||!config.allowedChildren)throw new AppError("INVALID_DOCUMENT","Persisted RuleSet configuration không hỗ trợ structure validation.");
  const byId=new Map(nodes.map(node=>[node.id,node]));
  for(const node of nodes){
    if(!config.allowedNodeTypes.includes(node.nodeTypeCode))throw new AppError("INVALID_DOCUMENT",`RuleSet không cho phép node type ${node.nodeTypeCode}.`);
    if(node.parentNodeId===null){if(!config.allowedRootTypes.includes(node.nodeTypeCode))throw new AppError("INVALID_DOCUMENT",`RuleSet không cho phép ${node.nodeTypeCode} ở root.`);continue}
    const parent=byId.get(node.parentNodeId);if(!parent)throw new AppError("INVALID_DOCUMENT",`Parent ${node.parentNodeId} không tồn tại.`);
    if(!(config.allowedChildren[parent.nodeTypeCode]??[]).includes(node.nodeTypeCode))throw new AppError("INVALID_DOCUMENT",`RuleSet không cho phép ${node.nodeTypeCode} nằm trong ${parent.nodeTypeCode}.`);
  }
}

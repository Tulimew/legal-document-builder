import {randomUUID} from "node:crypto";
import type {ActorRef,AmendmentLayoutConfiguration,SetAmendmentLayoutRequest} from "@legal-document-builder/contracts";
import type {Pool,PoolClient} from "pg";
import {inTransaction} from "./database";

export class PostgresAmendmentLayoutRepository{
  constructor(private readonly pool:Pool){}

  async getActive(projectId:string):Promise<AmendmentLayoutConfiguration|null>{
    const result=await this.pool.query("SELECT * FROM legal_builder.amendment_layout_configuration WHERE project_id=$1 AND status_code='ACTIVE'",[projectId]);
    return result.rowCount?mapConfiguration(result.rows[0]):null;
  }

  async setActive(projectId:string,request:SetAmendmentLayoutRequest,actor:ActorRef):Promise<AmendmentLayoutConfiguration>{
    return inTransaction(this.pool,async client=>{
      await client.query("SELECT id FROM legal_builder.legal_document_project WHERE id=$1 FOR UPDATE",[projectId]);
      const current=await client.query("SELECT id,layout_mode_code,ruleset_version_code,decision_basis FROM legal_builder.amendment_layout_configuration WHERE project_id=$1 AND status_code='ACTIVE' FOR UPDATE",[projectId]);
      if(current.rowCount&&current.rows[0].layout_mode_code===request.layoutMode&&current.rows[0].ruleset_version_code===request.rulesetVersionCode&&current.rows[0].decision_basis===request.decisionBasis){
        return (await this.getActiveWithClient(client,projectId))!;
      }
      const supersedesId=current.rowCount?String(current.rows[0].id):null;
      if(supersedesId)await client.query("UPDATE legal_builder.amendment_layout_configuration SET status_code='SUPERSEDED' WHERE id=$1",[supersedesId]);
      const id=randomUUID(),createdAt=new Date();
      await client.query("INSERT INTO legal_builder.amendment_layout_configuration(id,project_id,layout_mode_code,ruleset_version_code,decision_basis,status_code,supersedes_configuration_id,created_at,created_by_user_id) VALUES($1,$2,$3,$4,$5,'ACTIVE',$6,$7,$8)",[id,projectId,request.layoutMode,request.rulesetVersionCode,request.decisionBasis,supersedesId,createdAt,actor.userId]);
      await audit(client,projectId,id,actor,request.correlationId,{layoutMode:request.layoutMode,rulesetVersionCode:request.rulesetVersionCode,supersedesConfigurationId:supersedesId});
      return{contractVersion:request.contractVersion,id,projectId,layoutMode:request.layoutMode,rulesetVersionCode:request.rulesetVersionCode,decisionBasis:request.decisionBasis,status:"ACTIVE",createdAt:createdAt.toISOString(),createdBy:actor};
    });
  }

  private async getActiveWithClient(client:PoolClient,projectId:string){const result=await client.query("SELECT * FROM legal_builder.amendment_layout_configuration WHERE project_id=$1 AND status_code='ACTIVE'",[projectId]);return result.rowCount?mapConfiguration(result.rows[0]):null;}
}

function mapConfiguration(row:Record<string,unknown>):AmendmentLayoutConfiguration{return{contractVersion:"1.1",id:String(row.id),projectId:String(row.project_id),layoutMode:row.layout_mode_code as AmendmentLayoutConfiguration["layoutMode"],rulesetVersionCode:String(row.ruleset_version_code),decisionBasis:String(row.decision_basis),status:row.status_code as AmendmentLayoutConfiguration["status"],createdAt:(row.created_at as Date).toISOString(),createdBy:{userId:String(row.created_by_user_id)}}}
async function audit(client:PoolClient,projectId:string,id:string,actor:ActorRef,correlationId:string,metadata:object){await client.query(`INSERT INTO legal_builder.audit_event(id,project_id,event_type_code,aggregate_type_code,aggregate_id,actor_user_id,actor_person_id,actor_membership_id,actor_delegation_id,correlation_id,occurred_at,metadata) VALUES($1,$2,'AMENDMENT_LAYOUT_SELECTED','AMENDMENT_LAYOUT_CONFIGURATION',$3,$4,$5,$6,$7,$8,clock_timestamp(),$9::jsonb)`,[randomUUID(),projectId,id,actor.userId,actor.personId??null,actor.projectMembershipId??null,actor.delegationId??null,correlationId,JSON.stringify(metadata)])}

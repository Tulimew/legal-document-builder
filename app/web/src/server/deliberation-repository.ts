import { randomUUID } from "node:crypto";
import type { ActorRef, CreateMemberResolutionOpinionRequest, MemberResolutionOpinion, RecordMeetingDecisionRequest, ResolutionDecision } from "@legal-document-builder/contracts";
import type { Pool, PoolClient } from "pg";
import { inTransaction } from "./database";
import { AppError } from "./errors";

export type MemberOpinionView = MemberResolutionOpinion & { memberName: string; sequence: number };
export type MeetingDecisionView = ResolutionDecision & { selectedOpinionId?: string; meetingOption?: string; draftPrefilled?: boolean; targetNodeId?: string };

export class PostgresDeliberationRepository {
  constructor(private readonly pool: Pool) {}

  async listOpinions(projectId: string, commentId: string): Promise<MemberOpinionView[]> {
    const result=await this.pool.query(`SELECT o.*,p.display_name
      FROM legal_builder.member_resolution_opinion o
      JOIN legal_builder.resolution_case c ON c.id=o.resolution_case_id
      JOIN legal_builder.project_membership m ON m.id=o.member_membership_id
      JOIN legal_builder.person p ON p.id=m.person_id
      WHERE c.project_id=$1 AND c.comment_id=$2
      ORDER BY o.recorded_at,o.id`,[projectId,commentId]);
    return result.rows.map(row=>mapOpinion(row));
  }

  async createOpinion(projectId:string,commentId:string,request:CreateMemberResolutionOpinionRequest,actor:ActorRef):Promise<MemberOpinionView>{
    if(!actor.projectMembershipId)throw new AppError("FORBIDDEN","Tài khoản chưa có tư cách thành viên trong hồ sơ.");
    const memberMembershipId=actor.projectMembershipId;
    return inTransaction(this.pool,async client=>{
      const comment=await client.query("SELECT target_description FROM legal_builder.comment WHERE id=$1 AND project_id=$2 FOR SHARE",[commentId,projectId]);
      if(!comment.rowCount)throw new AppError("NOT_FOUND","Không tìm thấy ý kiến góp ý.");
      let resolutionCase=await client.query("SELECT id,status_code FROM legal_builder.resolution_case WHERE comment_id=$1 AND project_id=$2 FOR UPDATE",[commentId,projectId]);
      if(!resolutionCase.rowCount){
        const caseId=randomUUID();
        await client.query("INSERT INTO legal_builder.resolution_case(id,project_id,comment_id,title,status_code,opened_at,opened_by_user_id) VALUES($1,$2,$3,$4,'OPEN',clock_timestamp(),$5)",[caseId,projectId,commentId,`Xử lý ${comment.rows[0].target_description}`,actor.userId]);
        resolutionCase={...resolutionCase,rows:[{id:caseId,status_code:"OPEN"}],rowCount:1};
      }
      if(resolutionCase.rows[0].status_code!=="OPEN")throw new AppError("REVISION_CONFLICT","Vấn đề đã kết luận hoặc đóng, không thể thêm quan điểm.");
      const previous=await client.query("SELECT id,sequence FROM legal_builder.member_resolution_opinion WHERE resolution_case_id=$1 AND member_membership_id=$2 ORDER BY sequence DESC LIMIT 1",[resolutionCase.rows[0].id,memberMembershipId]);
      const id=randomUUID(),sequence=previous.rowCount?Number(previous.rows[0].sequence)+1:1,recordedAt=new Date();
      await client.query(`INSERT INTO legal_builder.member_resolution_opinion(id,resolution_case_id,member_membership_id,sequence,proposed_resolution_type_code,reasoning,proposed_draft_content,recorded_at,recorded_by_user_id,supersedes_opinion_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[id,resolutionCase.rows[0].id,memberMembershipId,sequence,request.proposedResolutionType,request.reasoning,request.proposedDraftContent??null,recordedAt,actor.userId,previous.rows[0]?.id??null]);
      await audit(client,projectId,id,actor,request.correlationId,{commentId,resolutionCaseId:resolutionCase.rows[0].id,sequence});
      const person=await client.query("SELECT p.display_name FROM legal_builder.project_membership m JOIN legal_builder.person p ON p.id=m.person_id WHERE m.id=$1",[memberMembershipId]);
      return {contractVersion:request.contractVersion,id,resolutionCaseId:resolutionCase.rows[0].id,memberMembershipId,memberName:person.rows[0]?.display_name??"Thành viên",sequence,proposedResolutionType:request.proposedResolutionType,reasoning:request.reasoning,...(request.proposedDraftContent?{proposedDraftContent:request.proposedDraftContent}:{}),recordedAt:recordedAt.toISOString(),recordedBy:actor,...(previous.rows[0]?.id?{supersedesOpinionId:previous.rows[0].id}:{})};
    });
  }

  async listDecisions(projectId:string,commentId:string):Promise<MeetingDecisionView[]>{
    const result=await this.pool.query(`SELECT d.*,o.summary AS meeting_option,roo.member_opinion_id,prefill.legal_node_id AS target_node_id
      FROM legal_builder.resolution_decision d JOIN legal_builder.resolution_case c ON c.id=d.resolution_case_id
      LEFT JOIN legal_builder.resolution_option o ON o.id=d.selected_option_id
      LEFT JOIN LATERAL(SELECT member_opinion_id FROM legal_builder.resolution_option_opinion WHERE resolution_option_id=o.id ORDER BY member_opinion_id LIMIT 1)roo ON true
      LEFT JOIN LATERAL(SELECT n.legal_node_id FROM legal_builder.workspace_legal_node n JOIN legal_builder.draft_workspace w ON w.id=n.workspace_id WHERE w.project_id=c.project_id AND n.metadata->'pendingDecision'->>'decisionId'=d.id::text LIMIT 1)prefill ON true
      WHERE c.project_id=$1 AND c.comment_id=$2 ORDER BY d.sequence`,[projectId,commentId]);
    return result.rows.map(row=>({contractVersion:"1.1",id:row.id,resolutionCaseId:row.resolution_case_id,sequence:Number(row.sequence),decisionType:row.decision_type_code,...(row.selected_option_id?{selectedOptionId:row.selected_option_id}:{}),...(row.member_opinion_id?{selectedOpinionId:row.member_opinion_id}:{}),...(row.decision_type_code==="COMBINE"&&row.meeting_option?{meetingOption:row.meeting_option}:{}),reason:row.reason,authorityBasis:row.authority_basis,...(row.drafting_instruction?{draftingInstruction:row.drafting_instruction}:{}),decidedAt:row.decided_at.toISOString(),decidedBy:{userId:row.decided_by_user_id,projectMembershipId:row.decided_by_membership_id},...(row.target_node_id?{draftPrefilled:true,targetNodeId:row.target_node_id}:{}),...(row.supersedes_decision_id?{supersedesDecisionId:row.supersedes_decision_id}:{})}));
  }

  async recordDecision(projectId:string,commentId:string,request:RecordMeetingDecisionRequest,actor:ActorRef):Promise<MeetingDecisionView>{
    if(!actor.projectMembershipId)throw new AppError("FORBIDDEN","Tài khoản chưa có tư cách kết luận trong hồ sơ.");
    const decidedByMembershipId=actor.projectMembershipId;
    return inTransaction(this.pool,async client=>{
      const resolutionCase=await client.query("SELECT id,status_code FROM legal_builder.resolution_case WHERE project_id=$1 AND comment_id=$2 FOR UPDATE",[projectId,commentId]);
      if(!resolutionCase.rowCount)throw new AppError("INVALID_REQUEST","Ý kiến chưa có quan điểm thành viên để đưa ra họp.");
      if(resolutionCase.rows[0].status_code==="CLOSED")throw new AppError("REVISION_CONFLICT","Vấn đề đã đóng, không thể ghi kết luận mới.");
      const caseId=resolutionCase.rows[0].id,decisionId=randomUUID(),decidedAt=new Date();
      let selectedOptionId:string|undefined;
      if(request.selectedOpinionId){
        const opinion=await client.query("SELECT * FROM legal_builder.member_resolution_opinion WHERE id=$1 AND resolution_case_id=$2",[request.selectedOpinionId,caseId]);
        if(!opinion.rowCount)throw new AppError("INVALID_REQUEST","Phương án thành viên không thuộc vấn đề đang họp.");
        selectedOptionId=randomUUID();
        await client.query("INSERT INTO legal_builder.resolution_option(id,resolution_case_id,code,proposed_resolution_type_code,summary,proposed_draft_content,created_at,created_by_user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[selectedOptionId,caseId,`OP-${decisionId.slice(0,8)}`,opinion.rows[0].proposed_resolution_type_code,opinion.rows[0].reasoning,opinion.rows[0].proposed_draft_content,decidedAt,actor.userId]);
        await client.query("INSERT INTO legal_builder.resolution_option_opinion(resolution_option_id,member_opinion_id) VALUES($1,$2)",[selectedOptionId,request.selectedOpinionId]);
      }else if(request.meetingOption){
        selectedOptionId=randomUUID();
        await client.query("INSERT INTO legal_builder.resolution_option(id,resolution_case_id,code,proposed_resolution_type_code,summary,proposed_draft_content,created_at,created_by_user_id) VALUES($1,$2,$3,'ACCEPTED_AND_UPDATED',$4,$4,$5,$6)",[selectedOptionId,caseId,`MEET-${decisionId.slice(0,8)}`,request.meetingOption,decidedAt,actor.userId]);
      }
      const previous=await client.query("SELECT id,sequence FROM legal_builder.resolution_decision WHERE resolution_case_id=$1 ORDER BY sequence DESC LIMIT 1",[caseId]),sequence=previous.rowCount?Number(previous.rows[0].sequence)+1:1;
      await client.query(`INSERT INTO legal_builder.resolution_decision(id,resolution_case_id,sequence,decision_type_code,selected_option_id,reason,authority_basis,drafting_instruction,decided_at,decided_by_user_id,decided_by_membership_id,supersedes_decision_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[decisionId,caseId,sequence,request.decisionType,selectedOptionId??null,request.reason,request.authorityBasis,request.draftingInstruction??null,decidedAt,actor.userId,decidedByMembershipId,previous.rows[0]?.id??null]);
      await client.query("UPDATE legal_builder.resolution_case SET status_code='DECIDED' WHERE id=$1",[caseId]);
      const prefill=selectedOptionId?await prefillWorkspace(client,projectId,commentId,decisionId,selectedOptionId,actor,decidedAt,request.correlationId):undefined;
      await auditEvent(client,projectId,"RESOLUTION_DECIDED","RESOLUTION_DECISION",decisionId,actor,request.correlationId,{commentId,caseId,sequence,decisionType:request.decisionType});
      return{contractVersion:request.contractVersion,id:decisionId,resolutionCaseId:caseId,sequence,decisionType:request.decisionType,...(selectedOptionId?{selectedOptionId}:{}),...(request.selectedOpinionId?{selectedOpinionId:request.selectedOpinionId}:{}),...(request.meetingOption?{meetingOption:request.meetingOption}:{}),reason:request.reason,authorityBasis:request.authorityBasis,...(request.draftingInstruction?{draftingInstruction:request.draftingInstruction}:{}),decidedAt:decidedAt.toISOString(),decidedBy:actor,...(prefill?{draftPrefilled:true,targetNodeId:prefill}:{}),...(previous.rows[0]?.id?{supersedesDecisionId:previous.rows[0].id}:{})};
    });
  }
}

function mapOpinion(row:Record<string,unknown>):MemberOpinionView{return {contractVersion:"1.1",id:String(row.id),resolutionCaseId:String(row.resolution_case_id),memberMembershipId:String(row.member_membership_id),memberName:String(row.display_name),sequence:Number(row.sequence),proposedResolutionType:row.proposed_resolution_type_code as MemberOpinionView["proposedResolutionType"],reasoning:String(row.reasoning),...(row.proposed_draft_content?{proposedDraftContent:String(row.proposed_draft_content)}:{}),recordedAt:(row.recorded_at as Date).toISOString(),recordedBy:{userId:String(row.recorded_by_user_id)},...(row.supersedes_opinion_id?{supersedesOpinionId:String(row.supersedes_opinion_id)}:{})}}
async function audit(client:PoolClient,projectId:string,id:string,actor:ActorRef,correlationId:string,metadata:object){await client.query(`INSERT INTO legal_builder.audit_event(id,project_id,event_type_code,aggregate_type_code,aggregate_id,actor_user_id,actor_person_id,actor_membership_id,actor_delegation_id,correlation_id,occurred_at,metadata) VALUES($1,$2,'RESOLUTION_OPINION_RECORDED','MEMBER_RESOLUTION_OPINION',$3,$4,$5,$6,$7,$8,clock_timestamp(),$9::jsonb)`,[randomUUID(),projectId,id,actor.userId,actor.personId??null,actor.projectMembershipId??null,actor.delegationId??null,correlationId,JSON.stringify(metadata)])}
async function auditEvent(client:PoolClient,projectId:string,event:string,aggregateType:string,id:string,actor:ActorRef,correlationId:string,metadata:object){await client.query(`INSERT INTO legal_builder.audit_event(id,project_id,event_type_code,aggregate_type_code,aggregate_id,actor_user_id,actor_person_id,actor_membership_id,actor_delegation_id,correlation_id,occurred_at,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,clock_timestamp(),$11::jsonb)`,[randomUUID(),projectId,event,aggregateType,id,actor.userId,actor.personId??null,actor.projectMembershipId??null,actor.delegationId??null,correlationId,JSON.stringify(metadata)])}
async function prefillWorkspace(client:PoolClient,projectId:string,commentId:string,decisionId:string,optionId:string,actor:ActorRef,decidedAt:Date,correlationId:string):Promise<string|undefined>{const source=await client.query(`SELECT t.legal_node_id,o.proposed_draft_content FROM legal_builder.comment_target_node t JOIN legal_builder.comment c ON c.id=t.comment_id JOIN legal_builder.resolution_option o ON o.id=$2 WHERE t.comment_id=$1 AND c.project_id=$3 ORDER BY t.legal_node_id LIMIT 1`,[commentId,optionId,projectId]);if(!source.rowCount||!source.rows[0].proposed_draft_content)return;const workspace=await client.query(`SELECT w.id FROM legal_builder.draft_workspace w JOIN legal_builder.draft_branch b ON b.id=w.branch_id WHERE w.project_id=$1 AND b.status='ACTIVE' ORDER BY w.updated_at DESC LIMIT 1 FOR UPDATE`,[projectId]);if(!workspace.rowCount)return;const nodeId=source.rows[0].legal_node_id,metadata={decisionId,commentId,optionId,status:"PENDING_DRAFTER_CONFIRMATION",prefilledAt:decidedAt.toISOString()};const updated=await client.query(`UPDATE legal_builder.workspace_legal_node SET content_blocks=$3::jsonb,metadata=metadata||jsonb_build_object('pendingDecision',$4::jsonb),updated_at=$5,updated_by_user_id=$6 WHERE workspace_id=$1 AND legal_node_id=$2`,[workspace.rows[0].id,nodeId,JSON.stringify([{kind:"PARAGRAPH",spans:[{text:source.rows[0].proposed_draft_content}]}]),JSON.stringify(metadata),decidedAt,actor.userId]);if(!updated.rowCount)return;await client.query(`UPDATE legal_builder.draft_workspace SET revision=revision+1,updated_at=$2,updated_by_user_id=$3,updated_by_person_id=$4,updated_by_membership_id=$5,updated_under_delegation_id=$6 WHERE id=$1`,[workspace.rows[0].id,decidedAt,actor.userId,actor.personId??null,actor.projectMembershipId??null,actor.delegationId??null]);await auditEvent(client,projectId,"WORKSPACE_PREFILLED_FROM_DECISION","DRAFT_WORKSPACE",workspace.rows[0].id,actor,correlationId,{decisionId,commentId,optionId,nodeId,status:"PENDING_DRAFTER_CONFIRMATION"});return nodeId}

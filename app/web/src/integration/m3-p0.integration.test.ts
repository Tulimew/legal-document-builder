import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {mkdir,stat,writeFile} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

import {Pool} from "pg";
import JSZip from "jszip";

import {buildPersistentReviewSynthesis} from "@/lib/document-exports";
import {authorizeProject} from "@/server/authorization";
import {PostgresDeliberationRepository} from "@/server/deliberation-repository";
import {AppError} from "@/server/errors";
import {PostgresReviewRepository} from "@/server/review-repository";
import {PostgresStep4ChangeRepository} from "@/server/step4-change-repository";

const envPath=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../.env.local");
const localEnv=Object.fromEntries(readFileSync(envPath,"utf8").replace(/^\uFEFF/,"").split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith("#")&&line.includes("=")).map(line=>{const index=line.indexOf("=");return[line.slice(0,index).trim(),line.slice(index+1).trim().replace(/^['"]|['"]$/g,"")]}));

test("P0 M3 chạy chuỗi nghiệp vụ thật trên PostgreSQL development",async(t)=>{
  const connectionString=process.env.DATABASE_URL||localEnv.DATABASE_URL;
  assert.ok(connectionString,"DATABASE_URL phải có trong .env.local để chạy integration test M3.");
  const pool=new Pool({connectionString,max:2,application_name:"legal-builder-m3-p0-integration"});
  t.after(async()=>pool.end());

  const database=(await pool.query<{name:string}>("SELECT current_database() AS name")).rows[0].name;
  assert.match(database,/_dev$/,"Integration test chỉ được chạy trên database development có hậu tố _dev.");

  const projectId=process.env.NEXT_PUBLIC_SAMPLE_PROJECT_ID||localEnv.NEXT_PUBLIC_SAMPLE_PROJECT_ID;
  const userId=process.env.NEXT_PUBLIC_DEVELOPMENT_USER_ID||localEnv.NEXT_PUBLIC_DEVELOPMENT_USER_ID;
  const workspaceId=process.env.NEXT_PUBLIC_SAMPLE_WORKSPACE_ID||localEnv.NEXT_PUBLIC_SAMPLE_WORKSPACE_ID;
  assert.ok(projectId&&userId&&workspaceId,"Thiếu ID fixture development trong .env.local.");

  const actor=await authorizeProject(pool,{userId},projectId,"COMMENT_CREATE");
  assert.ok(actor.projectMembershipId,"Fixture phải có membership đã được server xác định.");
  const review=new PostgresReviewRepository(pool),deliberation=new PostgresDeliberationRepository(pool),step4=new PostgresStep4ChangeRepository(pool);
  const suffix=Date.now().toString(36).toUpperCase(),versionCode=`M3-P0-${suffix}`;
  const round=(await pool.query<{id:string;source_draft_version_id:string}>("SELECT id,source_draft_version_id FROM legal_builder.review_round WHERE project_id=$1 AND closed_at IS NULL ORDER BY opened_at LIMIT 1",[projectId])).rows[0];
  assert.ok(round,"Fixture cần một ReviewRound đang mở.");
  const target=(await pool.query<{legal_node_id:string}>("SELECT legal_node_id FROM legal_builder.legal_node_version_state WHERE draft_version_id=$1 ORDER BY order_key LIMIT 1",[round.source_draft_version_id])).rows[0];
  assert.ok(target,"Fixture cần một LegalNode thuộc DraftVersion nguồn.");

  const comment=await review.createComment(projectId,{contractVersion:"1.1",reviewRoundId:round.id,sourceDraftVersionId:round.source_draft_version_id,targetScopeType:"ARTICLE",issueGroup:`Nghiệm thu ${suffix}`,targetNodeIds:[target.legal_node_id],targetDescription:`Điều kiểm thử ${suffix}`,contributorOrganizationName:"Đơn vị kiểm thử tích hợp M3",commentContent:"Đề nghị làm rõ trách nhiệm phối hợp và thời hạn xử lý.",receivedAt:new Date(Date.now()-1000).toISOString(),correlationId:`m3-comment-${suffix}`},actor);

  await t.test("fixture tạo comment, deliberation và decision persistent",async()=>{
    const opinionActor=await authorizeProject(pool,{userId},projectId,"RESOLUTION_OPINION_CREATE");
    const opinion=await deliberation.createOpinion(projectId,comment.id,{contractVersion:"1.1",proposedResolutionType:"ACCEPTED_AND_UPDATED",reasoning:"Tiếp thu để làm rõ trách nhiệm phối hợp.",proposedDraftContent:`Nội dung sau kết luận họp ${suffix}.`,correlationId:`m3-opinion-${suffix}`},opinionActor);
    const decisionActor=await authorizeProject(pool,{userId},projectId,"RESOLUTION_DECIDE");
    const decision=await deliberation.recordDecision(projectId,comment.id,{contractVersion:"1.1",decisionType:"SELECT_OPTION",selectedOpinionId:opinion.id,reason:"Phương án phù hợp mục tiêu dự thảo.",authorityBasis:"Kết luận của người chủ trì fixture M3.",draftingInstruction:"Chỉnh lý theo phương án đã chọn.",correlationId:`m3-decision-${suffix}`},decisionActor);
    assert.equal(decision.selectedOpinionId,opinion.id);
    assert.equal((await deliberation.listDecisions(projectId,comment.id)).at(-1)?.id,decision.id);
  });

  const workspaceNode=(await pool.query<{content:string;revision:number}>(`SELECT string_agg(span->>'text','' ORDER BY block_ord,span_ord) AS content,w.revision
    FROM legal_builder.draft_workspace w JOIN legal_builder.workspace_legal_node n ON n.workspace_id=w.id
    CROSS JOIN LATERAL jsonb_array_elements(n.content_blocks) WITH ORDINALITY b(block,block_ord)
    CROSS JOIN LATERAL jsonb_array_elements(block->'spans') WITH ORDINALITY s(span,span_ord)
    WHERE w.id=$1 AND n.legal_node_id=$2 GROUP BY w.revision`,[workspaceId,target.legal_node_id])).rows[0];
  assert.ok(workspaceNode,"Kết luận phải điền nội dung vào workspace thật.");
  const finalText=`Nội dung đã hoàn thiện và chốt tại M3 ${suffix}.`;
  const proposalActor=await authorizeProject(pool,{userId},projectId,"STEP4_CHANGE_CREATE");
  const proposal=await step4.create(projectId,workspaceId,{contractVersion:"1.1",legalNodeId:target.legal_node_id,location:`Điều kiểm thử ${suffix}`,beforeState:{content:workspaceNode.content},afterState:{content:finalText},sourceType:"MEETING_CONCLUSION",sourceReference:comment.id,reason:"Thực hiện kết luận fixture nghiệm thu M3.",authorityBasis:"Kết luận của người chủ trì fixture M3.",changesMeetingConclusion:false,correlationId:`m3-proposal-${suffix}`},proposalActor);
  const decisionActor=await authorizeProject(pool,{userId},projectId,"STEP4_CHANGE_DECIDE");
  await step4.decide(projectId,proposal.id,{contractVersion:"1.1",decisionType:"APPROVE",reason:"Đủ điều kiện chốt trong fixture M3.",authorityBasis:"Biên bản nghiệm thu kỹ thuật P0.",correlationId:`m3-approve-${suffix}`},decisionActor);
  const readiness=await step4.readiness(workspaceId);
  assert.equal(readiness.ready,true);
  const finalizeActor=await authorizeProject(pool,{userId},projectId,"STEP4_FINALIZE");
  const finalized=await step4.finalize(projectId,workspaceId,{contractVersion:"1.1",expectedRevision:readiness.workspaceRevision,versionCode,versionName:`Phiên bản nghiệm thu M3 ${suffix}`,completionReport:"Đã chạy chuỗi comment, deliberation, decision và proposal được duyệt.",authorityBasis:"Biên bản nghiệm thu kỹ thuật P0.",correlationId:`m3-finalize-${suffix}`},finalizeActor);

  await t.test("approved proposal tạo DraftVersion và linked LegalChange",async()=>{
    assert.equal(finalized.legalChangeIds.length,1);
    const persisted=await pool.query<{effective_version_id:string;before_state:Record<string,unknown>;after_state:Record<string,unknown>}>("SELECT effective_version_id,before_state,after_state FROM legal_builder.draft_legal_node_change WHERE id=$1",[finalized.legalChangeIds[0]]);
    assert.equal(persisted.rows[0].effective_version_id,finalized.draftVersionId);
    assert.match(JSON.stringify(persisted.rows[0].before_state),new RegExp(suffix));
    assert.match(JSON.stringify(persisted.rows[0].after_state),new RegExp(suffix));
  });

  const resolveActor=await authorizeProject(pool,{userId},projectId,"COMMENT_RESOLVE");
  const accepted=await review.resolve(projectId,comment.id,{contractVersion:"1.1",resolutionType:"ACCEPTED_AND_UPDATED",explanation:"Đã chỉnh lý toàn bộ theo kết luận.",linkedChangeIds:finalized.legalChangeIds,effectiveDraftVersionId:finalized.draftVersionId,correlationId:`m3-accepted-${suffix}`},resolveActor);

  await t.test("ACCEPTED liên kết đúng LegalChange và effective DraftVersion",()=>{
    assert.deepEqual(accepted.linkedChangeIds,finalized.legalChangeIds);
    assert.equal(accepted.effectiveDraftVersionId,finalized.draftVersionId);
  });

  const partial=await review.resolve(projectId,comment.id,{contractVersion:"1.1",resolutionType:"PARTIALLY_ACCEPTED",explanation:"Tiếp thu phần trách nhiệm phối hợp; giữ nguyên phần còn lại.",linkedChangeIds:finalized.legalChangeIds,effectiveDraftVersionId:finalized.draftVersionId,correlationId:`m3-partial-${suffix}`},resolveActor);

  await t.test("PARTIALLY_ACCEPTED tạo history và supersede resolution trước",async()=>{
    assert.equal(partial.sequence,accepted.sequence+1);
    assert.equal(partial.supersedesResolutionId,accepted.id);
    const history=await review.listResolutions(projectId,comment.id);
    assert.equal(history[0].id,partial.id);
    assert.equal(history[1].id,accepted.id);
    assert.deepEqual(history[0].linkedChangeIds,finalized.legalChangeIds);
  });

  const explainedComment=await review.createComment(projectId,{contractVersion:"1.1",reviewRoundId:round.id,sourceDraftVersionId:round.source_draft_version_id,targetScopeType:"ARTICLE",issueGroup:`Giải trình ${suffix}`,targetNodeIds:[target.legal_node_id],targetDescription:`Điều giải trình ${suffix}`,contributorOrganizationName:"Đơn vị kiểm thử tích hợp M3",commentContent:"Đề nghị bỏ toàn bộ quy định thử nghiệm.",receivedAt:new Date(Date.now()-1000).toISOString(),correlationId:`m3-explained-comment-${suffix}`},actor);
  const explained=await review.resolve(projectId,explainedComment.id,{contractVersion:"1.1",resolutionType:"EXPLAINED_NOT_ACCEPTED",explanation:"Không tiếp thu vì không phù hợp phạm vi của fixture.",linkedChangeIds:[],correlationId:`m3-explained-${suffix}`},resolveActor);

  await t.test("EXPLAINED_NOT_ACCEPTED lưu giải trình không cần change/version",()=>{
    assert.equal(explained.resolutionType,"EXPLAINED_NOT_ACCEPTED");
    assert.deepEqual(explained.linkedChangeIds,[]);
    assert.equal(explained.effectiveDraftVersionId,undefined);
  });

  await t.test("effective-version mismatch rollback toàn bộ transaction",async()=>{
    const before=Number((await pool.query("SELECT count(*) FROM legal_builder.comment_resolution WHERE comment_id=$1",[comment.id])).rows[0].count);
    await assert.rejects(()=>review.resolve(projectId,comment.id,{contractVersion:"1.1",resolutionType:"ACCEPTED_AND_UPDATED",linkedChangeIds:finalized.legalChangeIds,effectiveDraftVersionId:round.source_draft_version_id,correlationId:`m3-mismatch-${suffix}`},resolveActor),(error:unknown)=>error instanceof AppError&&error.code==="INVALID_REQUEST"&&/đúng phiên bản/.test(error.message));
    const after=Number((await pool.query("SELECT count(*) FROM legal_builder.comment_resolution WHERE comment_id=$1",[comment.id])).rows[0].count);
    assert.equal(after,before,"Resolution lỗi không được để lại bản ghi một phần.");
  });

  await t.test("invalid actor bị từ chối trước thao tác nghiệp vụ",async()=>{
    await assert.rejects(()=>authorizeProject(pool,{userId:"00000000-0000-4000-8000-000000000000"},projectId,"COMMENT_RESOLVE"),(error:unknown)=>error instanceof AppError&&error.code==="FORBIDDEN");
  });

  await t.test("DOCX chứa tiếng Việt, bảng, resolution và linked change trước/sau",async()=>{
    const comments=(await review.listComments(projectId)).filter(item=>[comment.id,explainedComment.id].includes(item.id));
    const changes=(await review.listDraftChanges(projectId)).filter(item=>finalized.legalChangeIds.includes(item.id));
    const buffer=await buildPersistentReviewSynthesis(comments,changes);
    assert.equal(buffer.subarray(0,2).toString(),"PK","DOCX phải là gói ZIP OOXML hợp lệ.");
    const zip=await JSZip.loadAsync(buffer),documentXml=await zip.file("word/document.xml")!.async("string"),stylesXml=await zip.file("word/styles.xml")!.async("string");
    for(const expected of["Đơn vị kiểm thử tích hợp M3","Đề nghị làm rõ trách nhiệm phối hợp","Tiếp thu một phần","Không tiếp thu","Trước:","Sau:",finalText,"Thực hiện kết luận fixture nghiệm thu M3"]){
      assert.match(documentXml,new RegExp(expected),`DOCX thiếu nội dung: ${expected}`);
    }
    assert.match(documentXml,/<w:tbl[ >]/,"DOCX phải có bảng Word thực.");
    assert.match(stylesXml,/Times New Roman/,"DOCX phải khai báo font Times New Roman.");
    const outputDirectory=path.resolve(process.cwd(),"../../../m3-p0-docx"),outputPath=path.join(outputDirectory,`M3-P0-${suffix}.docx`);
    await mkdir(outputDirectory,{recursive:true});
    await writeFile(outputPath,buffer);
    assert.ok((await stat(outputPath)).size>0);
    t.diagnostic(`DOCX_ACCEPTANCE_PATH=${outputPath}`);
  });
});

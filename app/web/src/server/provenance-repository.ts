import type { ProvenanceEdge, ProvenanceEntityRef, ProvenanceEntry, ProvenancePage } from "@legal-document-builder/contracts";
import type { Pool } from "pg";
import { AppError } from "./errors";

type Anchor = { changeId?: string; draftVersionId?: string; legalNodeId?: string; commentId?: string };
const ref = (type:string,id:string,label?:string):ProvenanceEntityRef => ({type,id,...(label?{label}:{})});

export class PostgresProvenanceRepository {
  constructor(private readonly pool:Pool) {}
  async read(projectId:string,anchor:Anchor,canViewReview:boolean):Promise<ProvenancePage> {
    const selected=Object.entries(anchor).filter(([,value])=>value);
    if(selected.length!==1) throw new AppError("INVALID_REQUEST","Provenance yêu cầu đúng một anchor.");
    const [key,id]=selected[0] as [string,string];
    let changes:Record<string,unknown>[]=[];
    if(key==="changeId") changes=(await this.pool.query("SELECT * FROM legal_builder.draft_legal_node_change WHERE project_id=$1 AND id=$2",[projectId,id])).rows;
    else if(key==="draftVersionId") changes=(await this.pool.query("SELECT c.* FROM legal_builder.draft_legal_node_change c JOIN legal_builder.draft_version v ON v.id=$2 AND v.project_id=$1 WHERE c.project_id=$1 AND (c.effective_version_id=v.id OR c.from_version_id=v.id) ORDER BY c.decided_at",[projectId,id])).rows;
    else if(key==="legalNodeId") changes=(await this.pool.query("SELECT * FROM legal_builder.draft_legal_node_change WHERE project_id=$1 AND legal_node_id=$2 ORDER BY decided_at",[projectId,id])).rows;
    else {
      const exists=await this.pool.query("SELECT 1 FROM legal_builder.comment WHERE project_id=$1 AND id=$2",[projectId,id]);
      if(!exists.rowCount) throw new AppError("NOT_FOUND","Không tìm thấy comment trong hồ sơ.");
      changes=(await this.pool.query("SELECT c.* FROM legal_builder.comment_resolution_change l JOIN legal_builder.comment_resolution r ON r.id=l.resolution_id JOIN legal_builder.comment cm ON cm.id=r.comment_id JOIN legal_builder.draft_legal_node_change c ON c.id=l.change_id WHERE cm.project_id=$1 AND cm.id=$2 ORDER BY c.decided_at",[projectId,id])).rows;
    }
    if(key!=="commentId"&&!changes.length) {
      let exists=false;
      if(key==="draftVersionId") exists=Boolean((await this.pool.query("SELECT 1 FROM legal_builder.draft_version WHERE project_id=$1 AND id=$2",[projectId,id])).rowCount);
      if(key==="legalNodeId") exists=Boolean((await this.pool.query("SELECT 1 FROM legal_builder.legal_node_version_state s JOIN legal_builder.draft_version v ON v.id=s.draft_version_id WHERE v.project_id=$1 AND s.legal_node_id=$2 LIMIT 1",[projectId,id])).rowCount);
      if(!exists) throw new AppError("NOT_FOUND","Không tìm thấy provenance anchor trong hồ sơ.");
    }
    const changeIds=changes.map(change=>String(change.id));
    const bases=changeIds.length?(await this.pool.query("SELECT * FROM legal_builder.draft_change_basis WHERE change_id=ANY($1::uuid[])",[changeIds])).rows:[];
    const finals=changeIds.length?(await this.pool.query("SELECT fp.legal_change_id,fp.proposal_id,p.source_reference FROM legal_builder.step4_finalization_proposal fp JOIN legal_builder.step4_change_proposal p ON p.id=fp.proposal_id WHERE fp.legal_change_id=ANY($1::uuid[])",[changeIds])).rows:[];
    const resolutions=changeIds.length?(await this.pool.query("SELECT l.change_id,r.comment_id,r.id resolution_id FROM legal_builder.comment_resolution_change l JOIN legal_builder.comment_resolution r ON r.id=l.resolution_id WHERE l.change_id=ANY($1::uuid[])",[changeIds])).rows:[];
    const entries:ProvenanceEntry[]=changes.map(change=>{
      const entity=ref("DRAFT_LEGAL_NODE_CHANGE",String(change.id));
      const edges:ProvenanceEdge[]=[{from:entity,to:ref("DRAFT_VERSION",String(change.effective_version_id)),relation:"EFFECTIVE_IN",status:"VERIFIED"}];
      for(const basis of bases.filter(row=>row.change_id===change.id)) edges.push({from:entity,to:ref(String(basis.source_type_code),String(basis.source_id),basis.label??undefined),relation:"HAS_BASIS",status:"VERIFIED"});
      const final=finals.find(row=>row.legal_change_id===change.id);
      if(final){edges.push({from:entity,to:ref("STEP4_CHANGE_PROPOSAL",final.proposal_id),relation:"FINALIZED_FROM",status:"VERIFIED"});if(final.source_reference)edges.push({from:ref("STEP4_CHANGE_PROPOSAL",final.proposal_id),relation:"REFERENCES_SOURCE",status:"UNVERIFIED_REFERENCE"});}
      else edges.push({from:entity,relation:"FINALIZED_FROM",status:"MISSING"});
      for(const link of resolutions.filter(row=>row.change_id===change.id)) edges.push(canViewReview?{from:ref("COMMENT_RESOLUTION",link.resolution_id),to:ref("COMMENT",link.comment_id),relation:"RESOLVES",status:"VERIFIED"}:{from:entity,relation:"HAS_REVIEW_SOURCE",status:"REDACTED"});
      return {entity,occurredAt:new Date(String(change.decided_at)).toISOString(),actor:{userId:String(change.performed_by_user_id)},summary:String(change.reason),edges};
    });
    return {contractVersion:"1.1",anchor:ref(key.replace(/Id$/,"").toUpperCase(),id),entries};
  }
}

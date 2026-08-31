import type { AuthoringFinalizationResult, DraftWorkspace, FinalizeAuthoringRequest, LegalDocumentSnapshot, SaveWorkspaceResult } from "@legal-document-builder/contracts";
import type { EditorSaveError, SaveAcknowledgement, SaveSnapshot } from "./editor-state";
import type { AvailableAssetVersion } from "@/server/asset-repository";

const userId=process.env.NEXT_PUBLIC_DEVELOPMENT_USER_ID;
const membershipId=process.env.NEXT_PUBLIC_DEVELOPMENT_MEMBERSHIP_ID;
export function editorHeaders(json=false):Record<string,string>{return{...(json?{"content-type":"application/json"}:{}),...(userId?{"x-development-user-id":userId}:{}),...(membershipId?{"x-development-membership-id":membershipId}:{})}}
async function body(response:Response){const value=await response.json();if(!response.ok)throw(value.error??{code:"BACKEND_ERROR",message:"Backend không thể hoàn thành yêu cầu."}) as EditorSaveError;return value.data}
export async function loadEditorWorkspace(workspaceId:string):Promise<DraftWorkspace>{if(!workspaceId)throw{code:"INVALID_REQUEST",message:"Workspace chưa được chọn."};return body(await fetch(`/api/v1/workspaces/${workspaceId}`,{headers:editorHeaders()}))}
export async function saveEditorWorkspace(workspaceId:string,snapshot:SaveSnapshot):Promise<SaveAcknowledgement>{if(!workspaceId)throw{code:"INVALID_REQUEST",message:"Workspace chưa được chọn."};const data=await body(await fetch(`/api/v1/workspaces/${workspaceId}`,{method:"PUT",headers:editorHeaders(true),body:JSON.stringify({contractVersion:snapshot.document.contractVersion,expectedRevision:snapshot.expectedRevision,document:snapshot.document,correlationId:crypto.randomUUID()})})) as SaveWorkspaceResult;return{revision:data.revision,synchronizedAt:data.synchronizedAt}}
export function cloneDocument(document:LegalDocumentSnapshot){return structuredClone(document)}
export async function loadAvailableAssets(projectId:string):Promise<AvailableAssetVersion[]>{return body(await fetch(`/api/v1/projects/${projectId}/assets`,{headers:editorHeaders()}))}
export async function finalizeAuthoring(workspaceId:string,request:FinalizeAuthoringRequest):Promise<AuthoringFinalizationResult>{return body(await fetch(`/api/v1/workspaces/${workspaceId}/authoring-finalization`,{method:"POST",headers:editorHeaders(true),body:JSON.stringify(request)}))}

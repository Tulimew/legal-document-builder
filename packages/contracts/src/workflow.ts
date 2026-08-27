import type { ActorRef, ContractVersion, EntityId, IsoDateTime } from "./common";
export type WorkflowVersionStatus="DRAFT"|"APPROVED"|"RETIRED";
export type WorkflowStageInstanceStatus="PLANNED"|"ACTIVE"|"BLOCKED"|"COMPLETED"|"CANCELLED";
export type WorkflowGateResult="PENDING"|"PASSED"|"FAILED"|"WAIVED";
export interface WorkflowStageDefinition{code:string;name:string;order:number;repeatable:boolean;parallelAllowed:boolean;applicabilityExpression?:string}
export interface WorkflowVersion{contractVersion:ContractVersion;id:EntityId;definitionId:EntityId;versionCode:string;status:WorkflowVersionStatus;effectiveFrom?:IsoDateTime;effectiveTo?:IsoDateTime;approvalBasis?:string;stages:WorkflowStageDefinition[]}
export interface WorkflowStageInstance{contractVersion:ContractVersion;id:EntityId;projectId:EntityId;workflowVersionId:EntityId;stageCode:string;sequence:number;status:WorkflowStageInstanceStatus;gateResult:WorkflowGateResult;assigneeMembershipId?:EntityId;startedAt?:IsoDateTime;completedAt?:IsoDateTime;returnReason?:string;recordedBy:ActorRef}
export interface AssignProjectWorkflowRequest{contractVersion:ContractVersion;workflowVersionId:EntityId;migrationDecision?:string;correlationId:string}
export interface CreateWorkflowStageInstanceRequest{contractVersion:ContractVersion;stageCode:string;assigneeMembershipId?:EntityId;startedAt?:IsoDateTime;correlationId:string}
export interface UpdateWorkflowStageInstanceRequest{contractVersion:ContractVersion;status:WorkflowStageInstanceStatus;gateResult:WorkflowGateResult;returnReason?:string;correlationId:string}

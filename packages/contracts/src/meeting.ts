import type { ActorRef, ContractVersion, EntityId, IsoDateTime } from "./common";
export interface DraftingMeeting{contractVersion:ContractVersion;id:EntityId;projectId:EntityId;reviewRoundId:EntityId;code:string;name:string;scheduledAt:IsoDateTime;chairMembershipId:EntityId;resolutionCaseIds:EntityId[];status:"PLANNED"|"IN_PROGRESS"|"CONCLUDED";concludedAt?:IsoDateTime;recordedBy:ActorRef}

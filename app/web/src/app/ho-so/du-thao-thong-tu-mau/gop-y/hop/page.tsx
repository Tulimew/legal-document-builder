import { MeetingWorkbench } from "@/components/review/meeting-workbench";
export default async function MeetingPage({searchParams}:{searchParams:Promise<{commentId?:string}>}){const {commentId}=await searchParams;return <MeetingWorkbench commentId={commentId}/>}

import { DeliberationWorkbench } from "@/components/review/deliberation-workbench";
export default async function DeliberationPage({searchParams}:{searchParams:Promise<{commentId?:string}>}){const {commentId}=await searchParams;return <DeliberationWorkbench commentId={commentId}/>}

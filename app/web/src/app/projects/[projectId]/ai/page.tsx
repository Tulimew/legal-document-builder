import { AiAssistantWorkbench } from "@/components/ai/ai-assistant-workbench";
export default async function Page({params}:{params:Promise<{projectId:string}>}){const{projectId}=await params;return <AiAssistantWorkbench projectId={projectId}/>}

import {WorkflowWorkbench} from "@/components/workflow/workflow-workbench";
export default function WorkflowPage(){return <WorkflowWorkbench projectId={process.env.NEXT_PUBLIC_SAMPLE_PROJECT_ID??""}/>}

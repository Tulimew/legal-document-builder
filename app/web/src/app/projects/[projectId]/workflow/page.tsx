import { ProjectNavigation } from "@/components/product-shell/project-navigation";
import { WorkflowWorkbench } from "@/components/workflow/workflow-workbench";

export default async function ProjectWorkflowPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <><ProjectNavigation projectId={projectId} active="workflow"/><WorkflowWorkbench projectId={projectId}/></>;
}

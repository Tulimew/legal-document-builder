import { ProjectEditor } from "@/components/product-shell/project-editor";

export default async function ProjectDraftingPage({ params }: { params: Promise<{ projectId: string }> }) {
  return <ProjectEditor projectId={(await params).projectId}/>;
}

import { ProjectOverview } from "@/components/product-shell/project-overview";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  return <ProjectOverview projectId={(await params).projectId}/>;
}

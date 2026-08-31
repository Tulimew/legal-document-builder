import { ProjectNavigation } from "@/components/product-shell/project-navigation";
import { ProjectReviewWorkbench } from "@/components/review/project-review-workbench";

export default async function ProjectReviewPage({params}:{params:Promise<{projectId:string}>}){const{projectId}=await params;return <><ProjectNavigation projectId={projectId} active="review"/><ProjectReviewWorkbench projectId={projectId}/></>}

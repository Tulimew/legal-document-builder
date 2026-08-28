import { ReviewSummaryWorkbench } from "@/components/review/review-summary-workbench";
import { ReviewExportToolbar } from "@/components/review/review-export-toolbar";
import {PersistentReviewSummary} from "@/components/review/persistent-review-summary";
import {developmentProject} from "@/lib/development-projects";

export default async function ReviewSummaryPage({searchParams}:{searchParams:Promise<{project?:string}>}){const selected=developmentProject((await searchParams).project);if(process.env.NEXT_PUBLIC_DEVELOPMENT_USER_ID)return <><ReviewExportToolbar projectId={selected.projectId}/><PersistentReviewSummary project={selected}/></>;return <><ReviewExportToolbar/><ReviewSummaryWorkbench/></>}

import { ReviewIntakeWorkbench } from "@/components/review/review-intake-workbench";
import { ReviewProcessSteps } from "@/components/review/review-process-steps";
import { PersistentReviewWorkbench } from "@/components/review/persistent-review-workbench";
import { developmentProject } from "@/lib/development-projects";

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const selected = developmentProject((await searchParams).project);
  if (process.env.NEXT_PUBLIC_DEVELOPMENT_USER_ID) return <PersistentReviewWorkbench project={selected} />;
  return <><div className="bg-slate-100 px-5 pt-5"><div className="mx-auto max-w-7xl"><ReviewProcessSteps active={1} /></div></div><ReviewIntakeWorkbench /></>;
}

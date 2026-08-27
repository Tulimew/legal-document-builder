import { ReviewIntakeWorkbench } from "@/components/review/review-intake-workbench";
import { ReviewProcessSteps } from "@/components/review/review-process-steps";

export default function ReviewPage() {
  return <><div className="bg-slate-100 px-5 pt-5"><div className="mx-auto max-w-7xl"><ReviewProcessSteps active={1} /></div></div><ReviewIntakeWorkbench /></>;
}

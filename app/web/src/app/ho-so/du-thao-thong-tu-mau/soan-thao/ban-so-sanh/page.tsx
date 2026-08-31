import { PersistentComparisonWorkbench } from "@/components/editor/persistent-comparison-workbench";

export default function DraftComparisonPage() { return <PersistentComparisonWorkbench projectId={process.env.NEXT_PUBLIC_SAMPLE_PROJECT_ID ?? ""} />; }

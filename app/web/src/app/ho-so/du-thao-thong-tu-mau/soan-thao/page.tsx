import type { Metadata } from "next";
import { EditorPrototype } from "@/components/editor/editor-prototype";
import { amendmentOperations, comments, directions, draftChanges, resolutionCases, sampleFile, structureNodes, warnings } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Soạn thảo văn bản mẫu" };

export default function DraftEditorPage() {
  return <EditorPrototype file={sampleFile} nodes={structureNodes} comments={comments} directions={directions} warnings={warnings} changes={draftChanges} operations={amendmentOperations} resolutionCases={resolutionCases} />;
}

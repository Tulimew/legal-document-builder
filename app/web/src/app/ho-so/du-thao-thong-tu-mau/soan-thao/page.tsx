import type { Metadata } from "next";
import { EditorPrototype } from "@/components/editor/editor-prototype";
export const metadata:Metadata={title:"Persistent Structured Editor"};
export default function DraftEditorPage(){return <EditorPrototype/>}

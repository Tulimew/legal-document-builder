"use client";

import { structureNodes } from "@/lib/mock-data";
import { exportReviewSynthesis } from "@/lib/document-exports";
import { loadPrototypeComments } from "@/lib/review-prototype-store";

export function ReviewExportToolbar() {
  return <div className="bg-slate-100 px-5 pt-5"><div className="mx-auto flex max-w-7xl justify-end"><button className="button button-primary" onClick={() => exportReviewSynthesis(structureNodes, loadPrototypeComments())}>↓ Xuất bản tổng hợp ý kiến (.docx)</button></div></div>;
}

"use client";

import { useState } from "react";
import { exportDraftComparison } from "@/lib/document-exports";
import { draftChanges } from "@/lib/mock-data";
import { ReviewProcessSteps } from "@/components/review/review-process-steps";

const KEY = "legal-builder.prototype.comparison-explanations.v1";

export function ComparisonExplanationWorkbench() {
  const changed = draftChanges.filter((item) => item.before !== item.after);
  const [explanations, setExplanations] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    try { return JSON.parse(raw) as Record<string, string>; } catch { return {}; }
  });
  const [notice, setNotice] = useState("");
  const update = (id: string, value: string) => { const next = { ...explanations, [id]: value }; setExplanations(next); window.localStorage.setItem(KEY, JSON.stringify(next)); setNotice("Đã lưu thuyết minh trong nguyên mẫu."); };
  return <main className="min-h-screen bg-slate-100 p-5"><div className="mx-auto max-w-7xl space-y-4">
    <ReviewProcessSteps active={4} />
    <header className="rounded-xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Bước 4 · Hoàn thiện dự thảo</p><h1 className="mt-1 text-2xl font-bold">Bản so sánh, thuyết minh nội dung dự thảo</h1><p className="mt-2 text-sm text-slate-600">Chỉ hiển thị nội dung có thay đổi; cột thuyết minh do người soạn nhập thủ công.</p></div><div className="flex gap-2"><a className="button button-secondary" href="/ho-so/du-thao-thong-tu-mau/soan-thao">← Trình soạn thảo</a><button className="button button-primary" onClick={() => exportDraftComparison(changed, explanations)}>↓ Xuất DOCX</button></div></div></header>
    <section className="overflow-x-auto rounded-xl border bg-white p-4"><table className="w-full min-w-[1000px] table-fixed text-left text-sm"><thead><tr className="border-b bg-slate-50"><th className="w-[32%] p-3">Nội dung dự thảo trước</th><th className="w-[38%] p-3">Nội dung dự thảo sau khi hoàn thiện</th><th className="w-[30%] p-3">Thuyết minh</th></tr></thead><tbody>{changed.map((change) => <tr className="border-b align-top" key={change.id}><td className="p-3"><strong>{change.id} · {change.location}</strong><p className="mt-2 whitespace-pre-line">{change.before}</p></td><td className="p-3"><strong>{change.type}</strong><p className="mt-2 whitespace-pre-line">{change.after}</p><span className="badge badge-slate mt-2">{change.status}</span></td><td className="p-3"><textarea className="input min-h-32" value={explanations[change.id] ?? ""} onChange={(event) => update(change.id, event.target.value)} placeholder="Nhập thuyết minh cho nội dung thay đổi" /></td></tr>)}</tbody></table></section>
    {notice && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
  </div></main>;
}

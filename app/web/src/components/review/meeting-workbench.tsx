"use client";

import { useEffect, useState } from "react";
import { loadPrototypeDeliberations, saveMeetingConclusion, type PrototypeMemberOpinion } from "@/lib/deliberation-prototype-store";
import { initialPrototypeComments, loadPrototypeComments, type PrototypeComment } from "@/lib/review-prototype-store";
import { ReviewProcessSteps } from "./review-process-steps";

const authority = { name: "Tổ trưởng Tổ soạn thảo", permission: "RESOLUTION_DECIDE (mẫu)" };
const MEMBER_OPTION = "Chọn phương án của thành viên";
const MEETING_OPTION = "Phương án khác thống nhất tại cuộc họp";

export function MeetingWorkbench({ commentId }: { commentId?: string }) {
  const [comments, setComments] = useState<PrototypeComment[]>(initialPrototypeComments);
  const [opinions, setOpinions] = useState<PrototypeMemberOpinion[]>([]);
  const [selected, setSelected] = useState("");
  const [decision, setDecision] = useState(MEMBER_OPTION);
  const [meetingOption, setMeetingOption] = useState("");
  const [reason, setReason] = useState("");
  const [basis, setBasis] = useState("");
  const [instruction, setInstruction] = useState("");
  const [notice, setNotice] = useState("");
  const comment = comments.find((item) => item.id === commentId) ?? comments[0];

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      const loaded = loadPrototypeComments();
      setComments(loaded);
      const id = commentId ?? loaded[0]?.id;
      setOpinions(loadPrototypeDeliberations().find((item) => item.commentId === id)?.opinions ?? []);
    }, 0);
    return () => window.clearTimeout(hydrate);
  }, [commentId]);

  const divergent = new Set(opinions.map((item) => `${item.position}|${item.proposedDraftContent ?? ""}`)).size > 1;
  const valid = Boolean(reason.trim() && basis.trim() && (decision !== MEMBER_OPTION || selected) && (decision !== MEETING_OPTION || meetingOption.trim()));
  const selectMemberOption = (id: string) => { setSelected(id); setDecision(MEMBER_OPTION); setNotice(""); };
  const conclude = () => {
    if (!comment || !valid) return;
    const alternative = decision === MEETING_OPTION ? `Phương án thống nhất tại cuộc họp: ${meetingOption.trim()}` : "";
    saveMeetingConclusion(comment.id, {
      decision,
      selectedOpinionId: decision === MEMBER_OPTION ? selected : undefined,
      reason: reason.trim(),
      authorityBasis: basis.trim(),
      draftingInstruction: [alternative, instruction.trim()].filter(Boolean).join("\n\n") || undefined,
      decidedBy: authority.name,
      decidedAt: new Date().toISOString(),
    });
    setNotice("Đã ghi kết luận họp nguyên mẫu. Kết luận tạo căn cứ chỉnh lý và không tự sửa dự thảo.");
  };

  return <main className="min-h-screen bg-slate-100 p-5"><div className="mx-auto max-w-7xl space-y-4">
    <ReviewProcessSteps active={3} />
    <header className="rounded-xl border bg-white p-5"><p className="eyebrow">Bước 3 · Tổ soạn thảo họp</p><h1 className="mt-1 text-2xl font-bold">Tổng hợp khác biệt và thống nhất phương án</h1>{comment && <div className="mt-3 rounded bg-slate-50 p-3 text-sm"><strong>{comment.id} · {comment.organization}</strong><p>{comment.target}</p><p>{comment.content}</p></div>}<div className={`mt-3 rounded-lg p-3 text-sm ${divergent ? "bg-amber-50 text-amber-950" : "bg-blue-50 text-blue-950"}`}><strong>{divergent ? "Có phương án khác nhau — cần đưa vào chương trình họp" : "Chưa phát hiện khác biệt giữa các phương án"}</strong><p>{opinions.length} quan điểm thành viên đã được ghi nhận.</p></div></header>
    <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Các phương án của thành viên</h2><p className="mt-1 text-xs text-slate-500">Tổ trưởng có thể bấm trực tiếp vào một phương án để chọn làm kết luận.</p><div className="mt-3 space-y-3">{opinions.map((item) => <button key={item.id} onClick={() => selectMemberOption(item.id)} className={`w-full rounded-lg border p-4 text-left text-sm ${decision === MEMBER_OPTION && selected === item.id ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}><strong>{item.memberName}</strong><span className="badge badge-slate ml-2">{item.position}</span><p className="mt-2"><b>Lý do:</b> {item.reasoning}</p>{item.proposedDraftContent && <div className="mt-2 rounded bg-white p-2"><b>Dự thảo đề xuất:</b> {item.proposedDraftContent}</div>}<span className="mt-2 block text-xs font-bold text-blue-700">{decision === MEMBER_OPTION && selected === item.id ? "✓ Phương án đang được chọn" : "Chọn phương án này"}</span></button>)}{!opinions.length && <p className="rounded bg-slate-50 p-3 text-sm text-slate-500">Chưa có quan điểm thành viên để tổ chức thảo luận.</p>}</div></section>
      <section className="rounded-xl border border-blue-200 bg-white p-5"><p className="eyebrow">Tài khoản có thẩm quyền</p><h2 className="font-bold">{authority.name}</h2><p className="text-xs text-slate-500">{authority.permission}</p><label className="mt-4 block text-sm font-semibold">Loại kết luận<select className="input mt-1" value={decision} onChange={(event) => { setDecision(event.target.value); setNotice(""); }}><option>{MEMBER_OPTION}</option><option>{MEETING_OPTION}</option><option>Giữ nguyên dự thảo</option><option>Yêu cầu nghiên cứu thêm</option><option>Xin ý kiến cấp có thẩm quyền</option></select></label>{decision === MEMBER_OPTION && <label className="mt-3 block text-sm font-semibold">Phương án thành viên được chọn *<select className="input mt-1" value={selected} onChange={(event) => setSelected(event.target.value)}><option value="">Chọn thành viên/phương án</option>{opinions.map((item) => <option key={item.id} value={item.id}>{item.memberName} · {item.position}</option>)}</select></label>}{decision === MEETING_OPTION && <label className="mt-3 block text-sm font-semibold">Nội dung phương án thống nhất tại cuộc họp *<textarea className="input mt-1 min-h-28" value={meetingOption} onChange={(event) => setMeetingOption(event.target.value)} placeholder="Ghi đầy đủ phương án được thống nhất, kể cả khi khác với tất cả phương án thành viên" /></label>}<label className="mt-3 block text-sm font-semibold">Lý do thống nhất *<textarea className="input mt-1 min-h-20" value={reason} onChange={(event) => setReason(event.target.value)} /></label><label className="mt-3 block text-sm font-semibold">Căn cứ thẩm quyền *<input className="input mt-1" value={basis} onChange={(event) => setBasis(event.target.value)} /></label><label className="mt-3 block text-sm font-semibold">Yêu cầu chỉnh lý dự thảo<textarea className="input mt-1 min-h-20" value={instruction} onChange={(event) => setInstruction(event.target.value)} /></label><button className="button button-primary mt-3" disabled={!valid} onClick={conclude}>Ghi biên bản và kết luận</button>{notice && <div className="mt-3 rounded bg-emerald-50 p-3 text-sm text-emerald-900">{notice}<a className="mt-2 block font-bold underline" href="/ho-so/du-thao-thong-tu-mau/soan-thao">Sang Bước 4 · Hoàn thiện dự thảo</a></div>}</section>
    </div>
  </div></main>;
}

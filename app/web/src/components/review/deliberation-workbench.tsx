"use client";

import { useEffect, useState } from "react";
import { addMemberOpinion, loadPrototypeDeliberations, type PrototypeMemberOpinion } from "@/lib/deliberation-prototype-store";
import { initialPrototypeComments, loadPrototypeComments, type PrototypeComment } from "@/lib/review-prototype-store";
import { ReviewProcessSteps } from "./review-process-steps";

const mockAccounts = [
  { membershipId: "00000000-0000-4000-8000-000000000201", displayName: "Chuyên viên A" },
  { membershipId: "00000000-0000-4000-8000-000000000202", displayName: "Chuyên viên B" },
  { membershipId: "00000000-0000-4000-8000-000000000203", displayName: "Chuyên viên C" },
] as const;

export function DeliberationWorkbench({ commentId }: { commentId?: string }) {
  const [comments, setComments] = useState<PrototypeComment[]>(initialPrototypeComments);
  const [opinions, setOpinions] = useState<PrototypeMemberOpinion[]>([]);
  const [accountId, setAccountId] = useState<string>(mockAccounts[0].membershipId);
  const [position, setPosition] = useState("Tiếp thu và sửa dự thảo");
  const [reasoning, setReasoning] = useState("");
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const currentAccount = mockAccounts.find((item) => item.membershipId === accountId) ?? mockAccounts[0];
  const comment = comments.find((item) => item.id === commentId) ?? comments[0];

  useEffect(() => {
    const hydrate = window.setTimeout(() => {
      setComments(loadPrototypeComments());
      if (commentId) setOpinions(loadPrototypeDeliberations().find((item) => item.commentId === commentId)?.opinions ?? []);
    }, 0);
    return () => window.clearTimeout(hydrate);
  }, [commentId]);

  const submit = () => {
    if (!comment || !reasoning.trim()) return;
    addMemberOpinion(comment.id, {
      id: `TV-${currentAccount.membershipId.slice(-4)}-${Date.now()}`,
      memberId: currentAccount.membershipId,
      memberName: currentAccount.displayName,
      position,
      reasoning: reasoning.trim(),
      ...(draft.trim() ? { proposedDraftContent: draft.trim() } : {}),
      recordedAt: new Date().toISOString(),
    });
    setOpinions(loadPrototypeDeliberations().find((item) => item.commentId === comment.id)?.opinions ?? []);
    setNotice(`Đã ghi quan điểm của ${currentAccount.displayName}.`);
  };

  return <main className="min-h-screen bg-slate-100 p-5"><div className="mx-auto max-w-6xl space-y-4">
    <ReviewProcessSteps active={2} />
    <header className="rounded-xl border bg-white p-5">
      <div className="flex justify-between gap-3"><div><p className="eyebrow">Bước 2 · Thành viên giải trình</p><h1 className="mt-1 text-2xl font-bold">Quan điểm riêng của thành viên Tổ soạn thảo</h1></div><a className="button button-secondary" href="/ho-so/du-thao-thong-tu-mau/gop-y/tong-hop">← Danh mục ý kiến</a></div>
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm"><strong>Tài khoản đang thực hiện: {currentAccount.displayName}</strong><p>Thành viên Tổ soạn thảo (mẫu)</p><label className="mt-2 block max-w-sm text-xs font-semibold">Phiên đăng nhập mô phỏng<select className="input mt-1" value={accountId} onChange={(event) => { setAccountId(event.target.value); setNotice(""); }}>{mockAccounts.map((account) => <option key={account.membershipId} value={account.membershipId}>{account.displayName}</option>)}</select></label><p className="mt-1 text-xs">Bộ chọn này chỉ phục vụ thử nguyên mẫu. Hệ thống thật lấy người dùng và tư cách thành viên từ phiên đăng nhập; không cho nhập tên thay người khác.</p></div>
      {comment && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><strong>{comment.id} · {comment.organization}</strong><p>{comment.target}</p><p className="text-slate-600">{comment.content}</p></div>}
    </header>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Nhập quan điểm của tôi</h2><label className="mt-3 block text-sm font-semibold">Đề xuất xử lý<select className="input mt-1" value={position} onChange={(event) => setPosition(event.target.value)}><option>Tiếp thu và sửa dự thảo</option><option>Tiếp thu một phần</option><option>Không tiếp thu, giải trình</option></select></label><label className="mt-3 block text-sm font-semibold">Phân tích, lý do *<textarea className="input mt-1 min-h-28" value={reasoning} onChange={(event) => setReasoning(event.target.value)} /></label><label className="mt-3 block text-sm font-semibold">Nội dung dự thảo đề xuất<textarea className="input mt-1 min-h-28" value={draft} onChange={(event) => setDraft(event.target.value)} /></label><button className="button button-primary mt-3" disabled={!reasoning.trim()} onClick={submit}>Ghi quan điểm bằng tài khoản của tôi</button>{notice && <p className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-900">{notice}</p>}</section>
      <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Các quan điểm đã ghi</h2><p className="mt-1 text-xs text-slate-500">Mỗi quan điểm giữ nguyên danh tính thành viên và chưa phải kết luận của Tổ.</p><div className="mt-3 space-y-2">{opinions.map((item) => <article key={item.id} className="rounded-lg border p-3 text-sm"><strong>{item.memberName}</strong><span className="badge badge-slate ml-2">{item.position}</span><p className="mt-2">{item.reasoning}</p>{item.proposedDraftContent && <div className="mt-2 rounded bg-slate-50 p-2"><b>Nội dung đề xuất:</b> {item.proposedDraftContent}</div>}</article>)}{!opinions.length && <p className="rounded bg-slate-50 p-3 text-sm text-slate-500">Chưa có thành viên nào nhập quan điểm cho ý kiến này.</p>}</div><a className="button button-secondary mt-4 block text-center" href={`/ho-so/du-thao-thong-tu-mau/gop-y/hop?commentId=${encodeURIComponent(comment?.id ?? "")}`}>Chuyển sang chuẩn bị họp →</a></section>
    </div>
  </div></main>;
}

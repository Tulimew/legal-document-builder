"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addMemberOpinion,
  loadPrototypeDeliberations,
  type PrototypeMemberOpinion,
} from "@/lib/deliberation-prototype-store";
import { structureNodes } from "@/lib/mock-data";
import {
  loadPersistentComments,
  persistentReviewEnabled,
} from "@/lib/persistent-review-client";
import {
  initialPrototypeComments,
  loadPrototypeComments,
  type PrototypeComment,
} from "@/lib/review-prototype-store";
import { ReviewProcessSteps } from "./review-process-steps";

const mockAccounts = [
  { membershipId: "10000000-0000-4000-8000-000000000105", displayName: "Chuyên viên phát triển mẫu" },
  { membershipId: "00000000-0000-4000-8000-000000000202", displayName: "Chuyên viên B" },
  { membershipId: "00000000-0000-4000-8000-000000000203", displayName: "Chuyên viên C" },
] as const;
const projectId=process.env.NEXT_PUBLIC_SAMPLE_PROJECT_ID;
const userId=process.env.NEXT_PUBLIC_DEVELOPMENT_USER_ID;
const membershipId=process.env.NEXT_PUBLIC_DEVELOPMENT_MEMBERSHIP_ID;
const persistent=persistentReviewEnabled();
const positionCodes:Record<string,string>={"Tiếp thu và sửa dự thảo":"ACCEPTED_AND_UPDATED","Tiếp thu một phần":"PARTIALLY_ACCEPTED","Không tiếp thu, giải trình":"EXPLAINED_NOT_ACCEPTED"};
type PersistentOpinion={id:string;memberMembershipId:string;memberName:string;sequence:number;proposedResolutionType:string;reasoning:string;proposedDraftContent?:string;recordedAt:string};

type CommentGroup = {
  key: string;
  target: string;
  draftContent: string;
  comments: PrototypeComment[];
};

function groupComments(comments: PrototypeComment[]): CommentGroup[] {
  const groups = new Map<string, CommentGroup>();
  for (const comment of comments) {
    const key = comment.nodeId ?? `OTHER:${comment.target}`;
    const existing = groups.get(key);
    if (existing) {
      existing.comments.push(comment);
      continue;
    }
    groups.set(key, {
      key,
      target: comment.target,
      draftContent: structureNodes.find((node) => node.id === comment.nodeId)?.content
        ?? "Ý kiến chung, không gắn với một nội dung cấu trúc cụ thể của dự thảo.",
      comments: [comment],
    });
  }
  return [...groups.values()];
}

export function DeliberationWorkbench({ commentId }: { commentId?: string }) {
  const [comments, setComments] = useState<PrototypeComment[]>(initialPrototypeComments);
  const [selectedCommentId, setSelectedCommentId] = useState(commentId ?? initialPrototypeComments[0]?.id ?? "");
  const [opinions, setOpinions] = useState<PrototypeMemberOpinion[]>([]);
  const [accountId, setAccountId] = useState<string>(mockAccounts[0].membershipId);
  const [position, setPosition] = useState("Tiếp thu và sửa dự thảo");
  const [reasoning, setReasoning] = useState("");
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const groups = useMemo(() => groupComments(comments), [comments]);
  const comment = comments.find((item) => item.id === selectedCommentId) ?? comments[0];
  const currentAccount = mockAccounts.find((item) => item.membershipId === accountId) ?? mockAccounts[0];

  const loadOpinions = async (id: string) => {
    if (!persistent || !projectId || !userId) return loadPrototypeDeliberations().find((item) => item.commentId === id)?.opinions ?? [];
    const response=await fetch(`/api/v1/projects/${projectId}/comments/${id}/opinions`,{headers:{"x-development-user-id":userId,...(membershipId?{"x-development-membership-id":membershipId}:{})}});
    const body=await response.json();
    if(!response.ok)throw new Error(body.error?.message??"Không tải được quan điểm thành viên.");
    return (body.data as PersistentOpinion[]).map(item=>({id:item.id,memberId:item.memberMembershipId,memberName:item.memberName,position:Object.keys(positionCodes).find(label=>positionCodes[label]===item.proposedResolutionType)??item.proposedResolutionType,reasoning:item.reasoning,...(item.proposedDraftContent?{proposedDraftContent:item.proposedDraftContent}:{}),recordedAt:item.recordedAt}));
  };

  useEffect(() => {
    const hydrate = window.setTimeout(async () => {
      try {
        const loaded = persistentReviewEnabled()
          ? await loadPersistentComments()
          : loadPrototypeComments();
        setComments(loaded);
        const selectedId = loaded.some((item) => item.id === commentId)
          ? commentId!
          : loaded[0]?.id ?? "";
        setSelectedCommentId(selectedId);
        setOpinions(await loadOpinions(selectedId));
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Không tải được danh mục ý kiến.");
      }
    }, 0);
    return () => window.clearTimeout(hydrate);
  }, [commentId]);

  const chooseComment = (id: string) => {
    setSelectedCommentId(id);
    setNotice("");
    void loadOpinions(id).then(setOpinions).catch((error)=>setNotice(error instanceof Error?error.message:"Không tải được quan điểm thành viên."));
  };

  const submit = async () => {
    if (!comment || !reasoning.trim()) return;
    const opinion = {
      id: `TV-${currentAccount.membershipId.slice(-4)}-${Date.now()}`,
      memberId: currentAccount.membershipId,
      memberName: currentAccount.displayName,
      position,
      reasoning: reasoning.trim(),
      ...(draft.trim() ? { proposedDraftContent: draft.trim() } : {}),
      recordedAt: new Date().toISOString(),
    };
    try {
      if(persistent&&projectId&&userId){const correlationId=crypto.randomUUID();const response=await fetch(`/api/v1/projects/${projectId}/comments/${comment.id}/opinions`,{method:"POST",headers:{"content-type":"application/json","x-development-user-id":userId,...(membershipId?{"x-development-membership-id":membershipId}:{}),"x-correlation-id":correlationId},body:JSON.stringify({contractVersion:"1.1",proposedResolutionType:positionCodes[position],reasoning:reasoning.trim(),...(draft.trim()?{proposedDraftContent:draft.trim()}:{}),correlationId})});const body=await response.json();if(!response.ok)throw new Error(body.error?.message??"Không ghi được quan điểm thành viên.");}
      else addMemberOpinion(comment.id,opinion);
      setOpinions(await loadOpinions(comment.id));
      setNotice(`Đã ghi quan điểm của ${persistent?"thành viên đang đăng nhập":currentAccount.displayName}.`);
    }catch(error){setNotice(error instanceof Error?error.message:"Không ghi được quan điểm thành viên.")}
  };

  return <main className="min-h-screen bg-slate-100 p-5"><div className="mx-auto max-w-[1500px] space-y-4">
    <ReviewProcessSteps active={2} />
    <header className="rounded-xl border bg-white p-5">
      <div className="flex justify-between gap-3"><div><p className="eyebrow">Bước 2 · Thành viên giải trình</p><h1 className="mt-1 text-2xl font-bold">Tổng hợp nội dung góp ý và quan điểm thành viên</h1><p className="mt-1 text-sm text-slate-600">Mỗi phạm vi dự thảo chỉ hiển thị một lần; các chủ thể và ý kiến cùng phạm vi được đặt trong các dòng tương ứng.</p></div><Link className="button button-secondary" href="/ho-so/du-thao-thong-tu-mau/gop-y/tong-hop">← Tổng hợp ý kiến</Link></div>
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm"><strong>Tài khoản đang thực hiện: {persistent?"Thành viên từ phiên đăng nhập PostgreSQL":currentAccount.displayName}</strong>{!persistent&&<label className="mt-2 block max-w-sm text-xs font-semibold">Phiên đăng nhập mô phỏng<select className="input mt-1" value={accountId} onChange={(event) => { setAccountId(event.target.value); setNotice(""); }}>{mockAccounts.map((account) => <option key={account.membershipId} value={account.membershipId}>{account.displayName}</option>)}</select></label>}<p className="mt-1 text-xs">Mỗi lần cập nhật tạo một phiên bản quan điểm mới, không ghi đè lịch sử đã có.</p></div>
    </header>

    <section className="overflow-hidden rounded-xl border bg-white">
      <div className="border-b p-4"><h2 className="font-bold">Toàn bộ nội dung được góp ý</h2><p className="text-sm text-slate-500">Chọn một dòng ý kiến để nhập giải trình ở khu vực bên dưới.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-sm"><thead className="bg-slate-100 text-left"><tr><th className="w-[34%] border p-3">Chính sách hoặc nhóm vấn đề, điều, khoản</th><th className="w-[20%] border p-3">Chủ thể góp ý</th><th className="border p-3">Nội dung góp ý</th></tr></thead><tbody>{groups.map((group) => group.comments.map((item, index) => <tr key={item.id} className={`cursor-pointer ${item.id === comment?.id ? "bg-blue-50" : "hover:bg-slate-50"}`} onClick={() => chooseComment(item.id)}>{index === 0 && <td className="border p-3 align-top" rowSpan={group.comments.length}><strong>{group.target}</strong><p className="mt-2 whitespace-pre-line leading-6 text-slate-600">{group.draftContent}</p></td>}<td className="border p-3 align-top"><strong>{item.organization}</strong></td><td className="border p-3 align-top"><span className="mr-2 text-xs font-semibold text-blue-700">{item.id}</span>{item.content}</td></tr>))}{!groups.length && <tr><td className="border p-5 text-center text-slate-500" colSpan={3}>Chưa có ý kiến góp ý.</td></tr>}</tbody></table></div>
    </section>

    {comment && <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border bg-white p-5"><p className="eyebrow">Ý kiến đang chọn</p><h2 className="font-bold">{comment.id} · {comment.organization}</h2><p className="mt-1 text-sm font-medium">{comment.target}</p><p className="mt-2 rounded bg-slate-50 p-3 text-sm">{comment.content}</p><label className="mt-3 block text-sm font-semibold">Đề xuất xử lý<select className="input mt-1" value={position} onChange={(event) => setPosition(event.target.value)}><option>Tiếp thu và sửa dự thảo</option><option>Tiếp thu một phần</option><option>Không tiếp thu, giải trình</option></select></label><label className="mt-3 block text-sm font-semibold">Phân tích, lý do *<textarea className="input mt-1 min-h-28" value={reasoning} onChange={(event) => setReasoning(event.target.value)} /></label><label className="mt-3 block text-sm font-semibold">Nội dung dự thảo đề xuất<textarea className="input mt-1 min-h-28" value={draft} onChange={(event) => setDraft(event.target.value)} /></label><button className="button button-primary mt-3" disabled={!reasoning.trim()} onClick={submit}>Ghi quan điểm bằng tài khoản của tôi</button>{notice && <p className="mt-3 rounded bg-emerald-50 p-2 text-sm">{notice}</p>}</section>
      <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Các quan điểm đã ghi cho {comment.id}</h2><p className="mt-1 text-xs text-slate-500">Quan điểm thành viên chưa phải kết luận của Tổ soạn thảo.</p><div className="mt-3 space-y-2">{opinions.map((item) => <article key={item.id} className="rounded-lg border p-3 text-sm"><strong>{item.memberName}</strong><span className="badge badge-slate ml-2">{item.position}</span><p className="mt-2">{item.reasoning}</p>{item.proposedDraftContent && <div className="mt-2 rounded bg-slate-50 p-2"><b>Nội dung đề xuất:</b> {item.proposedDraftContent}</div>}</article>)}{!opinions.length && <p className="rounded bg-slate-50 p-3 text-sm text-slate-500">Chưa có thành viên nào nhập quan điểm cho ý kiến này.</p>}</div><Link className="button button-secondary mt-4 block text-center" href={`/ho-so/du-thao-thong-tu-mau/gop-y/hop?commentId=${encodeURIComponent(comment.id)}`}>Chuyển sang chuẩn bị họp →</Link></section>
    </div>}
  </div></main>;
}

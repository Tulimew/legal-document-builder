"use client";

import type { ProjectWorkflowReadModel, WorkflowStageInstance } from "@legal-document-builder/contracts";
import { useCallback, useEffect, useState } from "react";

export function WorkflowWorkbench({ projectId }: { projectId: string }) {
  const userId = process.env.NEXT_PUBLIC_DEVELOPMENT_USER_ID ?? "";
  const [configuration, setConfiguration] = useState<ProjectWorkflowReadModel | null>(null);
  const [items, setItems] = useState<WorkflowStageInstance[]>([]);
  const [stage, setStage] = useState("");
  const [state, setState] = useState<"loading"|"ready"|"error">("loading");
  const [notice, setNotice] = useState("");
  const headers = useCallback((json = false) => ({ ...(json ? { "content-type": "application/json" } : {}), "x-development-user-id": userId }), [userId]);
  const load = useCallback(async () => {
    setState("loading");
    try {
      const [configResponse, itemsResponse] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}/workflow`, { headers: headers() }),
        fetch(`/api/v1/projects/${projectId}/workflow/stages`, { headers: headers() }),
      ]);
      const configBody = await configResponse.json(), itemsBody = await itemsResponse.json();
      if (!configResponse.ok) throw new Error(configBody.error?.message ?? "Không tải được cấu hình workflow.");
      if (!itemsResponse.ok) throw new Error(itemsBody.error?.message ?? "Không tải được các lần thực hiện bước.");
      setConfiguration(configBody.data); setItems(itemsBody.data); setStage((current) => current || configBody.data.stages[0]?.code || ""); setState("ready");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Không tải được workflow."); setState("error"); }
  }, [headers, projectId]);
  useEffect(() => { const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer); }, [load]);
  const post = async (url: string, method: "POST"|"PATCH", body: unknown) => { const response = await fetch(url, { method, headers: headers(true), body: JSON.stringify(body) }); const value = await response.json(); if (!response.ok) throw new Error(value.error?.message ?? "Không cập nhật được workflow."); };
  const add = async () => { try { await post(`/api/v1/projects/${projectId}/workflow/stages`, "POST", { contractVersion: "1.1", stageCode: stage, correlationId: crypto.randomUUID() }); setNotice("Đã kích hoạt bước và ghi audit."); await load(); } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Không kích hoạt được bước."); } };
  const complete = async (id: string) => { try { await post(`/api/v1/projects/${projectId}/workflow/stages/${id}`, "PATCH", { contractVersion: "1.1", status: "COMPLETED", gateResult: "PASSED", correlationId: crypto.randomUUID() }); setNotice("Đã hoàn thành bước và đạt gate."); await load(); } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Không cập nhật được gate."); } };
  return <main className="min-h-screen bg-slate-100 p-5"><div className="mx-auto max-w-6xl space-y-4"><header className="rounded-xl border bg-white p-5"><p className="eyebrow">Workflow PostgreSQL</p><h1 className="mt-1 text-2xl font-bold">Các lần thực hiện bước quy trình</h1><p className="mt-2 text-sm text-slate-600">Không fallback sang dữ liệu nguyên mẫu khi backend lỗi.</p>{configuration&&<span className="badge badge-blue mt-2">Workflow {configuration.versionCode}</span>}{notice&&<p className={`mt-3 rounded p-3 text-sm ${state==="error"?"bg-red-50 text-red-800":"bg-blue-50"}`}>{notice}</p>}</header>{state==="loading"?<section className="card p-6">Đang tải PostgreSQL…</section>:state==="error"?<section className="card p-6"><button className="button button-primary" onClick={()=>void load()}>Thử lại</button></section>:<><section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Kích hoạt lần thực hiện mới</h2><div className="mt-3 flex gap-2"><select className="input max-w-md" value={stage} onChange={event=>setStage(event.target.value)}>{configuration?.stages.map(item=><option key={item.code} value={item.code}>{item.order}. {item.name}</option>)}</select><button className="button button-primary" disabled={!stage} onClick={()=>void add()}>＋ Kích hoạt bước</button></div></section><section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Lịch sử thực thi</h2><div className="mt-3 space-y-3">{items.map(item=><article className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto]" key={item.id}><div><strong>{configuration?.stages.find(stageItem=>stageItem.code===item.stageCode)?.name??item.stageCode} · lần {item.sequence}</strong><p className="mt-1 text-sm text-slate-600">{item.startedAt?new Date(item.startedAt).toLocaleString("vi-VN"):"Chưa bắt đầu"}</p><div className="mt-2 flex gap-2"><span className="badge badge-slate">{item.status}</span><span className="badge badge-blue">Gate: {item.gateResult}</span></div></div>{item.status==="ACTIVE"&&<button className="button button-secondary self-center" onClick={()=>void complete(item.id)}>Đánh dấu đạt cổng</button>}</article>)}{!items.length&&<p className="text-sm text-slate-500">Chưa có lần thực hiện bước.</p>}</div></section></>}</div></main>;
}

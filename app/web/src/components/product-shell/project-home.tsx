"use client";

import type { AuthorizedProjectSummary, ProjectDashboard } from "@legal-document-builder/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ProjectCreationDialog } from "@/components/administration/project-creation-dialog";

type LoadState = "loading" | "ready" | "empty" | "error";

async function readData<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Không tải được dữ liệu.");
  return body.data as T;
}

export function ProjectHome() {
  const userId = process.env.NEXT_PUBLIC_DEVELOPMENT_USER_ID ?? "";
  const [projects, setProjects] = useState<AuthorizedProjectSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [dashboard, setDashboard] = useState<ProjectDashboard | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState("");
  const [canCreate,setCanCreate]=useState(false);
  const [createOpen,setCreateOpen]=useState(false);
  const headers = useCallback(() => ({ "x-development-user-id": userId }), [userId]);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/projects", { headers: headers() })
      .then(readData<AuthorizedProjectSummary[]>)
      .then((items) => {
        if (!active) return;
        setProjects(items);
        if (!items.length) setState("empty");
        else {
          setSelectedId(items[0].id);
          setState("ready");
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Không tải được danh sách hồ sơ.");
        setState("error");
      });
    return () => { active = false; };
  }, [headers]);

  useEffect(()=>{void fetch("/api/v1/admin/context",{headers:headers()}).then(readData<{permissions:string[]}>).then(v=>setCanCreate(v.permissions.includes("PROJECT_CREATE"))).catch(()=>setCanCreate(false))},[headers]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    void fetch(`/api/v1/projects/${selectedId}/dashboard`, { headers: headers() })
      .then(readData<ProjectDashboard>)
      .then((value) => { if (active) setDashboard(value); })
      .catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : "Không tải được dashboard."); });
    return () => { active = false; };
  }, [headers, selectedId]);

  if (state === "loading") return <StatusPage title="Đang tải hồ sơ được cấp quyền…" />;
  if (state === "error") return <StatusPage title="Không thể mở hệ thống" detail={message} />;
  if (state === "empty") return <><StatusPage title="Chưa có hồ sơ được cấp quyền" detail="Liên hệ quản trị viên để được thêm membership hoặc delegation hợp lệ." action={canCreate?<button className="button button-primary mt-5" onClick={()=>setCreateOpen(true)}>Tạo hồ sơ mới</button>:undefined}/><ProjectCreationDialog open={createOpen} onClose={()=>setCreateOpen(false)} onCreated={()=>location.reload()}/></>;

  const metrics = dashboard ? [
    ["Phiên bản gần nhất", dashboard.latestVersion?.code ?? "Chưa có"],
    ["Bước đang xử lý", dashboard.counts.activeWorkflowStages],
    ["Ý kiến chưa xử lý", dashboard.counts.unresolvedComments],
    ["Nhánh đang mở", dashboard.counts.activeBranches],
    ["Hợp nhất đang mở", dashboard.counts.openMergeOperations],
    ["Artifact khả dụng", dashboard.counts.availableArtifacts],
    ["Job đang chạy", dashboard.counts.queuedOrRunningPublishingJobs],
    ["Gói đã seal", dashboard.counts.sealedPackages],
  ] : [];

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Hệ thống hỗ trợ</p><h1 className="text-lg font-semibold">Xây dựng văn bản quy phạm pháp luật</h1></div><div className="flex gap-2">{canCreate&&<button className="button button-primary" onClick={()=>setCreateOpen(true)}>+ Tạo hồ sơ mới</button>}<Link className="button button-secondary" href="/quan-tri">Quản trị</Link></div></div></header>
    <main className="mx-auto max-w-7xl space-y-5 p-6">
      <section className="card p-5"><label className="text-sm font-semibold" htmlFor="project-selector">Hồ sơ được cấp quyền</label><select id="project-selector" className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3" value={selectedId} onChange={(event) => { setMessage(""); setDashboard(null); setSelectedId(event.target.value); }}>{projects.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select>{message && <p className="mt-3 rounded bg-red-50 p-3 text-sm text-red-800">{message}</p>}</section>
      {!dashboard ? <section className="card p-8 text-center text-slate-500">Đang tải dashboard PostgreSQL…</section> : <>
        <section className="card flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center"><div><div className="flex gap-2"><span className="badge badge-blue">{dashboard.project.code}</span><span className="badge badge-slate">{dashboard.project.status}</span><span className="badge badge-slate">{dashboard.project.access}</span></div><h2 className="mt-3 text-2xl font-bold">{dashboard.project.name}</h2><p className="mt-1 text-sm text-slate-500">{dashboard.project.documentTypeCode} · dữ liệu dashboard từ PostgreSQL</p></div><Link className="button button-primary" href={`/projects/${dashboard.project.id}`}>Mở hồ sơ <span aria-hidden>→</span></Link></section>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Chỉ số hồ sơ">{metrics.map(([label, value]) => <article className="card p-4" key={String(label)}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></article>)}</section>
        <section className="card p-5"><div className="section-heading"><div><p className="eyebrow">Immutable history</p><h2>Phiên bản gần đây</h2></div><span className="badge badge-slate">{dashboard.recentVersions.length} phiên bản</span></div>{dashboard.recentVersions.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="pb-3">Mã</th><th className="pb-3">Tên</th><th className="pb-3">Thời điểm khóa</th></tr></thead><tbody>{dashboard.recentVersions.map((version) => <tr className="border-b last:border-0" key={version.id}><td className="py-3 font-semibold text-blue-800">{version.code}</td><td className="py-3">{version.name}</td><td className="py-3 text-slate-500">{new Date(version.sealedAt).toLocaleString("vi-VN")}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-slate-500">Hồ sơ chưa có DraftVersion bất biến.</p>}</section>
      </>}
    </main><ProjectCreationDialog open={createOpen} onClose={()=>setCreateOpen(false)} onCreated={()=>location.reload()}/>
  </div>;
}

function StatusPage({ title, detail,action }: { title: string; detail?: string;action?:ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><section className="max-w-xl rounded-xl border bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-bold">{title}</h1>{detail && <p className="mt-3 text-sm text-slate-600">{detail}</p>}{action}</section></main>;
}

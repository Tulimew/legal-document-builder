"use client";

import type { ProjectDashboard } from "@legal-document-builder/contracts";
import { useEffect, useState } from "react";
import { ProjectNavigation } from "./project-navigation";

export function ProjectOverview({ projectId }: { projectId: string }) {
  const [dashboard, setDashboard] = useState<ProjectDashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const user = process.env.NEXT_PUBLIC_DEVELOPMENT_USER_ID ?? "";
    void fetch(`/api/v1/projects/${projectId}/dashboard`, { headers: { "x-development-user-id": user } }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Không tải được hồ sơ.");
      setDashboard(body.data);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Không tải được hồ sơ."));
  }, [projectId]);
  return <main className="min-h-screen bg-slate-100"><ProjectNavigation projectId={projectId} active="overview"/><div className="mx-auto max-w-6xl p-6">{error ? <section className="card p-6 text-red-800"><h1 className="font-bold">Không thể mở hồ sơ</h1><p>{error}</p></section> : !dashboard ? <section className="card p-6">Đang tải PostgreSQL…</section> : <div className="space-y-4"><header className="card p-6"><p className="eyebrow">{dashboard.project.code}</p><h1 className="text-2xl font-bold">{dashboard.project.name}</h1><p className="mt-2 text-sm text-slate-500">Workspace {dashboard.context.workspaceId} · nhánh {dashboard.context.branchId}</p></header><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(dashboard.counts).map(([key,value])=><article className="card p-4" key={key}><p className="text-xs font-semibold uppercase text-slate-500">{key.replaceAll(/([A-Z])/g," $1")}</p><p className="mt-2 text-2xl font-bold">{value}</p></article>)}</section></div>}</div></main>;
}

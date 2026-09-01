"use client";
import type { ProjectWorkflowReadModel, WorkflowStageInstance } from "@legal-document-builder/contracts";
import Link from "next/link";
import { useEffect, useState } from "react";
import { deriveProjectProgress, type ProjectProgress } from "@/lib/workflow-progress";

const labels = { NOT_STARTED: "Chưa bắt đầu", PLANNED: "Dự kiến", ACTIVE: "Đang thực hiện", BLOCKED: "Đang bị vướng", COMPLETED: "Đã hoàn thành", CANCELLED: "Đã hủy" } as const;
async function data<T>(response: Response): Promise<T> { const body = await response.json(); if (!response.ok) throw new Error(body.error?.message ?? "Không tải được tiến độ."); return body.data as T }

export function ProjectProgressBar({ projectId }: { projectId: string }) {
  const [progress, setProgress] = useState<ProjectProgress | null>(null), [failed, setFailed] = useState(false);
  useEffect(() => { let active = true; void Promise.all([fetch(`/api/v1/projects/${projectId}/workflow`), fetch(`/api/v1/projects/${projectId}/workflow/stages`)]).then(async ([configuration, instances]) => deriveProjectProgress(await data<ProjectWorkflowReadModel>(configuration), await data<WorkflowStageInstance[]>(instances))).then((value) => { if (active) setProgress(value) }).catch(() => { if (active) setFailed(true) }); return () => { active = false } }, [projectId]);
  if (failed) return <aside className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 sm:px-5">Chưa tải được tiến độ nghiệp vụ. <Link className="font-bold underline" href={`/projects/${projectId}/workflow`}>Mở Quy trình</Link></aside>;
  if (!progress) return <aside aria-label="Đang tải tiến độ dự án" className="border-b bg-slate-50 px-3 py-2 text-xs text-slate-500 sm:px-5">Đang tải tiến độ nghiệp vụ…</aside>;
  return <section aria-label="Tiến độ nghiệp vụ của hồ sơ" className="project-progress border-b border-slate-200 bg-slate-50 px-3 py-3 sm:px-5"><div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs"><div><b>Tiến độ nghiệp vụ</b><span className="ml-2 text-slate-500">{progress.completed}/{progress.steps.length} bước · {progress.percentage}%</span></div><div className="text-slate-600">{progress.current ? <>Hiện tại: <b>{progress.current.name}</b></> : <b>Đã hoàn thành quy trình</b>}</div></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage}><div className="h-full rounded-full bg-blue-700" style={{ width: `${progress.percentage}%` }}/></div><ol className="project-progress-steps mt-3 flex min-w-max gap-2">{progress.steps.map((step, index) => <li className={`project-progress-step ${step.status.toLowerCase().replace("_", "-")}`} key={step.code}><span className="project-progress-number">{step.status === "COMPLETED" ? "✓" : index + 1}</span><span><b>{step.name}</b><small>{labels[step.status]}{step.sequence ? ` · lần ${step.sequence}` : ""}</small></span></li>)}</ol></section>;
}

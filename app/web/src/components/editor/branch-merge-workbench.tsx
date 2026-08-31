"use client";

import type { DraftBranchSummary, DraftVersionSummary, MergeOperation, MergeResolutionChoice } from "@legal-document-builder/contracts";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { editorHeaders } from "@/lib/editor-api";

type Envelope<T> = { data: T; error?: { code: string; message: string } };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { ...editorHeaders(Boolean(init?.body)), ...init?.headers } });
  const value = await response.json() as Envelope<T>;
  if (!response.ok) throw value.error ?? { code: "BACKEND_ERROR", message: "Backend không thể hoàn thành yêu cầu." };
  return value.data;
}

export function BranchMergeWorkbench({ projectId }: { projectId: string }) {
  const [branches, setBranches] = useState<DraftBranchSummary[]>([]);
  const [versions, setVersions] = useState<DraftVersionSummary[]>([]);
  const [operations, setOperations] = useState<MergeOperation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState<Record<string, string>>({});
  const [fork, setFork] = useState({ code: "", name: "", purpose: "", sourceVersionId: "" });
  const [merge, setMerge] = useState({ targetBranchId: "", theirsVersionId: "", reason: "Hợp nhất thay đổi đã rà soát", authorityBasis: "Quyết định của người có thẩm quyền" });
  const selected = operations.find(item => item.id === selectedId) ?? operations[0];
  const target = branches.find(item => item.id === merge.targetBranchId);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [branchData, versionData, operationData] = await Promise.all([
        api<DraftBranchSummary[]>(`/api/v1/projects/${projectId}/draft-branches`),
        api<DraftVersionSummary[]>(`/api/v1/projects/${projectId}/draft-versions?limit=100`),
        api<MergeOperation[]>(`/api/v1/projects/${projectId}/merge-operations`),
      ]);
      setBranches(branchData); setVersions(versionData); setOperations(operationData);
      setSelectedId(value => operationData.some(item => item.id === value) ? value : operationData[0]?.id ?? "");
      setFork(value => ({ ...value, sourceVersionId: value.sourceVersionId || versionData[0]?.id || "" }));
      setMerge(value => ({ ...value, targetBranchId: branchData.some(item => item.id === value.targetBranchId) ? value.targetBranchId : branchData.find(item => item.status === "ACTIVE" && item.headVersionId)?.id ?? "" }));
      setMessage("");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Không tải được dữ liệu."); }
    finally { setBusy(false); }
  }, [projectId]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  async function act(action: () => Promise<void>, success: string) { setBusy(true); try { await action(); await load(); setMessage(success); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Thao tác thất bại."); } finally { setBusy(false); } }
  const createFork = () => act(() => api(`/api/v1/projects/${projectId}/draft-branches`, { method: "POST", body: JSON.stringify({ contractVersion: "1.1", ...fork, correlationId: crypto.randomUUID() }) }), "Đã tạo nhánh từ immutable DraftVersion.");
  const openMerge = () => act(async () => {
    if (!target?.headVersionId) throw new Error("Target branch chưa có own head.");
    const created = await api<MergeOperation>(`/api/v1/projects/${projectId}/merge-operations`, { method: "POST", body: JSON.stringify({ contractVersion: "1.1", targetBranchId: target.id, oursVersionId: target.headVersionId, theirsVersionId: merge.theirsVersionId, expectedTargetWorkspaceRevision: target.workspaceRevision, reason: merge.reason, authorityBasis: merge.authorityBasis, correlationId: crypto.randomUUID() }) });
    setSelectedId(created.id);
  }, "Đã mở persistent merge operation.");
  const resolve = (conflictId: string, choice: MergeResolutionChoice) => act(() => {
    const conflict = selected?.conflicts.find(item => item.id === conflictId);
    const manualResult = choice === "USE_MANUAL_RESULT" ? JSON.parse(manual[conflictId] || JSON.stringify(conflict?.ours)) : undefined;
    return api(`/api/v1/projects/${projectId}/merge-operations/${selected!.id}/conflicts/${conflictId}/resolutions`, { method: "POST", body: JSON.stringify({ contractVersion: "1.1", choice, ...(manualResult ? { manualResult } : {}), reason: "Giải quyết conflict có kiểm chứng", authorityBasis: merge.authorityBasis, correlationId: crypto.randomUUID() }) });
  }, "Đã append resolution vào lịch sử.");
  const complete = () => act(() => api(`/api/v1/projects/${projectId}/merge-operations/${selected!.id}/complete`, { method: "POST", body: JSON.stringify({ contractVersion: "1.1", expectedTargetWorkspaceRevision: selected!.targetWorkspaceRevision, previewToken: selected!.previewChecksum, versionCode: `M8-${Date.now().toString(36).toUpperCase()}`, versionName: "Merged version", reason: selected!.reason, authorityBasis: selected!.authorityBasis, correlationId: crypto.randomUUID() }) }), "Merge đã hoàn thành atomically.");

  return <main className="min-h-screen bg-slate-100 p-5"><div className="mx-auto max-w-6xl space-y-4">
    <header className="card flex justify-between gap-4 p-5"><div><p className="eyebrow">PostgreSQL branch graph</p><h1 className="text-2xl font-bold">Nhánh, fork và hợp nhất</h1><p className="text-sm text-slate-600">Base, conflict và resolution đều là dữ liệu persistent; không dựng synthetic path.</p></div><Link className="button button-secondary" href={`/projects/${projectId}/drafting`}>← Soạn thảo</Link></header>
    {message && <p className="card p-3 text-sm" role="status">{message}</p>}
    <div className="grid gap-4 lg:grid-cols-2"><section className="card p-5"><h2 className="font-bold">Tạo nhánh</h2><select className="input mt-3" value={fork.sourceVersionId} onChange={event => setFork({ ...fork, sourceVersionId: event.target.value })}>{versions.map(version => <option key={version.id} value={version.id}>{version.code} · {version.name}</option>)}</select><div className="mt-2 grid gap-2 sm:grid-cols-3"><input className="input" placeholder="Mã" value={fork.code} onChange={event => setFork({ ...fork, code: event.target.value.toUpperCase() })}/><input className="input" placeholder="Tên" value={fork.name} onChange={event => setFork({ ...fork, name: event.target.value })}/><input className="input" placeholder="Mục đích" value={fork.purpose} onChange={event => setFork({ ...fork, purpose: event.target.value })}/></div><button className="button button-primary mt-3" disabled={busy || !fork.code || !fork.name || !fork.purpose} onClick={() => void createFork()}>Fork branch</button></section>
    <section className="card p-5"><h2 className="font-bold">Mở merge operation</h2><select className="input mt-3" value={merge.targetBranchId} onChange={event => setMerge({ ...merge, targetBranchId: event.target.value })}>{branches.filter(branch => branch.headVersionId).map(branch => <option key={branch.id} value={branch.id}>{branch.code} · {branch.headVersionCode}</option>)}</select><select className="input mt-2" value={merge.theirsVersionId} onChange={event => setMerge({ ...merge, theirsVersionId: event.target.value })}><option value="">Chọn source version…</option>{versions.filter(version => version.branchId !== merge.targetBranchId).map(version => <option key={version.id} value={version.id}>{version.code} · {version.name}</option>)}</select><button className="button button-primary mt-3" disabled={busy || !target?.headVersionId || !merge.theirsVersionId} onClick={() => void openMerge()}>Phân tích merge</button></section></div>
    <section className="card p-5"><h2 className="font-bold">Persistent operations</h2><div className="mt-3 flex flex-wrap gap-2">{operations.map(operation => <button className="button button-secondary" key={operation.id} onClick={() => setSelectedId(operation.id)}>{operation.status} · {operation.id.slice(0, 8)}</button>)}</div>{selected && <div className="mt-4"><p className="text-sm">BASE {selected.baseVersionId} · OURS {selected.oursVersionId} · THEIRS {selected.theirsVersionId}</p>{selected.conflicts.map(conflict => <article className="mt-3 rounded border border-amber-200 p-3" key={conflict.id}><b>{conflict.kind} · {conflict.legalNodeId}</b><div className="mt-2 flex flex-wrap gap-2"><button className="button" disabled={busy || selected.status === "COMPLETED"} onClick={() => void resolve(conflict.id, "USE_OURS")}>Dùng OURS</button><button className="button" disabled={busy || selected.status === "COMPLETED"} onClick={() => void resolve(conflict.id, "USE_THEIRS")}>Dùng THEIRS</button><button className="button" disabled={busy || selected.status === "COMPLETED"} onClick={() => void resolve(conflict.id, "USE_MANUAL_RESULT")}>Lưu manual JSON</button></div><textarea className="mt-2 min-h-28 w-full rounded border p-2 font-mono text-xs" aria-label={`Manual result ${conflict.legalNodeId}`} value={manual[conflict.id] ?? JSON.stringify(conflict.latestResolution?.manualResult ?? conflict.ours, null, 2)} onChange={event => setManual({ ...manual, [conflict.id]: event.target.value })}/><p className="mt-2 text-xs">Latest: {conflict.latestResolution?.choice ?? "chưa resolve"} · evidence {conflict.evidenceChecksum}</p></article>)}{selected.status === "READY" && <button className="button button-primary mt-4" onClick={() => void complete()}>Hoàn thành merge</button>}</div>}</section>
  </div></main>;
}

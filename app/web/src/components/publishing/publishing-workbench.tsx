"use client";

import type { DraftVersionSummary, PublishingJob, ReleasePackage } from "@legal-document-builder/contracts";
import { useCallback, useEffect, useState } from "react";
import { editorHeaders } from "@/lib/editor-api";

async function read<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Thao tác thất bại.");
  return body.data;
}

export function PublishingWorkbench({ projectId }: { projectId: string }) {
  const [versions, setVersions] = useState<DraftVersionSummary[]>([]);
  const [source, setSource] = useState("");
  const [jobs, setJobs] = useState<PublishingJob[]>([]);
  const [packages, setPackages] = useState<ReleasePackage[]>([]);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const [versionResponse, jobResponse, packageResponse] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}/draft-versions?limit=100`, { headers: editorHeaders() }),
        fetch(`/api/v1/projects/${projectId}/publishing-jobs`, { headers: editorHeaders() }),
        fetch(`/api/v1/projects/${projectId}/release-packages`, { headers: editorHeaders() }),
      ]);
      const [versionData, jobData, packageData] = await Promise.all([
        read<DraftVersionSummary[]>(versionResponse),
        read<PublishingJob[]>(jobResponse),
        read<ReleasePackage[]>(packageResponse),
      ]);
      setVersions(versionData);
      setSource(value => versionData.some(item => item.id === value) ? value : versionData[0]?.id ?? "");
      setJobs(jobData);
      setPackages(packageData);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Không tải được trạng thái tạo tài liệu.");
    }
  }, [projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const post = <T,>(url: string, body: unknown) => fetch(url, {
    method: "POST",
    headers: editorHeaders(true),
    body: JSON.stringify(body),
  }).then(read<T>);

  const create = async (artifactKind: "DRAFT_DOCX" | "DRAFT_PDF", templateVersionId: string) => {
    try {
      await post(`/api/v1/projects/${projectId}/publishing-jobs`, { artifactKind, sourceDraftVersionId: source, templateVersionId, idempotencyKey: crypto.randomUUID() });
      await load();
      setNotice("Tài liệu đã được tạo và kiểm tra tính toàn vẹn.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Không tạo được tài liệu."); }
  };

  const download = async (job: PublishingJob) => {
    if (!job.generatedDocumentId) return;
    const response = await fetch(`/api/v1/projects/${projectId}/generated-documents/${job.generatedDocumentId}/download`, { headers: editorHeaders() });
    if (!response.ok) return setNotice("Không tải được tài liệu.");
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${job.generatedDocumentId}.${job.artifactKind === "DRAFT_PDF" ? "pdf" : "docx"}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const verifyArtifact = async (job: PublishingJob) => {
    if (!job.generatedDocumentId) return;
    try {
      const result = await read<{ verified: boolean }>(await fetch(`/api/v1/projects/${projectId}/generated-documents/${job.generatedDocumentId}/verify`, { headers: editorHeaders() }));
      setNotice(result.verified ? "Tài liệu đã qua kiểm tra tính toàn vẹn." : "Tài liệu không còn hợp lệ.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Không kiểm tra được tài liệu."); }
  };

  const verifyPackage = async (releasePackage: ReleasePackage) => {
    try {
      const result = await read<{ verified: boolean }>(await fetch(`/api/v1/projects/${projectId}/release-packages/${releasePackage.id}/verify`, { headers: editorHeaders() }));
      setNotice(result.verified ? "Gói hồ sơ và các tệp bên trong đã qua kiểm tra." : "Gói không còn hợp lệ.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Không kiểm tra được gói."); }
  };

  const seal = async () => {
    const docx = jobs.find(item => item.artifactKind === "DRAFT_DOCX" && item.generatedDocumentId);
    const pdf = jobs.find(item => item.artifactKind === "DRAFT_PDF" && item.generatedDocumentId);
    if (!docx?.generatedDocumentId || !pdf?.generatedDocumentId) return setNotice("Cần DOCX và PDF trước khi tạo gói.");
    try {
      let releasePackage = await post<ReleasePackage>(`/api/v1/projects/${projectId}/release-packages`, { code: `PKG-${Date.now()}`, name: "Gói dự thảo", purpose: "Governed publishing" });
      const items = [
        { itemType: "DRAFT_VERSION", itemId: source, roleCode: "AUTHORITATIVE_SOURCE", label: "Dự thảo" },
        { itemType: "GENERATED_DOCUMENT", itemId: docx.generatedDocumentId, roleCode: "DOCX_RENDITION", label: "Bản DOCX" },
        { itemType: "GENERATED_DOCUMENT", itemId: pdf.generatedDocumentId, roleCode: "PDF_RENDITION", label: "Bản PDF" },
      ];
      for (const item of items) releasePackage = await post<ReleasePackage>(`/api/v1/projects/${projectId}/release-packages/${releasePackage.id}/items`, { ...item, expectedRevision: releasePackage.revision, itemOrder: releasePackage.revision });
      await post(`/api/v1/projects/${projectId}/release-packages/${releasePackage.id}/seal`, { expectedRevision: releasePackage.revision, authorityBasis: "Phê duyệt phát hành" });
      await load();
      setNotice("Gói hồ sơ đã được khóa và ghi mã kiểm tra toàn vẹn.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Không khóa được gói hồ sơ."); }
  };

  return <main className="min-h-screen bg-slate-100 p-6"><div className="mx-auto max-w-5xl space-y-4">
    <header className="card p-5"><p className="eyebrow">Governed publishing</p><h1 className="text-2xl font-bold">Xuất bản và gói phát hành</h1><p className="text-sm text-slate-600">Nguồn là immutable DraftVersion; binary được verify ngoài PostgreSQL.</p><select className="input mt-3" aria-label="DraftVersion nguồn" value={source} onChange={event => setSource(event.target.value)}>{versions.map(version => <option key={version.id} value={version.id}>{version.code} · {version.name}</option>)}</select><div className="mt-3 flex flex-wrap gap-2"><button className="button button-primary" disabled={!source} onClick={() => void create("DRAFT_DOCX", "70000000-0000-4000-8000-000000000013")}>Tạo DOCX</button><button className="button button-primary" disabled={!source} onClick={() => void create("DRAFT_PDF", "70000000-0000-4000-8000-000000000014")}>Tạo PDF</button><button className="button" disabled={!source} onClick={() => void seal()}>Tạo và seal gói</button></div>{notice && <p className="mt-3 rounded bg-blue-50 p-3 text-sm" role="status">{notice}</p>}</header>
    <section className="card p-5"><h2 className="font-bold">Publishing jobs persistent</h2>{jobs.map(job => <article className="mt-2 rounded border p-3 text-sm" key={job.id}><b>{job.artifactKind}</b> · {job.status} · lần thử {job.attempts}/{job.maxAttempts}{job.generatedDocumentId && <><button className="ml-3 underline" onClick={() => void download(job)}>Tải</button><button className="ml-3 underline" onClick={() => void verifyArtifact(job)}>Verify</button></>}</article>)}</section>
    <section className="card p-5"><h2 className="font-bold">Release packages</h2>{packages.map(item => <article className="mt-2 rounded border p-3 text-sm" key={item.id}><b>{item.code}</b> · {item.status} · revision {item.revision}{item.status === "SEALED" && <button className="ml-3 underline" onClick={() => void verifyPackage(item)}>Verify manifest + binary</button>}<p className="text-xs text-slate-500">{item.manifestChecksumSha256 ?? "Chưa có manifest"}</p></article>)}</section>
  </div></main>;
}

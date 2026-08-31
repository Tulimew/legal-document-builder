"use client";

import type { ProjectDashboard } from "@legal-document-builder/contracts";
import { useEffect, useState } from "react";
import { EditorPrototype } from "@/components/editor/editor-prototype";
import { ProjectNavigation } from "./project-navigation";

export function ProjectEditor({ projectId }: { projectId: string }) {
  const [dashboard, setDashboard] = useState<ProjectDashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const user = process.env.NEXT_PUBLIC_DEVELOPMENT_USER_ID ?? "";
    void fetch(`/api/v1/projects/${projectId}/dashboard`, { headers: { "x-development-user-id": user } }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Không tải được workspace.");
      setDashboard(body.data);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Không tải được workspace."));
  }, [projectId]);
  if (error) return <main className="p-6 text-red-800">{error}</main>;
  if (!dashboard) return <main className="p-6">Đang xác thực workspace PostgreSQL…</main>;
  return <><ProjectNavigation projectId={projectId} active="drafting"/><EditorPrototype workspaceId={dashboard.context.workspaceId}/></>;
}

import Link from "next/link";

export function ProjectNavigation({ projectId, active }: { projectId: string; active: string }) {
  const items = [
    ["overview", "Tổng quan", `/projects/${projectId}`],
    ["drafting", "Soạn thảo", `/projects/${projectId}/drafting`],
    ["workflow", "Quy trình", `/projects/${projectId}/workflow`],
    ["review", "Góp ý", `/projects/${projectId}/review`],
    ["comparison", "So sánh", `/projects/${projectId}/comparison`],
    ["branches", "Nhánh", `/projects/${projectId}/branches`],
    ["publishing", "Xuất bản", `/projects/${projectId}/publishing`],
    ["operations", "Tìm kiếm & hoạt động", `/projects/${projectId}/operations`],
  ];
  return <nav aria-label="Mô-đun hồ sơ" className="flex flex-wrap gap-2 border-b bg-white px-5 py-3">{items.map(([key, label, href]) => <Link className={`rounded-lg px-3 py-2 text-sm font-semibold ${active === key ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"}`} href={href} key={key}>{label}</Link>)}</nav>;
}

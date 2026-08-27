"use client";

import { useMemo, useState } from "react";
import type { NodeEvolution } from "@/lib/mock-data";

const all = "Tất cả";
const unique = (values: string[]) => [all, ...Array.from(new Set(values))];

export function VersionTimelinePanel({ nodeId, path, events, showIntermediate, onToggleIntermediate, onClose }: {
  nodeId: string; path: string[]; events: NodeEvolution[]; showIntermediate: boolean; onToggleIntermediate: () => void; onClose: () => void;
}) {
  const [nodeChoice, setNodeChoice] = useState("");
  const [version, setVersion] = useState(all);
  const [editor, setEditor] = useState(all);
  const [source, setSource] = useState(all);
  const [status, setStatus] = useState(all);
  const activeNodeId = nodeChoice || nodeId;
  const nodeOptions = useMemo(() => Array.from(new Set(events.map((event) => event.nodeId))), [events]);
  const nodeEvents = useMemo(() => events.filter((event) => event.nodeId === activeNodeId && path.includes(event.version) && (showIntermediate || !event.intermediateOnly)), [activeNodeId, events, path, showIntermediate]);
  const filtered = nodeEvents.filter((event) => (version === all || event.version === version) && (editor === all || event.editor === editor) && (source === all || event.source === source) && (status === all || event.status === status));
  const stableId = events.find((event) => event.nodeId === activeNodeId)?.stableNodeId ?? "Chưa có dữ liệu";
  const select = (label: string, value: string, setter: (value: string) => void, items: string[]) => <label className="text-[10px] font-semibold">{label}<select className="compact-select mt-1 w-full" value={value} onChange={(event) => setter(event.target.value)}>{items.map((item) => <option key={item}>{item}</option>)}</select></label>;

  return <aside className="trace-panel" aria-label="Diễn biến LegalNode qua phiên bản">
    <header className="border-b border-slate-200 p-3"><div className="flex items-start justify-between"><div><p className="eyebrow">Diễn biến LegalNode</p><h3 className="font-bold">{stableId}</h3></div><button className="icon-button" onClick={onClose} aria-label="Đóng timeline">×</button></div><p className="mt-1 text-[10px] text-slate-500">Người tạo phiên bản và người sửa nội dung được quản lý riêng.</p></header>
    <div className="workspace-scroll p-3">
      <label className="text-[10px] font-semibold">LegalNode đang xem<select className="compact-select mt-1 w-full" value={activeNodeId} onChange={(event) => setNodeChoice(event.target.value)}>{nodeOptions.map((item) => <option key={item} value={item}>{item} · {events.find((event) => event.nodeId === item)?.stableNodeId}</option>)}</select></label>
      <label className="mt-2 flex items-start gap-2 rounded-lg bg-slate-50 p-2 text-[10px] font-semibold"><input type="checkbox" checked={showIntermediate} onChange={onToggleIntermediate} /><span>Hiển thị thay đổi trung gian không còn trong phiên bản cuối</span></label>
      <div className="mt-2 grid grid-cols-2 gap-2">{select("Phiên bản", version, setVersion, [all, ...path])}{select("Người sửa", editor, setEditor, unique(nodeEvents.map((event) => event.editor)))}{select("Nguồn", source, setSource, unique(nodeEvents.map((event) => event.source)))}{select("Phê duyệt", status, setStatus, unique(nodeEvents.map((event) => event.status)))}</div>
      <ol className="mt-4 space-y-3">{path.map((code) => {
        const event = filtered.find((item) => item.version === code);
        return <li key={code} className={`rounded-lg border p-3 text-xs ${event && event.changeType !== "Không thay đổi" ? "border-blue-200 bg-blue-50" : "border-slate-200"}`}>
          <div className="flex items-center justify-between"><strong>{code}</strong><span className="badge badge-slate">{event?.changeType ?? "Không thay đổi"}</span></div>
          {event ? <><p className="mt-2 text-slate-500">Số hiển thị: <b>{event.displayNumber}</b> · ID: <b>{event.stableNodeId}</b></p><div className="mt-2 rounded bg-white p-2"><span className="text-slate-500">Trước</span><p>{event.before}</p><span className="mt-2 block text-slate-500">Sau</span><p>{event.after}</p></div><dl className="mt-2 space-y-1 text-slate-600"><div><dt className="inline font-semibold">Người sửa: </dt><dd className="inline">{event.editor} · {event.organization}</dd></div><div><dt className="inline font-semibold">Thời gian: </dt><dd className="inline">{event.changedAt}</dd></div><div><dt className="inline font-semibold">Lý do: </dt><dd className="inline">{event.reason}</dd></div><div><dt className="inline font-semibold">Nguồn: </dt><dd className="inline">{event.source}</dd></div><div><dt className="inline font-semibold">Phê duyệt: </dt><dd className="inline">{event.approver}</dd></div></dl></> : <p className="mt-2 text-slate-500">Không thay đổi tại nút đang chọn.</p>}
        </li>;
      })}</ol>
      {filtered.length === 0 && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs">Không có mốc phù hợp bộ lọc.</p>}
    </div>
  </aside>;
}

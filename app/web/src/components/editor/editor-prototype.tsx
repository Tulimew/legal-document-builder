"use client";

import { useEffect, useRef, useState } from "react";
import type { AmendmentOperation, DraftChange, MockComment, ResolutionCase, TreeNode } from "@/lib/mock-data";
import { SampleBanner } from "@/components/sample-banner";
import { EditorTopbar } from "./editor-topbar";
import { StructureTree } from "./structure-tree";
import { EditorWorkspace } from "./editor-workspace";
import { InspectorPanel } from "./inspector-panel";
import { VersionCreationDialog } from "./version-creation-dialog";

type Mode = "structure" | "traditional" | "compare" | "amendment";

type Direction = {id:string;type:string;title:string;date:string;nodes:string[];tasks:string[]};
export function EditorPrototype({ file, nodes, comments, directions, warnings, changes, operations, resolutionCases }: { file: Record<string, string>; nodes: TreeNode[]; comments: MockComment[]; directions:Direction[]; warnings: { level: string; icon: string; title: string; text: string }[]; changes:DraftChange[]; operations:AmendmentOperation[]; resolutionCases:ResolutionCase[] }) {
  const [selectedId, setSelectedId] = useState(nodes[3].id);
  const [mode, setMode] = useState<Mode>("structure");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [modal, setModal] = useState<"check" | "version" | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  const showInspector = rightOpen && mode !== "compare";
  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);
  const notify = (message: string) => { setToast(message); if (toastTimer.current) window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(""), 2600); };

  return <main className="flex h-screen min-h-[680px] flex-col overflow-hidden bg-slate-100">
    <SampleBanner />
    <EditorTopbar file={file} onCheck={() => setModal("check")} onVersion={() => setModal("version")} />
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
      <div className="flex gap-1" role="tablist" aria-label="Chế độ hiển thị">
        {([['structure','Biên tập cấu trúc'],['traditional','Trình bày truyền thống'],['compare','So sánh'],['amendment','Thao tác sửa đổi']] as const).map(([id,label]) => <button key={id} className={`mode-tab ${mode===id?'mode-tab-active':''}`} onClick={() => setMode(id)}>{label}</button>)}
      </div>
      <div className="flex gap-2"><button className="icon-button" onClick={() => setLeftOpen(!leftOpen)} aria-pressed={!leftOpen}>☰ Cây</button>{mode!=="compare"&&<button className="icon-button" onClick={() => setRightOpen(!rightOpen)} aria-pressed={!rightOpen}>⚙ Thuộc tính</button>}</div>
    </div>
    <div className={`editor-grid min-h-0 flex-1 ${leftOpen?'':'left-closed'} ${showInspector?'':'right-closed'}`}>
      {leftOpen && <StructureTree nodes={nodes} selectedId={selectedId} onSelect={setSelectedId} onNotify={notify} />}
      <EditorWorkspace key={mode === "structure" ? selected.id : mode} node={selected} nodes={nodes} mode={mode} changes={changes} operations={operations} onSelect={setSelectedId} onNotify={notify} />
      {showInspector && <InspectorPanel node={selected} comments={comments} directions={directions} warnings={warnings} resolutionCases={resolutionCases} onNotify={notify} />}
    </div>
    <p className="desktop-note">Nguyên mẫu được tối ưu cho màn hình từ 1366 px; một số bảng điều khiển được ẩn trên màn hình nhỏ.</p>
    {toast && <div className="toast" role="status">{toast}</div>}
    {modal==='version'&&<VersionCreationDialog onClose={()=>setModal(null)} onNotify={notify}/>} 
    {modal==='check' && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-card">
      <div className="section-heading"><div><p className="eyebrow">Thao tác mô phỏng</p><h2 id="modal-title">{modal==='check'?'Kiểm tra dự thảo':'Tạo phiên bản dự thảo'}</h2></div><button className="icon-button" onClick={() => setModal(null)} aria-label="Đóng">×</button></div>
      <div className="mt-5 space-y-3"><div className="property-card"><strong>1 lỗi chặn</strong><span>Thời điểm dự kiến áp dụng chưa được xác nhận trong dữ liệu mẫu.</span></div><div className="property-card"><strong>1 nội dung cần xác nhận</strong><span>Tham chiếu nội bộ cần được rà soát.</span></div><p className="text-xs text-slate-500">Kết quả chỉ phục vụ minh họa, không phải kiểm tra pháp lý.</p></div>
      <div className="mt-6 flex justify-end gap-2"><button className="button button-secondary" onClick={() => setModal(null)}>Hủy</button><button className="button button-primary" onClick={() => { setModal(null); notify('Đã hoàn tất kiểm tra mô phỏng.'); }}>Chạy kiểm tra</button></div>
    </div></div>}
  </main>;
}

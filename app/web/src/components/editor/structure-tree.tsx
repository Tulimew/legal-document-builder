import type { TreeNode } from "@/lib/mock-data";

export function StructureTree({ nodes, selectedId, onSelect, onNotify }: { nodes: TreeNode[]; selectedId: string; onSelect: (id:string)=>void; onNotify:(message:string)=>void }) {
  return <aside className="workspace-scroll border-r border-slate-200 bg-white" aria-label="Cây cấu trúc văn bản">
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-3"><div className="flex items-center justify-between"><div><p className="eyebrow">Cấu trúc</p><h2 className="text-sm font-bold">Cây nội dung</h2></div><button className="icon-button" onClick={() => onNotify('Đã mở danh sách thành phần mẫu.')}>＋ Thêm</button></div>
      <div className="mt-2 flex flex-wrap gap-1" aria-label="Thêm thành phần cấu trúc">{['Chương','Mục','Tiểu mục','Điều','Khoản','Điểm'].map(x=><button key={x} className="tiny-button" onClick={()=>onNotify(`Chức năng thêm ${x} đang ở chế độ mô phỏng.`)}>{x}</button>)}</div>
    </div>
    <div className="p-2">{nodes.map(node=><button key={node.id} className={`tree-node ${selectedId===node.id?'tree-node-active':''}`} style={{paddingLeft: `${8+node.level*16}px`}} onClick={()=>onSelect(node.id)} aria-current={selectedId===node.id?'true':undefined}><span className="tree-icon">{node.level===0?'▤':'└'}</span><span className="min-w-0 flex-1 truncate">{node.label}</span>{node.hasComment&&<span title="Có ý kiến" aria-label="Có ý kiến">●<span className="sr-only"> ý kiến</span></span>}{node.hasDirection&&<span className="font-bold text-blue-700" title="Có chỉ đạo" aria-label="Có chỉ đạo">◆<span className="sr-only"> chỉ đạo</span></span>}{node.hasWarning&&<span className="font-bold text-amber-700" title="Có cảnh báo" aria-label="Có cảnh báo">!<span className="sr-only"> cảnh báo</span></span>}</button>)}</div>
  </aside>;
}

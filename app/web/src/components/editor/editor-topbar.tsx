import Link from "next/link";

export function EditorTopbar({ file, onCheck, onVersion }: { file: Record<string,string>; onCheck: () => void; onVersion: () => void }) {
  return <header className="border-b border-slate-200 bg-white px-4 py-3">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
      <div className="flex min-w-0 items-center gap-3"><Link href="/" className="icon-button" aria-label="Về tổng quan">← Tổng quan</Link><div className="min-w-0"><div className="flex items-center gap-2"><span className="badge badge-blue">{file.draft}</span><span className="text-xs font-semibold text-slate-500">{file.id} · {file.branch}</span></div><h1 className="truncate text-sm font-bold text-slate-900">{file.name}</h1></div></div>
      <div className="mobile-action-strip flex items-center gap-2"><span className="hidden text-xs text-slate-500 xl:inline">RuleSet: {file.ruleset}</span><Link className="button button-secondary shrink-0" href="/ho-so/du-thao-thong-tu-mau/soan-thao/nhanh">Nhánh & hợp nhất</Link><Link className="button button-secondary shrink-0" href="/ho-so/du-thao-thong-tu-mau/soan-thao/ban-so-sanh">Bản so sánh, thuyết minh</Link><button className="button button-secondary shrink-0" onClick={onCheck}>✓ Kiểm tra</button><button className="button button-primary shrink-0" onClick={onVersion}>＋ Tạo phiên bản</button></div>
    </div>
  </header>;
}

import type { DraftChange } from "@/lib/mock-data";

export function ChangeSummaryPopover({change}:{change:DraftChange}){return <span className="change-popover" role="status"><strong>{change.type} · {change.id}</strong><span>Người sửa: {change.editor}</span><span>{change.reason}</span><span>Nguồn: {change.sourceName??"Chưa xác định đủ căn cứ"}</span><span>Trạng thái: {change.status}</span><b>Nhấn để xem đầy đủ</b></span>}

export type PrototypeResolutionStatus = "Chưa xử lý" | "Đã tiếp thu và cập nhật tại dự thảo" | "Tiếp thu một phần ý kiến" | "Giải trình";
export type PrototypeScope = "Mục" | "Chương" | "Điều" | "Khoản" | "Điểm" | "Ý kiến khác";

export type PrototypeLinkedChange = {
  id: string;
  nodeId: string;
  location: string;
  before: string;
  after: string;
  linkedAt: string;
};

export type PrototypeComment = {
  id: string;
  scope: PrototypeScope;
  nodeId?: string;
  target: string;
  organization: string;
  content: string;
  status: PrototypeResolutionStatus;
  explanation?: string;
  linkedChanges: PrototypeLinkedChange[];
};

const STORAGE_KEY = "legal-builder.prototype.comments.v2";

export const initialPrototypeComments: PrototypeComment[] = [{
  id: "YK-001",
  scope: "Điều",
  nodeId: "art1",
  target: "Điều 1 · Phạm vi điều chỉnh",
  organization: "Đơn vị góp ý A",
  content: "Đề nghị làm rõ phạm vi điều chỉnh.",
  status: "Chưa xử lý",
  linkedChanges: [],
}];

export function loadPrototypeComments(): PrototypeComment[] {
  if (typeof window === "undefined") return initialPrototypeComments;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return initialPrototypeComments;
  try {
    const value = JSON.parse(stored) as PrototypeComment[];
    return Array.isArray(value) ? value : initialPrototypeComments;
  } catch {
    return initialPrototypeComments;
  }
}

export function savePrototypeComments(comments: PrototypeComment[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  window.dispatchEvent(new CustomEvent("prototype-comments-changed"));
}

export function linkChangeToComments(change: PrototypeLinkedChange, commentIds: string[]): void {
  const selected = new Set(commentIds);
  const comments = loadPrototypeComments().map((comment) => selected.has(comment.id)
    ? { ...comment, linkedChanges: [...comment.linkedChanges.filter((item) => item.id !== change.id), change] }
    : comment);
  savePrototypeComments(comments);
}

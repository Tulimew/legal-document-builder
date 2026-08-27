import type { DraftChange, TreeNode } from "@/lib/mock-data";
import type { PrototypeComment } from "@/lib/review-prototype-store";
import publishingTemplates from "@/config/publishing-templates/v1.json";

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export async function exportReviewSynthesis(nodes: TreeNode[], comments: PrototypeComment[]) {
  const template = publishingTemplates.templates.reviewSynthesis;
  const d = await import("docx");
  const { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, PageOrientation, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = d;
  const cell = (text: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold, font: "Times New Roman", size: 24 })] })] });
  const rows: InstanceType<typeof TableRow>[] = [new TableRow({ tableHeader: true, children: [cell("CHÍNH SÁCH HOẶC NHÓM VẤN ĐỀ, ĐIỀU, KHOẢN", true), cell("CHỦ THỂ GÓP Ý", true), cell("CHỦ THỂ GÓP Ý PHẢN BIỆN", true), cell("NỘI DUNG TIẾP THU, GIẢI TRÌNH", true)] })];
  for (const node of nodes.filter((item) => !["Phần ký", "Nơi nhận"].includes(item.type))) {
    const matching = comments.filter((item) => item.nodeId === node.id || (!item.nodeId && item.target === node.label));
    if (!matching.length) rows.push(new TableRow({ children: [cell(`${node.label}\n${node.content}`), cell(""), cell(""), cell("")] }));
    for (const comment of matching) rows.push(new TableRow({ children: [cell(`${node.label}\n${node.content}`), cell(comment.organization), cell(comment.content), cell(comment.status === "Chưa xử lý" ? "" : comment.explanation || comment.status)] }));
  }
  const other = comments.filter((item) => item.scope === "Ý kiến khác");
  if (!other.length) rows.push(new TableRow({ children: [cell("Ý kiến khác", true), cell(""), cell(""), cell("")] }));
  for (const comment of other) rows.push(new TableRow({ children: [cell(`Ý kiến khác\n${comment.target}`, true), cell(comment.organization), cell(comment.content), cell(comment.status === "Chưa xử lý" ? "" : comment.explanation || comment.status)] }));
  const doc = new Document({ sections: [{ properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 850, right: 700, bottom: 850, left: 700 } } }, children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DỮ LIỆU MẪU - KHÔNG CÓ GIÁ TRỊ PHÁP LÝ", bold: true, font: "Times New Roman", size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.TITLE, children: [new TextRun({ text: template.title, bold: true, font: "Times New Roman", size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Mẫu ${template.id} · phiên bản ${template.version}`, italics: true, font: "Times New Roman", size: 18 })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: template.columns, borders: { top: { style: BorderStyle.SINGLE, size: 4 }, bottom: { style: BorderStyle.SINGLE, size: 4 }, left: { style: BorderStyle.SINGLE, size: 4 }, right: { style: BorderStyle.SINGLE, size: 4 }, insideHorizontal: { style: BorderStyle.SINGLE, size: 4 }, insideVertical: { style: BorderStyle.SINGLE, size: 4 } }, rows }),
  ] }] });
  download(await Packer.toBlob(doc), template.filename);
}

export async function exportDraftComparison(changes: DraftChange[], explanations: Record<string, string>) {
  const template = publishingTemplates.templates.draftComparison;
  const d = await import("docx");
  const { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, PageOrientation, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = d;
  const cell = (text: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold, font: "Times New Roman", size: 24 })] })] });
  const changed = changes.filter((item) => item.before !== item.after);
  const rows = [new TableRow({ tableHeader: true, children: [cell("NỘI DUNG DỰ THẢO TRƯỚC", true), cell("NỘI DUNG DỰ THẢO SAU KHI HOÀN THIỆN", true), cell("THUYẾT MINH", true)] }), ...changed.map((item) => new TableRow({ children: [cell(`${item.location}\n${item.before}`), cell(`${item.location}\n${item.after}`), cell(explanations[item.id] ?? "")] }))];
  const doc = new Document({ sections: [{ properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 850, right: 700, bottom: 850, left: 700 } } }, children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DỮ LIỆU MẪU - KHÔNG CÓ GIÁ TRỊ PHÁP LÝ", bold: true, font: "Times New Roman", size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.TITLE, children: [new TextRun({ text: template.title, bold: true, font: "Times New Roman", size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Mẫu ${template.id} · phiên bản ${template.version}`, italics: true, font: "Times New Roman", size: 18 })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: template.columns, borders: { top: { style: BorderStyle.SINGLE, size: 4 }, bottom: { style: BorderStyle.SINGLE, size: 4 }, left: { style: BorderStyle.SINGLE, size: 4 }, right: { style: BorderStyle.SINGLE, size: 4 }, insideHorizontal: { style: BorderStyle.SINGLE, size: 4 }, insideVertical: { style: BorderStyle.SINGLE, size: 4 } }, rows }),
  ] }] });
  download(await Packer.toBlob(doc), template.filename);
}

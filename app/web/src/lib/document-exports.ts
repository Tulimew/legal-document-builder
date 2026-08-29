import type { DraftChange, TreeNode } from "@/lib/mock-data";
import type { PrototypeComment } from "@/lib/review-prototype-store";
import type {Comment,ReviewDraftChange} from "@legal-document-builder/contracts";
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
  const { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, PageOrientation, Paragraph, Table, TableCell, TableRow, TextRun, VerticalAlign, VerticalMergeType, WidthType } = d;
  const cell = (text: string, bold = false, verticalMerge?: typeof VerticalMergeType[keyof typeof VerticalMergeType]) => new TableCell({ verticalAlign: VerticalAlign.TOP, ...(verticalMerge ? { verticalMerge } : {}), children: [new Paragraph({ children: [new TextRun({ text, bold, font: "Times New Roman", size: 24 })] })] });
  const rows: InstanceType<typeof TableRow>[] = [new TableRow({ tableHeader: true, children: [cell("CHÍNH SÁCH HOẶC NHÓM VẤN ĐỀ, ĐIỀU, KHOẢN", true), cell("CHỦ THỂ GÓP Ý", true), cell("CHỦ THỂ GÓP Ý PHẢN BIỆN", true), cell("NỘI DUNG TIẾP THU, GIẢI TRÌNH", true)] })];
  const addGroup = (scopeContent: string, matching: PrototypeComment[], bold = false) => {
    if (!matching.length) {
      rows.push(new TableRow({ children: [cell(scopeContent, bold), cell(""), cell(""), cell("")] }));
      return;
    }
    matching.forEach((comment, index) => rows.push(new TableRow({ children: [
      cell(index === 0 ? scopeContent : "", bold, index === 0 ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE),
      cell(comment.organization),
      cell(comment.content),
      cell(comment.status === "Chưa xử lý" ? "" : comment.explanation || comment.status),
    ] })));
  };
  for (const node of nodes.filter((item) => !["Phần ký", "Nơi nhận"].includes(item.type))) {
    addGroup(`${node.label}\n${node.content}`, comments.filter((item) => item.nodeId === node.id));
  }
  addGroup("Ý kiến khác", comments.filter((item) => item.scope === "Ý kiến khác" || !item.nodeId), true);
  const doc = new Document({ sections: [{ properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 850, right: 700, bottom: 850, left: 700 } } }, children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DỮ LIỆU MẪU - KHÔNG CÓ GIÁ TRỊ PHÁP LÝ", bold: true, font: "Times New Roman", size: 22 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.TITLE, children: [new TextRun({ text: template.title, bold: true, font: "Times New Roman", size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Mẫu ${template.id} · phiên bản ${template.version}`, italics: true, font: "Times New Roman", size: 18 })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: template.columns, borders: { top: { style: BorderStyle.SINGLE, size: 4 }, bottom: { style: BorderStyle.SINGLE, size: 4 }, left: { style: BorderStyle.SINGLE, size: 4 }, right: { style: BorderStyle.SINGLE, size: 4 }, insideHorizontal: { style: BorderStyle.SINGLE, size: 4 }, insideVertical: { style: BorderStyle.SINGLE, size: 4 } }, rows }),
  ] }] });
  download(await Packer.toBlob(doc), template.filename);
}

export async function buildPersistentReviewSynthesis(comments:Comment[],changes:ReviewDraftChange[]):Promise<Buffer>{
  const template=publishingTemplates.templates.reviewSynthesis,d=await import("docx");
  const{AlignmentType,BorderStyle,Document,HeadingLevel,Packer,PageOrientation,Paragraph,Table,TableCell,TableRow,TextRun,VerticalAlign,WidthType}=d;
  const cell=(text:string,bold=false)=>new TableCell({verticalAlign:VerticalAlign.TOP,width:{size:1,type:WidthType.DXA},children:text.split("\n").map(line=>new Paragraph({children:[new TextRun({text:line||" ",bold,font:"Times New Roman",size:22})]}))});
  const labels={ACCEPTED_AND_UPDATED:"Đồng ý/đã tiếp thu",PARTIALLY_ACCEPTED:"Tiếp thu một phần",EXPLAINED_NOT_ACCEPTED:"Không tiếp thu"} as const;
  const byId=new Map(changes.map(change=>[change.id,change]));
  const rows=[new TableRow({tableHeader:true,children:[cell("PHẠM VI",true),cell("CHỦ THỂ GÓP Ý",true),cell("NỘI DUNG GÓP Ý",true),cell("KẾT QUẢ TIẾP THU/GIẢI TRÌNH",true),cell("THAY ĐỔI DỰ THẢO ĐÃ LIÊN KẾT",true)]}),...comments.map(comment=>{
    const resolution=comment.latestResolution,linked=(resolution?.linkedChangeIds??[]).map(id=>byId.get(id)).filter((item):item is ReviewDraftChange=>Boolean(item));
    const result=resolution?`${labels[resolution.resolutionType]}${resolution.explanation?`\n${resolution.explanation}`:""}${resolution.effectiveDraftVersionId?`\nPhiên bản áp dụng: ${resolution.effectiveDraftVersionId}`:""}`:"Chưa xử lý";
    const trace=linked.length?linked.map(change=>`${change.effectiveDraftVersionCode} · ${change.reason}\nTrước: ${change.beforeText||"(trống)"}\nSau: ${change.afterText||"(trống)"}`).join("\n\n"):"Không có thay đổi liên kết";
    return new TableRow({children:[cell(comment.targetDescription),cell(comment.contributorOrganizationName),cell(comment.commentContent),cell(result),cell(trace)]});
  })];
  const doc=new Document({styles:{default:{document:{run:{font:"Times New Roman",size:22}}}},sections:[{properties:{page:{size:{orientation:PageOrientation.LANDSCAPE},margin:{top:720,right:540,bottom:720,left:540}}},children:[
    new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:"DỮ LIỆU MẪU - KHÔNG CÓ GIÁ TRỊ PHÁP LÝ",bold:true,font:"Times New Roman",size:22})]}),
    new Paragraph({alignment:AlignmentType.CENTER,heading:HeadingLevel.TITLE,children:[new TextRun({text:template.title,bold:true,font:"Times New Roman",size:28})]}),
    new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:`Mẫu ${template.id} · phiên bản ${template.version} · nguồn PostgreSQL`,italics:true,font:"Times New Roman",size:18})]}),
    new Table({width:{size:100,type:WidthType.PERCENTAGE},columnWidths:[1500,1500,2200,2500,3500],borders:{top:{style:BorderStyle.SINGLE,size:4},bottom:{style:BorderStyle.SINGLE,size:4},left:{style:BorderStyle.SINGLE,size:4},right:{style:BorderStyle.SINGLE,size:4},insideHorizontal:{style:BorderStyle.SINGLE,size:4},insideVertical:{style:BorderStyle.SINGLE,size:4}},rows}),
  ]}]});
  return Packer.toBuffer(doc);
}

export async function exportPersistentReviewSynthesis(comments:Comment[],changes:ReviewDraftChange[]){
  const buffer=await buildPersistentReviewSynthesis(comments,changes);
  download(new Blob([new Uint8Array(buffer)],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),publishingTemplates.templates.reviewSynthesis.filename);
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

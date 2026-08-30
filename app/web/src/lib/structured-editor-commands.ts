import type {
  InlineMark,
  InlineSpan,
  LegalContentBlock,
  ListBlock,
  ParagraphBlock,
} from "@legal-document-builder/contracts";

const MARK_ORDER: InlineMark[] = ["BOLD", "ITALIC", "UNDERLINE", "SUPERSCRIPT", "SUBSCRIPT"];

export type StructuredEditorCommand =
  | { type: "INSERT_BLOCK"; index: number; block: LegalContentBlock }
  | { type: "REPLACE_BLOCK"; index: number; block: LegalContentBlock }
  | { type: "DELETE_BLOCK"; index: number }
  | { type: "MOVE_BLOCK"; from: number; to: number }
  | { type: "SPLIT_PARAGRAPH"; blockIndex: number; spanIndex: number; offset: number }
  | { type: "JOIN_PARAGRAPHS"; firstBlockIndex: number }
  | { type: "TOGGLE_SPAN_MARK"; blockIndex: number; spanIndex: number; mark: InlineMark };

function annotations(span: InlineSpan): string {
  return JSON.stringify({
    marks: span.marks ?? [],
    reference: span.reference ?? null,
    footnoteId: span.footnoteId ?? null,
  });
}

export function normalizeSpan(span: InlineSpan): InlineSpan {
  const marks = [...new Set(span.marks ?? [])].sort(
    (left, right) => MARK_ORDER.indexOf(left) - MARK_ORDER.indexOf(right),
  );
  return {
    text: span.text.replace(/\r\n?/g, "\n"),
    ...(marks.length > 0 ? { marks } : {}),
    ...(span.reference ? { reference: structuredClone(span.reference) } : {}),
    ...(span.footnoteId ? { footnoteId: span.footnoteId } : {}),
  };
}

export function normalizeParagraph(value: ParagraphBlock): ParagraphBlock {
  const normalized = value.spans.map(normalizeSpan);
  const spans: InlineSpan[] = [];
  for (const span of normalized) {
    const previous = spans.at(-1);
    if (previous && annotations(previous) === annotations(span)) previous.text += span.text;
    else spans.push(span);
  }
  const withoutRedundantEmpty = spans.filter((span) => span.text.length > 0 || span.reference || span.footnoteId);
  return { kind: "PARAGRAPH", spans: withoutRedundantEmpty.length > 0 ? withoutRedundantEmpty : [{ text: "" }] };
}

export function normalizeContent(content: LegalContentBlock[]): LegalContentBlock[] {
  return content.map((block) => {
    if (block.kind === "PARAGRAPH") return normalizeParagraph(block);
    if (block.kind === "LIST") {
      return { ...structuredClone(block), items: block.items.map((item) => ({ ...item, blocks: item.blocks.map(normalizeParagraph) })) };
    }
    if (block.kind === "TABLE") {
      return {
        ...structuredClone(block),
        ...(block.caption ? { caption: block.caption.map(normalizeParagraph) } : {}),
        rows: block.rows.map((row) => ({ ...row, cells: row.cells.map((cell) => ({ ...cell, blocks: cell.blocks.map(normalizeParagraph) })) })),
      };
    }
    return { ...structuredClone(block), ...(block.caption ? { caption: block.caption.map(normalizeParagraph) } : {}) };
  });
}

function indexInRange(index: number, length: number, field: string, allowEnd = false): void {
  const maximum = allowEnd ? length : length - 1;
  if (!Number.isSafeInteger(index) || index < 0 || index > maximum) {
    throw new Error(`UNSUPPORTED STRUCTURED OPERATION: ${field} ngoài phạm vi.`);
  }
}

export function applyStructuredCommand(
  current: LegalContentBlock[],
  command: StructuredEditorCommand,
): LegalContentBlock[] {
  const content = structuredClone(current);
  if (command.type === "INSERT_BLOCK") {
    indexInRange(command.index, content.length, "index", true);
    content.splice(command.index, 0, structuredClone(command.block));
  } else if (command.type === "REPLACE_BLOCK") {
    indexInRange(command.index, content.length, "index");
    content[command.index] = structuredClone(command.block);
  } else if (command.type === "DELETE_BLOCK") {
    indexInRange(command.index, content.length, "index");
    content.splice(command.index, 1);
  } else if (command.type === "MOVE_BLOCK") {
    indexInRange(command.from, content.length, "from");
    indexInRange(command.to, content.length, "to");
    const [block] = content.splice(command.from, 1);
    content.splice(command.to, 0, block);
  } else if (command.type === "SPLIT_PARAGRAPH") {
    indexInRange(command.blockIndex, content.length, "blockIndex");
    const block = content[command.blockIndex];
    if (block.kind !== "PARAGRAPH") throw new Error("UNSUPPORTED STRUCTURED OPERATION: chỉ PARAGRAPH có thể split.");
    indexInRange(command.spanIndex, block.spans.length, "spanIndex");
    const span = block.spans[command.spanIndex];
    if (!Number.isSafeInteger(command.offset) || command.offset < 0 || command.offset > span.text.length) {
      throw new Error("UNSUPPORTED STRUCTURED OPERATION: offset ngoài phạm vi.");
    }
    const left = normalizeParagraph({ kind: "PARAGRAPH", spans: [...block.spans.slice(0, command.spanIndex), { ...span, text: span.text.slice(0, command.offset) }] });
    const right = normalizeParagraph({ kind: "PARAGRAPH", spans: [{ ...span, text: span.text.slice(command.offset) }, ...block.spans.slice(command.spanIndex + 1)] });
    content.splice(command.blockIndex, 1, left, right);
  } else if (command.type === "JOIN_PARAGRAPHS") {
    indexInRange(command.firstBlockIndex, content.length - 1, "firstBlockIndex");
    const first = content[command.firstBlockIndex], second = content[command.firstBlockIndex + 1];
    if (first.kind !== "PARAGRAPH" || second.kind !== "PARAGRAPH") throw new Error("UNSUPPORTED STRUCTURED OPERATION: chỉ hai PARAGRAPH liền nhau có thể join.");
    content.splice(command.firstBlockIndex, 2, normalizeParagraph({ kind: "PARAGRAPH", spans: [...first.spans, ...second.spans] }));
  } else {
    indexInRange(command.blockIndex, content.length, "blockIndex");
    const block = content[command.blockIndex];
    if (block.kind !== "PARAGRAPH") throw new Error("UNSUPPORTED STRUCTURED OPERATION: mark yêu cầu PARAGRAPH.");
    indexInRange(command.spanIndex, block.spans.length, "spanIndex");
    const span = block.spans[command.spanIndex];
    const marks = span.marks?.includes(command.mark)
      ? span.marks.filter((mark) => mark !== command.mark)
      : [...(span.marks ?? []), command.mark];
    block.spans[command.spanIndex] = normalizeSpan({ ...span, marks });
  }
  return normalizeContent(content);
}

export function plainTextToCanonicalBlocks(value: string): LegalContentBlock[] {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const blocks: LegalContentBlock[] = [];
  let list: ListBlock | undefined;
  const flushList = () => { if (list) blocks.push(list); list = undefined; };
  for (const line of lines) {
    const bullet = /^\s*(?:[-*•]|\d+[.)])\s+(.+)$/.exec(line);
    if (bullet) {
      list ??= { kind: "LIST", styleCode: /^\s*\d/.test(line) ? "NUMBER" : "BULLET", items: [] };
      list.items.push({ id: crypto.randomUUID(), blocks: [{ kind: "PARAGRAPH", spans: [{ text: bullet[1] }] }] });
    } else {
      flushList();
      blocks.push({ kind: "PARAGRAPH", spans: [{ text: line }] });
    }
  }
  flushList();
  return normalizeContent(blocks);
}

export class StructuredUndoHistory {
  private past: LegalContentBlock[][] = [];
  private future: LegalContentBlock[][] = [];
  constructor(private present: LegalContentBlock[]) { this.present = structuredClone(present); }
  current(): LegalContentBlock[] { return structuredClone(this.present); }
  execute(command: StructuredEditorCommand): LegalContentBlock[] {
    const next = applyStructuredCommand(this.present, command);
    this.past.push(structuredClone(this.present)); this.present = next; this.future = [];
    return this.current();
  }
  replace(next: LegalContentBlock[]): LegalContentBlock[] {
    this.past.push(structuredClone(this.present)); this.present = normalizeContent(next); this.future = [];
    return this.current();
  }
  undo(): LegalContentBlock[] {
    const previous = this.past.pop(); if (!previous) return this.current();
    this.future.push(structuredClone(this.present)); this.present = previous; return this.current();
  }
  redo(): LegalContentBlock[] {
    const next = this.future.pop(); if (!next) return this.current();
    this.past.push(structuredClone(this.present)); this.present = next; return this.current();
  }
  reset(next: LegalContentBlock[]): void { this.present = structuredClone(next); this.past = []; this.future = []; }
  canUndo(): boolean { return this.past.length > 0; }
  canRedo(): boolean { return this.future.length > 0; }
}

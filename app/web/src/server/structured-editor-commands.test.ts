import assert from "node:assert/strict";
import test from "node:test";
import type { LegalContentBlock } from "@legal-document-builder/contracts";
import { applyStructuredCommand, normalizeContent, plainTextToCanonicalBlocks, StructuredUndoHistory } from "@/lib/structured-editor-commands";

const paragraph = (text: string): LegalContentBlock => ({ kind: "PARAGRAPH", spans: [{ text }] });

test("canonical normalization merges compatible spans and orders marks", () => {
  const [result] = normalizeContent([{ kind: "PARAGRAPH", spans: [{ text: "Luật ", marks: ["ITALIC", "BOLD", "BOLD"] }, { text: "Việt Nam", marks: ["BOLD", "ITALIC"] }] }]);
  assert.equal(result.kind, "PARAGRAPH");
  if (result.kind !== "PARAGRAPH") return;
  assert.deepEqual(result.spans, [{ text: "Luật Việt Nam", marks: ["BOLD", "ITALIC"] }]);
});

test("split and join paragraph preserve inline annotations", () => {
  const value: LegalContentBlock[] = [{ kind: "PARAGRAPH", spans: [{ text: "Điều 1", marks: ["BOLD"], footnoteId: "00000000-0000-4000-8000-000000000001" }] }];
  const split = applyStructuredCommand(value, { type: "SPLIT_PARAGRAPH", blockIndex: 0, spanIndex: 0, offset: 4 });
  assert.equal(split.length, 2);
  const joined = applyStructuredCommand(split, { type: "JOIN_PARAGRAPHS", firstBlockIndex: 0 });
  assert.deepEqual(joined, value);
});

test("move/delete unsupported index leaves input unchanged", () => {
  const value = [paragraph("A"), paragraph("B")];
  assert.throws(() => applyStructuredCommand(value, { type: "DELETE_BLOCK", index: 3 }), /UNSUPPORTED STRUCTURED OPERATION/);
  assert.deepEqual(value, [paragraph("A"), paragraph("B")]);
});

test("plain-text paste deterministically creates paragraph and list blocks", () => {
  const blocks = plainTextToCanonicalBlocks("Mở đầu\n- Điểm a\n- Điểm b\nKết thúc");
  assert.deepEqual(blocks.map((block) => block.kind), ["PARAGRAPH", "LIST", "PARAGRAPH"]);
  assert.equal(blocks[1].kind === "LIST" ? blocks[1].items.length : 0, 2);
});

test("undo/redo is session-local and resets future after a new command", () => {
  const history = new StructuredUndoHistory([paragraph("A")]);
  history.execute({ type: "INSERT_BLOCK", index: 1, block: paragraph("B") });
  assert.equal(history.current().length, 2);
  assert.equal(history.undo().length, 1);
  assert.equal(history.redo().length, 2);
  history.undo();
  history.execute({ type: "INSERT_BLOCK", index: 1, block: paragraph("C") });
  assert.equal(history.canRedo(), false);
});

test("normalization preserves TABLE and FIGURE identities and metadata", () => {
  const content: LegalContentBlock[] = [
    { kind: "TABLE", tableId: "00000000-0000-4000-8000-000000000010", metadata: { retained: true }, rows: [{ id: "00000000-0000-4000-8000-000000000011", cells: [{ id: "00000000-0000-4000-8000-000000000012", blocks: [{ kind: "PARAGRAPH", spans: [{ text: "Ô" }] }] }] }] },
    { kind: "FIGURE", figureId: "00000000-0000-4000-8000-000000000020", asset: { assetId: "00000000-0000-4000-8000-000000000021", assetVersionId: "00000000-0000-4000-8000-000000000022", mediaType: "image/png", byteSize: 1, checksum: { algorithm: "SHA-256", value: "a".repeat(64) } }, alternativeText: "Hình", verificationStatus: "VERIFIED", displayRoleCode: "INLINE", metadata: { retained: true } },
  ];
  assert.deepEqual(normalizeContent(content), content);
});

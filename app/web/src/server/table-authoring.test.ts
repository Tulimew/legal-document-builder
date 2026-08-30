import assert from "node:assert/strict";
import test from "node:test";
import { addTableColumn, addTableRow, buildTableGrid, createTable, deleteTableColumn, deleteTableRow, mergeTableCells, moveTableColumn, moveTableRow, splitTableCell } from "@/lib/table-authoring";

test("create/add/delete/reorder table preserves unaffected stable IDs", () => {
  let table = createTable(2, 2); const firstRow = table.rows[0].id, firstCell = table.rows[0].cells[0].id;
  table = addTableRow(table); table = addTableColumn(table);
  assert.deepEqual(buildTableGrid(table), { width: 3, height: 3, owners: buildTableGrid(table).owners });
  table = moveTableRow(table, 0, 1); table = moveTableColumn(table, 0, 1);
  assert.equal(table.rows[1].id, firstRow); assert.equal(table.rows[1].cells[1].id, firstCell);
  table = deleteTableRow(table, 2); table = deleteTableColumn(table, 2);
  assert.equal(buildTableGrid(table).width, 2); assert.equal(buildTableGrid(table).height, 2);
});

test("merge/split retains origin ID and all cell content", () => {
  let table = createTable(2, 2); table.rows[0].cells[0].blocks[0].spans[0].text = "A"; table.rows[0].cells[1].blocks[0].spans[0].text = "B";
  const originId = table.rows[0].cells[0].id;
  table = mergeTableCells(table, 0, 0, 1, 2);
  assert.equal(buildTableGrid(table).width, 2); assert.equal(table.rows[0].cells[0].id, originId); assert.deepEqual(table.rows[0].cells[0].blocks.map((block) => block.spans[0].text), ["A", "B"]);
  table = splitTableCell(table, originId); assert.equal(table.rows[0].cells[0].id, originId); assert.equal(table.rows[0].cells.length, 2);
});

test("invalid topology and unsafe spanned reorder are rejected without mutation", () => {
  const table = createTable(2, 2), original = structuredClone(table); table.rows[0].cells[0].rowSpan = 3;
  assert.throws(() => buildTableGrid(table), /INVALID_TABLE_TOPOLOGY/);
  assert.deepEqual(original.rows[1], table.rows[1]);
  const merged = mergeTableCells(original, 0, 0, 2, 1);
  assert.throws(() => moveTableRow(merged, 0, 1), /split/);
});

import type { ParagraphBlock, TableBlock, TableCell } from "@legal-document-builder/contracts";

export interface TableGrid { width: number; height: number; owners: TableCell[][] }
const emptyParagraph = (): ParagraphBlock => ({ kind: "PARAGRAPH", spans: [{ text: "" }] });
const cell = (): TableCell => ({ id: crypto.randomUUID(), blocks: [emptyParagraph()] });

export function createTable(rows = 2, columns = 2): TableBlock {
  if (!Number.isSafeInteger(rows) || !Number.isSafeInteger(columns) || rows < 1 || columns < 1) throw new Error("INVALID_TABLE_TOPOLOGY: kích thước bảng phải là số nguyên dương.");
  return { kind: "TABLE", tableId: crypto.randomUUID(), rows: Array.from({ length: rows }, () => ({ id: crypto.randomUUID(), cells: Array.from({ length: columns }, cell) })) };
}

export function buildTableGrid(table: TableBlock): TableGrid {
  if (table.rows.length === 0) return { width: 0, height: 0, owners: [] };
  const owners: TableCell[][] = Array.from({ length: table.rows.length }, () => []);
  let width = 0;
  table.rows.forEach((row, rowIndex) => {
    let column = 0;
    for (const item of row.cells) {
      while (owners[rowIndex][column]) column += 1;
      const rowSpan = item.rowSpan ?? 1, columnSpan = item.columnSpan ?? 1;
      if (!Number.isSafeInteger(rowSpan) || !Number.isSafeInteger(columnSpan) || rowSpan < 1 || columnSpan < 1 || rowIndex + rowSpan > table.rows.length) throw new Error("INVALID_TABLE_TOPOLOGY: span không hợp lệ hoặc vượt biên.");
      for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
        const targetRow = rowIndex + rowOffset, targetColumn = column + columnOffset;
        if (owners[targetRow][targetColumn]) throw new Error("INVALID_TABLE_TOPOLOGY: các cell span bị overlap.");
        owners[targetRow][targetColumn] = item;
      }
      column += columnSpan; width = Math.max(width, column);
    }
  });
  if (owners.some((row) => row.length !== width || row.some((owner) => !owner))) throw new Error("INVALID_TABLE_TOPOLOGY: bảng phải là lưới chữ nhật không có khoảng trống.");
  return { width, height: owners.length, owners };
}

function atomic(table: TableBlock): void {
  buildTableGrid(table);
  if (table.rows.some((row) => row.cells.some((item) => (item.rowSpan ?? 1) !== 1 || (item.columnSpan ?? 1) !== 1))) throw new Error("UNSUPPORTED STRUCTURED OPERATION: thao tác này yêu cầu split các merged cell liên quan trước.");
}

export function addTableRow(table: TableBlock, index = table.rows.length): TableBlock {
  const grid = buildTableGrid(table); if (index !== table.rows.length) atomic(table);
  if (!Number.isSafeInteger(index) || index < 0 || index > table.rows.length) throw new Error("INVALID_TABLE_TOPOLOGY: vị trí hàng ngoài phạm vi.");
  const width = Math.max(grid.width, 1), rows = structuredClone(table.rows);
  rows.splice(index, 0, { id: crypto.randomUUID(), cells: Array.from({ length: width }, cell) });
  return { ...structuredClone(table), rows };
}

export function deleteTableRow(table: TableBlock, index: number): TableBlock {
  atomic(table); if (table.rows.length <= 1) throw new Error("INVALID_TABLE_TOPOLOGY: bảng phải còn ít nhất một hàng.");
  if (!Number.isSafeInteger(index) || index < 0 || index >= table.rows.length) throw new Error("INVALID_TABLE_TOPOLOGY: vị trí hàng ngoài phạm vi.");
  return { ...structuredClone(table), rows: table.rows.filter((_, rowIndex) => rowIndex !== index) };
}

export function moveTableRow(table: TableBlock, from: number, to: number): TableBlock {
  atomic(table); const rows = structuredClone(table.rows);
  if (![from, to].every((value) => Number.isSafeInteger(value) && value >= 0 && value < rows.length)) throw new Error("INVALID_TABLE_TOPOLOGY: vị trí hàng ngoài phạm vi.");
  const [row] = rows.splice(from, 1); rows.splice(to, 0, row); return { ...structuredClone(table), rows };
}

export function addTableColumn(table: TableBlock, index?: number): TableBlock {
  const grid = buildTableGrid(table), target = index ?? grid.width; if (target !== grid.width) atomic(table);
  if (target < 0 || target > grid.width) throw new Error("INVALID_TABLE_TOPOLOGY: vị trí cột ngoài phạm vi.");
  return { ...structuredClone(table), rows: table.rows.map((row) => { const cells = structuredClone(row.cells); cells.splice(target, 0, cell()); return { ...row, cells }; }) };
}

export function deleteTableColumn(table: TableBlock, index: number): TableBlock {
  const grid = buildTableGrid(table); atomic(table); if (grid.width <= 1) throw new Error("INVALID_TABLE_TOPOLOGY: bảng phải còn ít nhất một cột.");
  if (!Number.isSafeInteger(index) || index < 0 || index >= grid.width) throw new Error("INVALID_TABLE_TOPOLOGY: vị trí cột ngoài phạm vi.");
  return { ...structuredClone(table), rows: table.rows.map((row) => ({ ...row, cells: row.cells.filter((_, columnIndex) => columnIndex !== index) })) };
}

export function moveTableColumn(table: TableBlock, from: number, to: number): TableBlock {
  const grid = buildTableGrid(table); atomic(table);
  if (![from, to].every((value) => Number.isSafeInteger(value) && value >= 0 && value < grid.width)) throw new Error("INVALID_TABLE_TOPOLOGY: vị trí cột ngoài phạm vi.");
  return { ...structuredClone(table), rows: table.rows.map((row) => { const cells = structuredClone(row.cells); const [item] = cells.splice(from, 1); cells.splice(to, 0, item); return { ...row, cells }; }) };
}

export function mergeTableCells(table: TableBlock, startRow: number, startColumn: number, rowSpan: number, columnSpan: number): TableBlock {
  const grid = buildTableGrid(table); atomic(table);
  if (rowSpan < 1 || columnSpan < 1 || (rowSpan === 1 && columnSpan === 1) || startRow < 0 || startColumn < 0 || startRow + rowSpan > grid.height || startColumn + columnSpan > grid.width) throw new Error("INVALID_TABLE_TOPOLOGY: vùng merge không hợp lệ.");
  const rows = structuredClone(table.rows), retained = rows[startRow].cells[startColumn];
  const mergedBlocks: ParagraphBlock[] = [];
  for (let rowIndex = startRow; rowIndex < startRow + rowSpan; rowIndex += 1) for (let columnIndex = startColumn; columnIndex < startColumn + columnSpan; columnIndex += 1) mergedBlocks.push(...rows[rowIndex].cells[columnIndex].blocks);
  retained.blocks = mergedBlocks.length > 0 ? mergedBlocks : [emptyParagraph()]; retained.rowSpan = rowSpan; retained.columnSpan = columnSpan;
  for (let rowIndex = startRow; rowIndex < startRow + rowSpan; rowIndex += 1) rows[rowIndex].cells = rows[rowIndex].cells.filter((_, columnIndex) => columnIndex < startColumn || columnIndex >= startColumn + columnSpan || (rowIndex === startRow && columnIndex === startColumn));
  const result = { ...structuredClone(table), rows }; buildTableGrid(result); return result;
}

export function splitTableCell(table: TableBlock, cellId: string): TableBlock {
  const grid = buildTableGrid(table), originRow = table.rows.findIndex((row) => row.cells.some((item) => item.id === cellId));
  if (originRow < 0) throw new Error("INVALID_TABLE_TOPOLOGY: cell không tồn tại.");
  const originCellIndex = table.rows[originRow].cells.findIndex((item) => item.id === cellId), origin = table.rows[originRow].cells[originCellIndex], rowSpan = origin.rowSpan ?? 1, columnSpan = origin.columnSpan ?? 1;
  if (rowSpan === 1 && columnSpan === 1) throw new Error("UNSUPPORTED STRUCTURED OPERATION: cell chưa được merge.");
  const startColumn = grid.owners[originRow].findIndex((owner) => owner.id === cellId), rows = structuredClone(table.rows);
  const retained = rows[originRow].cells[originCellIndex]; delete retained.rowSpan; delete retained.columnSpan;
  for (let rowIndex = originRow; rowIndex < originRow + rowSpan; rowIndex += 1) {
    const additions: Array<{ column: number; value: TableCell }> = [];
    for (let columnIndex = startColumn; columnIndex < startColumn + columnSpan; columnIndex += 1) if (!(rowIndex === originRow && columnIndex === startColumn)) additions.push({ column: columnIndex, value: cell() });
    for (const addition of additions) rows[rowIndex].cells.splice(addition.column, 0, addition.value);
  }
  const result = { ...structuredClone(table), rows }; buildTableGrid(result); return result;
}

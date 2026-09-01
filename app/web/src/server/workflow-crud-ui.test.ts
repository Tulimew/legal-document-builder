import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("workflow UI exposes add, edit and audited soft-delete actions", async () => {
  const source = await readFile(path.resolve(process.cwd(), "src/components/workflow/workflow-workbench.tsx"), "utf8");
  assert.match(source, /Thêm bước/);
  assert.match(source, /Chỉnh sửa/);
  assert.match(source, />Xóa</);
  assert.match(source, /method:"PATCH"/);
  assert.match(source, /status:"CANCELLED"/);
  assert.match(source, /không bị xóa vật lý/);
  assert.doesNotMatch(source, /method:"DELETE"/);
});

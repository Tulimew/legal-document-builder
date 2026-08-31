import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(process.cwd());

test("M8 canonical project shell carries route-scoped identity", () => {
  const files = [
    "src/components/product-shell/project-home.tsx",
    "src/components/product-shell/project-overview.tsx",
    "src/components/product-shell/project-editor.tsx",
    "src/components/product-shell/project-navigation.tsx",
  ];
  const source = files.map((file) => readFileSync(path.join(root, file), "utf8")).join("\n");
  assert.match(source, /projectId/);
  assert.match(source, /workspaceId/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_SAMPLE|mock-data|localStorage|prototype-store/);
});

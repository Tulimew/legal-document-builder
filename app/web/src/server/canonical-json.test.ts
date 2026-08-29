import assert from "node:assert/strict";
import test from "node:test";

import { canonicalJson, canonicalSha256, verifyCanonicalSha256 } from "./canonical-json";

test("cùng semantic object khác insertion order có cùng checksum", () => {
  const first = { contractVersion: "1.1", metadata: { alpha: 1, beta: 2 }, nodes: [] };
  const second = { nodes: [], metadata: { beta: 2, alpha: 1 }, contractVersion: "1.1" };
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.equal(canonicalSha256(first), canonicalSha256(second));
});

test("canonical JSON sắp key lồng nhau nhưng giữ array order", () => {
  assert.equal(canonicalJson({ z: [{ b: 2, a: 1 }, "sau", "trước"] }), '{"z":[{"a":1,"b":2},"sau","trước"]}');
});

test("checksum hỗ trợ Unicode tiếng Việt và verify", () => {
  const value = { nộiDung: "Điều 1. Trách nhiệm phối hợp", metadata: { ngônNgữ: "vi" } };
  const checksum = canonicalSha256(value);
  assert.equal(checksum.length, 64);
  assert.equal(verifyCanonicalSha256(value, checksum), true);
});

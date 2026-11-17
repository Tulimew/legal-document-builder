import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_CHECKSUM_ALGORITHM,
  canonicalJson,
  canonicalSha256,
  LEGACY_CANONICAL_CHECKSUM_ALGORITHM,
  legacyCanonicalJson,
  legacyCanonicalSha256,
  RFC8785_CHECKSUM_ALGORITHM,
  verifyCanonicalSha256,
} from "./canonical-json";

// ============================================================================
// 1. ORIGINAL BASELINE TESTS (BACKWARD COMPATIBILITY)
// ============================================================================

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

// ============================================================================
// 2. STANDARD RFC 8785 & UNIFIED LEGAL HUB 16 TEST VECTORS
// ============================================================================

interface TestVector {
  id: string;
  name: string;
  source: string;
  input: unknown;
  canonical: string;
  bytes: number;
  sha256: string;
}

const RFC8785_VECTORS: TestVector[] = [
  {
    id: "VEC-01",
    name: "Object key reordering",
    source: "RFC 8785 Section 3.2.3 / IETF JCS Test Suite",
    input: { z: 1, a: 2, m: 3 },
    canonical: '{"a":2,"m":3,"z":1}',
    bytes: 19,
    sha256: "ebba85cfdc0a724b6cc327ecc545faeb38b9fe02eca603b430eb872f5cf75370",
  },
  {
    id: "VEC-02",
    name: "Array element order preservation",
    source: "RFC 8785 Section 3.2.1 / IETF JCS Test Suite",
    input: { list: [3, 1, 2] },
    canonical: '{"list":[3,1,2]}',
    bytes: 16,
    sha256: "e1a0b6138e48437b9d08d505c4b902f063d221a38a0e13b9c5605d8ab1f4545d",
  },
  {
    id: "VEC-03",
    name: "Vietnamese diacritics Unicode string",
    source: "Unified Legal Hub Legal Fixture Pack / RFC 8785 Section 3.2.2.2",
    input: { dieu: "Điều 1. Phạm vi" },
    canonical: '{"dieu":"Điều 1. Phạm vi"}',
    bytes: 31,
    sha256: "a0bb375b6148926918cd097cb98ee034dcdfa5db12cb2b4e572a267f51df8e99",
  },
  {
    id: "VEC-04",
    name: "Non-BMP astral plane characters",
    source: "RFC 8785 Section 3.2.2.2 / Unicode 15.0 Astral Characters",
    input: { icon: "📜", law: "⚖️" },
    canonical: '{"icon":"📜","law":"⚖️"}',
    bytes: 30,
    sha256: "b7d587f06a73b091d0a90fb12df658ec835bcf45ccf4a03ac4632b702e34bbf9",
  },
  {
    id: "VEC-05",
    name: "Explicit NFC string representation",
    source: "Unified Legal Hub Legal Fixture Pack / Unicode NFC Representation",
    input: { nfc: "Việt" },
    canonical: '{"nfc":"Việt"}',
    bytes: 16,
    sha256: "1d54c6f5214a37a398c9ad043040e6b1f2614b22e4ff21a4cdcd8b469a1e23d0",
  },
  {
    id: "VEC-06",
    name: "Integer and zero formatting",
    source: "RFC 8785 Section 3.2.2.3 Numbers",
    input: { num: 100, val: 0 },
    canonical: '{"num":100,"val":0}',
    bytes: 19,
    sha256: "588f6dc0d48930adae10d6af3379f7786d9df23dbb7bcff86c0189c32713096c",
  },
  {
    id: "VEC-07",
    name: "Floating point shortest representation",
    source: "RFC 8785 Section 3.2.2.3 / IEEE 754-2008 Shortest Round-trip",
    input: { float: 12.34, rate: 0.5 },
    canonical: '{"float":12.34,"rate":0.5}',
    bytes: 26,
    sha256: "27105fd9a17b9f1d4e151361b67d4df53517146a36f510c849a08b6f8e2fd863",
  },
  {
    id: "VEC-08",
    name: "Negative numbers",
    source: "RFC 8785 Section 3.2.2.3 Numbers",
    input: { temp: -15, diff: -0.75 },
    canonical: '{"diff":-0.75,"temp":-15}',
    bytes: 25,
    sha256: "30e38ff5cda72fa6d473d9e44684226eb7f948cc3e19f8c10407e6d9774955d9",
  },
  {
    id: "VEC-09",
    name: "Negative zero normalization to zero",
    source: "RFC 8785 Section 3.2.2.3 / ECMAScript ToString(-0)",
    input: { zero: -0.0, pos: 0 },
    canonical: '{"pos":0,"zero":0}',
    bytes: 18,
    sha256: "e66e9dd03302f58eb5f13655f86f71026b0c9948118e61692b63ad6a1456b14b",
  },
  {
    id: "VEC-10",
    name: "Exponential number serialization",
    source: "RFC 8785 Section 3.2.2.3 Exponential Form",
    input: { exp: 10000, small: 0.001 },
    canonical: '{"exp":10000,"small":0.001}',
    bytes: 27,
    sha256: "4f0ac4abc9933684469c29e71643070f209b2d3359c09963b21d8b7e152e9e17",
  },
  {
    id: "VEC-11",
    name: "Null value preservation",
    source: "RFC 8785 Section 3.2.1 Literals",
    input: { item: null, code: "VB01" },
    canonical: '{"code":"VB01","item":null}',
    bytes: 27,
    sha256: "6fdd4833306574f0704e5e278114cdfb0946811f607b276c2e65fe70b4b7b1c8",
  },
  {
    id: "VEC-12",
    name: "Nested objects and arrays",
    source: "RFC 8785 Section 3.2 Recursive Data Structures",
    input: { b: { y: 2, x: 1 }, a: [true, false] },
    canonical: '{"a":[true,false],"b":{"x":1,"y":2}}',
    bytes: 36,
    sha256: "714f23be16ebbc512bf2930e8e108b51ed91e83227d8a7c21605d182c910dc10",
  },
  {
    id: "VEC-13",
    name: "Special character escaping",
    source: "RFC 8785 Section 3.2.2.2 String Escaping Rules",
    input: { text: 'Dòng 1\nDòng 2\t"Trích"\\X' },
    canonical: '{"text":"Dòng 1\\nDòng 2\\t\\"Trích\\"\\\\X"}',
    bytes: 42,
    sha256: "9b7f04b187203dd69c8a1e4a397b147bc6695580609fdc06b61df93c9b67e2fe",
  },
  {
    id: "VEC-14",
    name: "Empty string values",
    source: "RFC 8785 Section 3.2.2.2 Empty Strings",
    input: { name: "", notes: "" },
    canonical: '{"name":"","notes":""}',
    bytes: 22,
    sha256: "b98f455b7661d4f3f94df5006eecb9cba99fb852a7820ceef64ca76b3bc78450",
  },
  {
    id: "VEC-15",
    name: "Discrepancy Candidate A (76 bytes)",
    source: "Unified Legal Hub R1.3.1 Audit Reconciliation Candidate A",
    input: { a: "tiếng Việt có dấu: Điều 1", b: [3, 2, 1], c: null, d: 0, z: 1 },
    canonical: '{"a":"tiếng Việt có dấu: Điều 1","b":[3,2,1],"c":null,"d":0,"z":1}',
    bytes: 76,
    sha256: "a104b64d509f6f95c6e2fecaf4a2aaf7e73f9cce16f78ffb681e9502e563dc8c",
  },
  {
    id: "VEC-16",
    name: "Discrepancy Candidate B (103 bytes)",
    source: "Unified Legal Hub R1.3.1 Audit Reconciliation Candidate B",
    input: { a: "tiếng Việt có dấu: Điều 1. Phạm vi điều chỉnh", b: [3, 2, 1], c: null, d: 0, z: 1 },
    canonical: '{"a":"tiếng Việt có dấu: Điều 1. Phạm vi điều chỉnh","b":[3,2,1],"c":null,"d":0,"z":1}',
    bytes: 103,
    sha256: "3f682e470211e107f5cb8e5db44f10ce57ad59578bc8cb2c4d534ef4f90c5760",
  },
];

for (const vec of RFC8785_VECTORS) {
  test(`RFC 8785 Vector [${vec.id}] ${vec.name} (${vec.source})`, () => {
    const serialized = canonicalJson(vec.input);
    assert.equal(serialized, vec.canonical);

    const buf = Buffer.from(serialized, "utf8");
    assert.equal(buf.length, vec.bytes);

    const hash = canonicalSha256(vec.input);
    assert.equal(hash, vec.sha256);

    assert.equal(verifyCanonicalSha256(vec.input, vec.sha256), true);
    assert.equal(verifyCanonicalSha256(vec.input, vec.sha256, "RFC8785_JCS"), true);
  });
}

// ============================================================================
// 3. R1 — UNICODE VALIDITY & SURROGATE REJECTION
// ============================================================================

test("R1: từ chối lone high surrogate tại cuối chuỗi", () => {
  assert.throws(() => canonicalJson("chuỗi không hợp lệ \uD800"), TypeError);
  assert.throws(() => canonicalJson({ field: "bad \uD83D" }), TypeError);
});

test("R1: từ chối lone high surrogate theo sau bởi ký tự BMP thông thường", () => {
  assert.throws(() => canonicalJson("bad \uD800A"), TypeError);
  assert.throws(() => canonicalJson({ key: "\uD83Dabc" }), TypeError);
});

test("R1: từ chối lone low surrogate", () => {
  assert.throws(() => canonicalJson("bad \uDC00"), TypeError);
  assert.throws(() => canonicalJson({ field: "\uDCDC" }), TypeError);
});

test("R1: từ chối cặp surrogate bị đảo ngược (low trước high)", () => {
  assert.throws(() => canonicalJson("\uDCDC\uD83D"), TypeError);
  assert.throws(() => canonicalJson({ text: "\uDFFF\uD800" }), TypeError);
});

test("R1: từ chối lone surrogate trong property name của object", () => {
  assert.throws(() => canonicalJson({ "bad\uD800name": 1 }), TypeError);
  assert.throws(() => canonicalJson({ "\uDC00": 2 }), TypeError);
  assert.throws(() => canonicalJson({ "\uDCDC\uD83D": 3 }), TypeError);
});

test("R1: chấp nhận cặp surrogate hợp lệ biểu diễn ký tự Astral Plane (Emoji, chữ Hán cổ)", () => {
  // 📜 (U+1F4DC): \uD83D\uDCDC
  // ⚖️ (U+2696 U+FE0F): BMP + Variation Selector
  // 𠮷 (U+20BB7): \uD842\uDFB7 (chữ Hán ngoài BMP)
  const validSurrogates = {
    emoji: "📜",
    scale: "⚖️",
    kanji: "𠮷",
  };
  const serialized = canonicalJson(validSurrogates);
  assert.equal(serialized, '{"emoji":"📜","kanji":"𠮷","scale":"⚖️"}');
});

test("R1: không tự động chuẩn hóa Unicode NFC / NFD (bảo toàn nguyên vẹn mã byte)", () => {
  const nfc = "Việt"; // U+0056 U+0069 U+1EC7 U+0074 (6 bytes UTF-8)
  const nfd = nfc.normalize("NFD"); // U+0056 U+0069 U+0065 U+0323 U+0302 U+0074 (8 bytes UTF-8)

  assert.notEqual(nfc, nfd);
  const outNfc = canonicalJson({ text: nfc });
  const outNfd = canonicalJson({ text: nfd });

  assert.equal(Buffer.from(outNfc, "utf8").length, 17);
  assert.equal(Buffer.from(outNfd, "utf8").length, 19);
  assert.notEqual(outNfc, outNfd);
  assert.notEqual(canonicalSha256({ text: nfc }), canonicalSha256({ text: nfd }));
});

// ============================================================================
// 4. R2 — JSON DATA MODEL VALIDATION & STRICT REJECTIONS
// ============================================================================

test("R2: từ chối undefined tại top-level", () => {
  assert.throws(() => canonicalJson(undefined), TypeError);
});

test("R2: từ chối undefined trong thuộc tính của object (không âm thầm bỏ qua)", () => {
  assert.throws(() => canonicalJson({ a: undefined, b: 1 }), TypeError);
  assert.throws(() => canonicalJson({ nested: { x: undefined } }), TypeError);
});

test("R2: từ chối undefined trong mảng (không âm thầm chuyển thành null)", () => {
  assert.throws(() => canonicalJson([1, undefined, 2]), TypeError);
  assert.throws(() => canonicalJson([undefined]), TypeError);
});

test("R2: từ chối mảng thưa (sparse array có holes)", () => {
  const sparse1 = [1, , 3];
  const sparse2 = new Array(3);
  assert.throws(() => canonicalJson(sparse1), TypeError);
  assert.throws(() => canonicalJson(sparse2), TypeError);
  assert.throws(() => canonicalJson({ list: sparse1 }), TypeError);
});

test("R2: từ chối Date, Map, Set, RegExp, Buffer, TypedArray và custom class instance", () => {
  assert.throws(() => canonicalJson(new Date()), TypeError);
  assert.throws(() => canonicalJson({ createdAt: new Date() }), TypeError);

  assert.throws(() => canonicalJson(new Map()), TypeError);
  assert.throws(() => canonicalJson({ data: new Map([["a", 1]]) }), TypeError);

  assert.throws(() => canonicalJson(new Set([1, 2])), TypeError);
  assert.throws(() => canonicalJson({ tags: new Set() }), TypeError);

  assert.throws(() => canonicalJson(Buffer.from("test")), TypeError);
  assert.throws(() => canonicalJson({ buf: Buffer.from("test") }), TypeError);

  assert.throws(() => canonicalJson(new Uint8Array([1, 2, 3])), TypeError);
  assert.throws(() => canonicalJson(/regex/), TypeError);

  class CustomLegalEntity {
    name = "Bộ Tư pháp";
  }
  assert.throws(() => canonicalJson(new CustomLegalEntity()), TypeError);
});

test("R2: chấp nhận đối tượng plain object có prototype null (Object.create(null))", () => {
  const nullProto: Record<string, unknown> = Object.create(null);
  nullProto.b = 2;
  nullProto.a = 1;
  assert.equal(canonicalJson(nullProto), '{"a":1,"b":2}');
});

test("R2: từ chối kiểu BigInt, Symbol và Function", () => {
  assert.throws(() => canonicalJson(BigInt(123456789)), TypeError);
  assert.throws(() => canonicalJson({ num: BigInt(1) }), TypeError);

  assert.throws(() => canonicalJson(Symbol("secret")), TypeError);
  assert.throws(() => canonicalJson({ s: Symbol("foo") }), TypeError);

  assert.throws(() => canonicalJson(() => {}), TypeError);
  assert.throws(() => canonicalJson({ fn: () => {} }), TypeError);
});

test("R2: từ chối tham chiếu vòng (cyclic references) trong object và array", () => {
  const cyclicObj: Record<string, unknown> = { name: "loop" };
  cyclicObj.self = cyclicObj;
  assert.throws(() => canonicalJson(cyclicObj), TypeError);

  const cyclicArr: unknown[] = [1, 2];
  cyclicArr.push(cyclicArr);
  assert.throws(() => canonicalJson(cyclicArr), TypeError);

  const mutualA: Record<string, unknown> = { id: "A" };
  const mutualB: Record<string, unknown> = { id: "B", refA: mutualA };
  mutualA.refB = mutualB;
  assert.throws(() => canonicalJson(mutualA), TypeError);
});

// ============================================================================
// 5. NUMERIC EDGE CASES & STRING ESCAPING (RFC 8785)
// ============================================================================

test("sắp xếp khóa số theo UTF-16 code units (không bị lỗi V8 integer keys)", () => {
  // Trong V8, key "10" và "2" mặc định duyệt theo số ("2" trước "10")
  // RFC 8785 bắt buộc thứ tự UTF-16 code units: ký tự '1' (0x31) < '2' (0x32) -> "10" trước "2"
  const input = { "10": "ten", "2": "two", "1": "one" };
  assert.equal(canonicalJson(input), '{"1":"one","10":"ten","2":"two"}');
});

test("dấu gạch chéo xuôi / (solidus) TUYỆT ĐỐI KHÔNG BỊ THOÁT per RFC 8785", () => {
  const input = { url: "https://example.com/api/v1?a=1&b=2/test" };
  assert.equal(canonicalJson(input), '{"url":"https://example.com/api/v1?a=1&b=2/test"}');
});

test("thoát đúng toàn bộ ký tự điều khiển U+0000..U+001F", () => {
  const input = { ctrl: "\u0000\u001f\b\f\n\r\t" };
  assert.equal(canonicalJson(input), '{"ctrl":"\\u0000\\u001f\\b\\f\\n\\r\\t"}');
});

test("chuẩn hóa số âm không: Object.is(-0) thành 0", () => {
  assert.equal(canonicalJson(-0), "0");
  assert.equal(canonicalJson({ a: -0, b: 0 }), '{"a":0,"b":0}');
});

test("từ chối số không hữu hạn: NaN, Infinity, -Infinity", () => {
  assert.throws(() => canonicalJson(NaN), TypeError);
  assert.throws(() => canonicalJson(Infinity), TypeError);
  assert.throws(() => canonicalJson(-Infinity), TypeError);
  assert.throws(() => canonicalJson({ val: NaN }), TypeError);
  assert.throws(() => canonicalJson([1, Infinity]), TypeError);
});

// ============================================================================
// 6. R3 — HASH VERIFICATION POLICY & DUAL-ALGORITHM FALLBACK
// ============================================================================

test("R3: chính sách xác minh checksum có algorithm marker tường minh và fallback", () => {
  // Đối tượng có numeric keys để phân biệt tuyệt đối giữa Legacy V1 và RFC 8785 JCS
  const sample = { "10": 1, "2": 2 };
  const legacyString = legacyCanonicalJson(sample);
  assert.equal(legacyString, '{"2":2,"10":1}');
  const jcsString = canonicalJson(sample);
  assert.equal(jcsString, '{"10":1,"2":2}');

  const legacyHash = legacyCanonicalSha256(sample);
  const jcsHash = canonicalSha256(sample);
  assert.notEqual(legacyHash, jcsHash);

  // 1. Xác minh có algorithm marker tường minh:
  assert.equal(verifyCanonicalSha256(sample, jcsHash, "RFC8785_JCS"), true);
  assert.equal(verifyCanonicalSha256(sample, jcsHash, "RFC8785"), true);
  assert.equal(verifyCanonicalSha256(sample, legacyHash, "CANONICAL_JSON_V1_SHA256"), true);
  assert.equal(verifyCanonicalSha256(sample, legacyHash, "RFC8785_JCS"), false); // Sai algorithm -> REJECT
  assert.equal(verifyCanonicalSha256(sample, jcsHash, "CANONICAL_JSON_V1_SHA256"), false); // Sai algorithm -> REJECT

  // 2. Xác minh unversioned qua dual-mode fallback:
  assert.equal(verifyCanonicalSha256(sample, jcsHash), true);
  assert.equal(verifyCanonicalSha256(sample, legacyHash), true);

  // 3. Từ chối checksum sai:
  assert.equal(verifyCanonicalSha256(sample, "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"), false);
});

test("R3: hằng số algorithm codes khớp với quy chuẩn dự án", () => {
  assert.equal(CANONICAL_CHECKSUM_ALGORITHM, "RFC8785_JCS");
  assert.equal(RFC8785_CHECKSUM_ALGORITHM, "RFC8785_JCS");
  assert.equal(LEGACY_CANONICAL_CHECKSUM_ALGORITHM, "CANONICAL_JSON_V1_SHA256");
});

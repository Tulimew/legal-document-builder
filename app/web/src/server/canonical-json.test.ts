import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CANONICAL_CHECKSUM_ALGORITHM,
  canonicalJson,
  canonicalSha256,
  createCanonicalChecksum,
  HISTORICAL_CHECKSUM_FALLBACK_SCOPES,
  type HistoricalFallbackContext,
  isAllowedHistoricalFallbackScope,
  isSupportedChecksumAlgorithm,
  LEGACY_CANONICAL_CHECKSUM_ALGORITHM,
  LEGACY_JSON_STRINGIFY_CHECKSUM_ALGORITHM,
  legacyCanonicalJson,
  legacyCanonicalSha256,
  legacyJsonStringify,
  legacyJsonStringifySha256,
  SUPPORTED_CHECKSUM_ALGORITHMS,
  verifyCanonicalSha256,
  verifyHistoricalChecksumWithoutMarker,
} from "./canonical-json";

interface ConformanceVector {
  id: string;
  category: "RFC_8785" | "ULH_INTERNAL" | "EDGE_CASE";
  source: string;
  name: string;
  input: unknown;
  canonical: string;
  bytes: number;
  sha256: string;
  expectedUtf8Hex?: string;
}

interface AppendixBNumberVector {
  id: string;
  source: string;
  name: string;
  ieee754Hex: string;
  canonical: string;
  bytes: number;
  sha256: string;
}

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

test("checksum hỗ trợ Unicode tiếng Việt và verify với marker tường minh", () => {
  const value = { nộiDung: "Điều 1. Trách nhiệm phối hợp", metadata: { ngônNgữ: "vi" } };
  const checksum = canonicalSha256(value);
  assert.equal(checksum.length, 64);
  assert.equal(verifyCanonicalSha256(value, checksum, CANONICAL_CHECKSUM_ALGORITHM), true);
  assert.equal(verifyCanonicalSha256(value, checksum), true);
});

// ============================================================================
// 2. OFFICIAL IETF RFC 8785 STRUCTURAL & SORTING VECTORS
// ============================================================================

const RFC8785_OFFICIAL_VECTORS: ConformanceVector[] = [
  {
    id: "RFC-323-STRUCT",
    category: "RFC_8785",
    source: "IETF RFC 8785 Section 3.2.2, 3.2.3 & 3.2.4",
    name: "Official multi-type canonicalization and verbatim UTF-8 byte sequence",
    input: {
      numbers: [333333333.3333333, 1e30, 4.5, 0.002, 1e-27],
      string: '€$\u000f\nA\'B"\\\\"/',
      literals: [null, true, false],
    },
    canonical: '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\\u000f\\nA\'B\\"\\\\\\\\\\"/"}',
    bytes: 118,
    sha256: "2d5e01a318d0f0879ab568c4be289c8b1f64ef8921a53c6277d5e069978baacb",
    expectedUtf8Hex:
      "7b226c69746572616c73223a5b6e756c6c2c747275652c66616c73655d2c226e756d62657273223a5b3333333333333333332e333333333333332c31652b33302c342e352c302e3030322c31652d32375d2c22737472696e67223a22e282ac245c75303030665c6e4127425c225c5c5c5c5c222f227d",
  },
  {
    id: "RFC-323-SORT",
    category: "RFC_8785",
    source: "IETF RFC 8785 Section 3.2.3 Sorting of Object Properties",
    name: "Official UTF-16 code unit property sorting (U+1F600 precedes U+FB33 in UTF-16)",
    input: {
      "\u20ac": "Euro Sign",
      "\r": "Carriage Return",
      "\ufb33": "Hebrew Letter Dalet With Dagesh",
      "1": "One",
      "\ud83d\ude00": "Emoji: Grinning Face",
      "\u0080": "Control",
      "\u00f6": "Latin Small Letter O With Diaeresis",
    },
    canonical:
      '{"\\r":"Carriage Return","1":"One","\u0080":"Control","\u00f6":"Latin Small Letter O With Diaeresis","\u20ac":"Euro Sign","\ud83d\ude00":"Emoji: Grinning Face","\ufb33":"Hebrew Letter Dalet With Dagesh"}',
    bytes: 180,
    sha256: "5e321556d22018a9656991a9e94f77ec175fa193e52a2429d312f8419ec8b08c",
    expectedUtf8Hex:
      "7b225c72223a2243617272696167652052657475726e222c2231223a224f6e65222c22c280223a22436f6e74726f6c222c22c3b6223a224c6174696e20536d616c6c204c6574746572204f205769746820446961657265736973222c22e282ac223a224575726f205369676e222c22f09f9880223a22456d6f6a693a204772696e6e696e672046616365222c22efacb3223a22486562726577204c65747465722044616c6574205769746820446167657368227d",
  },
];

for (const vec of RFC8785_OFFICIAL_VECTORS) {
  test(`[${vec.category}] ${vec.id}: ${vec.name}`, () => {
    const serialized = canonicalJson(vec.input);
    assert.equal(serialized, vec.canonical);

    const utf8Buf = Buffer.from(serialized, "utf8");
    assert.equal(utf8Buf.length, vec.bytes);
    if (vec.expectedUtf8Hex) {
      assert.equal(utf8Buf.toString("hex"), vec.expectedUtf8Hex);
    }

    const digest = canonicalSha256(vec.input);
    assert.equal(digest, vec.sha256);
    assert.equal(verifyCanonicalSha256(vec.input, vec.sha256, CANONICAL_CHECKSUM_ALGORITHM), true);
  });
}

test("[CLOSURE-01] RFC-323-SORT: xác minh chính xác code point U+0080 (UTF-8 c280) không bị biến đổi thành U+20AC (UTF-8 e282ac)", () => {
  const sortVector = RFC8785_OFFICIAL_VECTORS.find((v) => v.id === "RFC-323-SORT")!;
  const inputRecord = sortVector.input as Record<string, string>;

  // 1. Verify exact input code points (never rely on display glyphs)
  const controlKey = Object.keys(inputRecord).find((k) => inputRecord[k] === "Control");
  const euroKey = Object.keys(inputRecord).find((k) => inputRecord[k] === "Euro Sign");
  assert.ok(controlKey !== undefined);
  assert.ok(euroKey !== undefined);
  assert.equal(controlKey.codePointAt(0), 0x0080);
  assert.equal(euroKey.codePointAt(0), 0x20ac);
  assert.notEqual(controlKey, euroKey);

  // 2. Verify canonical output code points and exact UTF-8 byte sequences
  const serialized = canonicalJson(inputRecord);
  const parsedKeys = Object.keys(JSON.parse(serialized) as Record<string, string>);
  // Note: JSON.parse preserves non-index insertion order; verify via regex/index order in raw canonical string
  const orderedCodePoints = [0x000d, 0x0031, 0x0080, 0x00f6, 0x20ac, 0x1f600, 0xfb33];
  const expectedValues = [
    "Carriage Return",
    "One",
    "Control",
    "Latin Small Letter O With Diaeresis",
    "Euro Sign",
    "Emoji: Grinning Face",
    "Hebrew Letter Dalet With Dagesh",
  ];
  assert.equal(parsedKeys.length, 7);

  let lastPos = -1;
  for (let i = 0; i < expectedValues.length; i++) {
    const pos = serialized.indexOf(`"${expectedValues[i]}"`);
    assert.ok(pos > lastPos, `Expected value "${expectedValues[i]}" to appear in strict RFC 8785 UTF-16 order.`);
    lastPos = pos;
  }

  // Verify raw UTF-8 bytes of the two keys directly in serialized output buffer
  const idxControlKey = serialized.indexOf('":"Control"') - 1;
  const idxEuroKey = serialized.indexOf('":"Euro Sign"') - 1;
  assert.equal(serialized.codePointAt(idxControlKey), 0x0080);
  assert.equal(serialized.codePointAt(idxEuroKey), 0x20ac);
  assert.equal(Buffer.from(serialized[idxControlKey], "utf8").toString("hex"), "c280");
  assert.equal(Buffer.from(serialized[idxEuroKey], "utf8").toString("hex"), "e282ac");

  // Verify exact UTF-16 code unit ordering of all 7 keys
  const serializedKeyCodePoints = [
    "\r",
    "1",
    serialized[idxControlKey],
    "\u00f6",
    serialized[idxEuroKey],
    "\ud83d\ude00",
    "\ufb33",
  ].map((k) => k.codePointAt(0));
  assert.deepEqual(serializedKeyCodePoints, orderedCodePoints);
});

// ============================================================================
// 3. OFFICIAL IETF RFC 8785 APPENDIX B — ALL 26 IEEE 754 NUMBER SAMPLES
// ============================================================================

const RFC8785_APPENDIX_B_FINITE: AppendixBNumberVector[] = [
  { id: "RFC-APPB-01", source: "IETF RFC 8785 Appendix B Table 1", name: "Zero", ieee754Hex: "0000000000000000", canonical: "0", bytes: 1, sha256: "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9" },
  { id: "RFC-APPB-02", source: "IETF RFC 8785 Appendix B Table 1", name: "Minus zero", ieee754Hex: "8000000000000000", canonical: "0", bytes: 1, sha256: "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9" },
  { id: "RFC-APPB-03", source: "IETF RFC 8785 Appendix B Table 1", name: "Min positive subnormal number", ieee754Hex: "0000000000000001", canonical: "5e-324", bytes: 6, sha256: "c46e7ca1be4c8734f373a56530787288fa2058d73d07855e9247e949f811a42a" },
  { id: "RFC-APPB-04", source: "IETF RFC 8785 Appendix B Table 1", name: "Min negative subnormal number", ieee754Hex: "8000000000000001", canonical: "-5e-324", bytes: 7, sha256: "046f4049d09944fcb2efbf2ddb0ea8f05e0204591d6d02c9106efc88190fa7f9" },
  { id: "RFC-APPB-05", source: "IETF RFC 8785 Appendix B Table 1", name: "Max positive finite number", ieee754Hex: "7fefffffffffffff", canonical: "1.7976931348623157e+308", bytes: 23, sha256: "c2784e1abd6317452708f3fbf9641c16b959561bc621a1d408c23a20aa2cb585" },
  { id: "RFC-APPB-06", source: "IETF RFC 8785 Appendix B Table 1", name: "Max negative finite number", ieee754Hex: "ffefffffffffffff", canonical: "-1.7976931348623157e+308", bytes: 24, sha256: "f0347276b171ff0c36491c912285a2833de7313d1a103a4b1be0274bfe7c021f" },
  { id: "RFC-APPB-07", source: "IETF RFC 8785 Appendix B Table 1", name: "Max pos int 2**53", ieee754Hex: "4340000000000000", canonical: "9007199254740992", bytes: 16, sha256: "c681da39d7273a6a24c15c9cac3a75526ff2ecf8ba4ee60346a0c70c8163bdb2" },
  { id: "RFC-APPB-08", source: "IETF RFC 8785 Appendix B Table 1", name: "Max neg int -2**53", ieee754Hex: "c340000000000000", canonical: "-9007199254740992", bytes: 17, sha256: "83e109bfd7fb4984b47a46f363627c18dbbd7e57e36b05a04cd162d304df72e9" },
  { id: "RFC-APPB-09", source: "IETF RFC 8785 Appendix B Table 1", name: "Approx 2**68", ieee754Hex: "4430000000000000", canonical: "295147905179352830000", bytes: 21, sha256: "7933ef1b34c194c7a327ef424e54282dd2872bc7bda27812f9edf7882ca340c0" },
  { id: "RFC-APPB-10", source: "IETF RFC 8785 Appendix B Table 1", name: "1e+23 minus 1 ULP", ieee754Hex: "44b52d02c7e14af5", canonical: "9.999999999999997e+22", bytes: 21, sha256: "143eadc1fc2fe10a563df313c717399d1835652d710fa189119ff2e1d5cde33d" },
  { id: "RFC-APPB-11", source: "IETF RFC 8785 Appendix B Table 1", name: "Exact 1e+23", ieee754Hex: "44b52d02c7e14af6", canonical: "1e+23", bytes: 5, sha256: "0b1af6b73e932475817f8eb620deecf21ad7570df3400a23db5c79a9001597f7" },
  { id: "RFC-APPB-12", source: "IETF RFC 8785 Appendix B Table 1", name: "1e+23 plus 1 ULP", ieee754Hex: "44b52d02c7e14af7", canonical: "1.0000000000000001e+23", bytes: 22, sha256: "de7cb5db5ee06bf7ef5b74ebcf94cd9d7efda28125905f7ff590724953173c7b" },
  { id: "RFC-APPB-13", source: "IETF RFC 8785 Appendix B Table 1", name: "1e+21 minus 2 ULP", ieee754Hex: "444b1ae4d6e2ef4e", canonical: "999999999999999700000", bytes: 21, sha256: "dcabf7269f6bb6ec5ba8b9530825cd7ffe215d4dd26e0a237f9d753513792c07" },
  { id: "RFC-APPB-14", source: "IETF RFC 8785 Appendix B Table 1", name: "1e+21 minus 1 ULP", ieee754Hex: "444b1ae4d6e2ef4f", canonical: "999999999999999900000", bytes: 21, sha256: "914b4f8b4bbe2f6e7c36ad7791fc842a7516d149e694b3a71b78cee465ff6d7a" },
  { id: "RFC-APPB-15", source: "IETF RFC 8785 Appendix B Table 1", name: "Exponential threshold 1e+21", ieee754Hex: "444b1ae4d6e2ef50", canonical: "1e+21", bytes: 5, sha256: "241c4643fa70b1dcde1205b71be4e3bebb17e9f880c8e1a33d0ead6c27271d3c" },
  { id: "RFC-APPB-16", source: "IETF RFC 8785 Appendix B Table 1", name: "Below 1e-6 threshold", ieee754Hex: "3eb0c6f7a0b5ed8c", canonical: "9.999999999999997e-7", bytes: 20, sha256: "2ace34b29d30d300aeacd4f2bb83367fa186f11a3f02ed461f35f00fd741a242" },
  { id: "RFC-APPB-17", source: "IETF RFC 8785 Appendix B Table 1", name: "Fixed-point threshold 1e-6", ieee754Hex: "3eb0c6f7a0b5ed8d", canonical: "0.000001", bytes: 8, sha256: "159fb29a827ad04b260aa6c8ab6d8637f8f2b38af5c4f3cb49d6a21205e040f8" },
  { id: "RFC-APPB-18", source: "IETF RFC 8785 Appendix B Table 1", name: "333333333.3333332", ieee754Hex: "41b3de4355555553", canonical: "333333333.3333332", bytes: 17, sha256: "0fdb7bafaf219ccaf278cd0c0a580473db01c774a0baafe72a07d01230ac5c6d" },
  { id: "RFC-APPB-19", source: "IETF RFC 8785 Appendix B Table 1", name: "333333333.33333325", ieee754Hex: "41b3de4355555554", canonical: "333333333.33333325", bytes: 18, sha256: "bcbe1777b7d3c91c19c7f90100c595a9b3f1d9b395567da4258baf7ac655d403" },
  { id: "RFC-APPB-20", source: "IETF RFC 8785 Appendix B Table 1", name: "333333333.3333333", ieee754Hex: "41b3de4355555555", canonical: "333333333.3333333", bytes: 17, sha256: "6bd9be1c141028789cc35db62f1b43e80d5d4ee24d6d542e775deb16799ff4c7" },
  { id: "RFC-APPB-21", source: "IETF RFC 8785 Appendix B Table 1", name: "333333333.3333334", ieee754Hex: "41b3de4355555556", canonical: "333333333.3333334", bytes: 17, sha256: "1e099031ca0cb3cf4054688f7e2e8c95fc72828de5fa7605ce3f729e6cf79d43" },
  { id: "RFC-APPB-22", source: "IETF RFC 8785 Appendix B Table 1", name: "333333333.33333343", ieee754Hex: "41b3de4355555557", canonical: "333333333.33333343", bytes: 18, sha256: "cf68ab5e198a77538aafd967fb122a305ba1df95c9348b1fe3dff453c7f7215f" },
  { id: "RFC-APPB-23", source: "IETF RFC 8785 Appendix B Table 1", name: "Negative small fixed-point float", ieee754Hex: "becbf647612f3696", canonical: "-0.0000033333333333333333", bytes: 25, sha256: "4e703d4e0928e4f339d03e1fb5454ddc33db657ad735b02530d98123b4fd4b61" },
  { id: "RFC-APPB-24", source: "IETF RFC 8785 Appendix B Table 1", name: "Round to even", ieee754Hex: "43143ff3c1cb0959", canonical: "1424953923781206.2", bytes: 18, sha256: "e1547479d27f057e3197d49417a1dcbe19dd8781b34fa9f83b789925943d00cb" },
];

for (const sample of RFC8785_APPENDIX_B_FINITE) {
  test(`[RFC_8785] ${sample.id} (${sample.ieee754Hex}): ${sample.name}`, () => {
    const value = Buffer.from(sample.ieee754Hex, "hex").readDoubleBE(0);
    const serialized = canonicalJson(value);
    assert.equal(serialized, sample.canonical);
    assert.equal(Buffer.from(serialized, "utf8").length, sample.bytes);
    assert.equal(canonicalSha256(value), sample.sha256);
    assert.equal(verifyCanonicalSha256(value, sample.sha256, CANONICAL_CHECKSUM_ALGORITHM), true);
  });
}

test("[RFC_8785] Appendix B non-finite IEEE 754 samples (NaN 7fffffffffffffff, +Inf 7ff0000000000000, -Inf fff0000000000000)", () => {
  const nanVal = Buffer.from("7fffffffffffffff", "hex").readDoubleBE(0);
  const posInf = Buffer.from("7ff0000000000000", "hex").readDoubleBE(0);
  const negInf = Buffer.from("fff0000000000000", "hex").readDoubleBE(0);
  assert.throws(() => canonicalJson(nanVal), TypeError);
  assert.throws(() => canonicalJson(posInf), TypeError);
  assert.throws(() => canonicalJson(negInf), TypeError);
  assert.throws(() => canonicalJson({ val: nanVal }), TypeError);
  assert.throws(() => canonicalJson([1, posInf]), TypeError);
});

// ============================================================================
// 4. INTERNAL UNIFIED LEGAL HUB TEST VECTORS (16 COMPLETE VECTORS, ZERO ELLIPSIS)
// ============================================================================

const ULH_INTERNAL_VECTORS: ConformanceVector[] = [
  { id: "ULH-VEC-01", category: "ULH_INTERNAL", source: "Unified Legal Hub Internal Fixture Pack (ULH-R131)", name: "Object key reordering", input: { z: 1, a: 2, m: 3 }, canonical: '{"a":2,"m":3,"z":1}', bytes: 19, sha256: "ebba85cfdc0a724b6cc327ecc545faeb38b9fe02eca603b430eb872f5cf75370" },
  { id: "ULH-VEC-02", category: "ULH_INTERNAL", source: "Unified Legal Hub Internal Fixture Pack (ULH-R131)", name: "Array element order preservation", input: { list: [3, 1, 2] }, canonical: '{"list":[3,1,2]}', bytes: 16, sha256: "e1a0b6138e48437b9d08d505c4b902f063d221a38a0e13b9c5605d8ab1f4545d" },
  { id: "ULH-VEC-03", category: "ULH_INTERNAL", source: "Unified Legal Hub Internal Fixture Pack (ULH-R131)", name: "Vietnamese diacritics Unicode string", input: { dieu: "Điều 1. Phạm vi" }, canonical: '{"dieu":"Điều 1. Phạm vi"}', bytes: 31, sha256: "a0bb375b6148926918cd097cb98ee034dcdfa5db12cb2b4e572a267f51df8e99" },
  { id: "ULH-VEC-04", category: "ULH_INTERNAL", source: "Unified Legal Hub Internal Fixture Pack (ULH-R131)", name: "Non-BMP astral plane characters", input: { icon: "📜", law: "⚖️" }, canonical: '{"icon":"📜","law":"⚖️"}', bytes: 30, sha256: "b7d587f06a73b091d0a90fb12df658ec835bcf45ccf4a03ac4632b702e34bbf9" },
  { id: "ULH-VEC-05", category: "ULH_INTERNAL", source: "Unified Legal Hub Internal Fixture Pack (ULH-R131)", name: "Explicit NFC string representation", input: { nfc: "Việt" }, canonical: '{"nfc":"Việt"}', bytes: 16, sha256: "1d54c6f5214a37a398c9ad043040e6b1f2614b22e4ff21a4cdcd8b469a1e23d0" },
  { id: "ULH-VEC-06", category: "ULH_INTERNAL", source: "Unified Legal Hub Internal Fixture Pack (ULH-R131)", name: "Integer and zero formatting", input: { num: 100, val: 0 }, canonical: '{"num":100,"val":0}', bytes: 19, sha256: "588f6dc0d48930adae10d6af3379f7786d9df23dbb7bcff86c0189c32713096c" },
  { id: "ULH-VEC-07", category: "ULH_INTERNAL", source: "Unified Legal Hub Internal Fixture Pack (ULH-R131)", name: "Floating point shortest representation", input: { float: 12.34, rate: 0.5 }, canonical: '{"float":12.34,"rate":0.5}', bytes: 26, sha256: "27105fd9a17b9f1d4e151361b67d4df53517146a36f510c849a08b6f8e2fd863" },
  { id: "ULH-VEC-08", category: "ULH_INTERNAL", source: "Unified Legal Hub Internal Fixture Pack (ULH-R131)", name: "Negative numbers", input: { temp: -15, diff: -0.75 }, canonical: '{"diff":-0.75,"temp":-15}', bytes: 25, sha256: "30e38ff5cda72fa6d473d9e44684226eb7f948cc3e19f8c10407e6d9774955d9" },
  { id: "ULH-VEC-09", category: "ULH_INTERNAL", source: "Unified Legal Hub Internal Fixture Pack (ULH-R131)", name: "Negative zero normalization to zero", input: { zero: -0.0, pos: 0 }, canonical: '{"pos":0,"zero":0}', bytes: 18, sha256: "e66e9dd03302f58eb5f13655f86f71026b0c9948118e61692b63ad6a1456b14b" },
  { id: "ULH-VEC-10", category: "ULH_INTERNAL", source: "Unified Legal Hub Internal Fixture Pack (ULH-R131)", name: "Exponential number serialization", input: { exp: 10000, small: 0.001 }, canonical: '{"exp":10000,"small":0.001}', bytes: 27, sha256: "4f0ac4abc9933684469c29e71643070f209b2d3359c09963b21d8b7e152e9e17" },
  { id: "ULH-VEC-11", category: "ULH_INTERNAL", source: "Unified Legal Hub Internal Fixture Pack (ULH-R131)", name: "Null value preservation", input: { item: null, code: "VB01" }, canonical: '{"code":"VB01","item":null}', bytes: 27, sha256: "6fdd4833306574f0704e5e278114cdfb0946811f607b276c2e65fe70b4b7b1c8" },
  { id: "ULH-VEC-12", category: "ULH_INTERNAL", source: "Unified Legal Hub Internal Fixture Pack (ULH-R131)", name: "Nested objects and arrays", input: { b: { y: 2, x: 1 }, a: [true, false] }, canonical: '{"a":[true,false],"b":{"x":1,"y":2}}', bytes: 36, sha256: "714f23be16ebbc512bf2930e8e108b51ed91e83227d8a7c21605d182c910dc10" },
  { id: "ULH-VEC-13", category: "ULH_INTERNAL", source: "Unified Legal Hub Internal Fixture Pack (ULH-R131)", name: "Special character escaping", input: { text: 'Dòng 1\nDòng 2\t"Trích"\\X' }, canonical: '{"text":"Dòng 1\\nDòng 2\\t\\"Trích\\"\\\\X"}', bytes: 42, sha256: "9b7f04b187203dd69c8a1e4a397b147bc6695580609fdc06b61df93c9b67e2fe" },
  { id: "ULH-VEC-14", category: "ULH_INTERNAL", source: "Unified Legal Hub Internal Fixture Pack (ULH-R131)", name: "Empty string values", input: { name: "", notes: "" }, canonical: '{"name":"","notes":""}', bytes: 22, sha256: "b98f455b7661d4f3f94df5006eecb9cba99fb852a7820ceef64ca76b3bc78450" },
  { id: "ULH-VEC-15", category: "ULH_INTERNAL", source: "Unified Legal Hub Internal Fixture Pack (ULH-R131)", name: "Discrepancy Candidate A (76 bytes)", input: { a: "tiếng Việt có dấu: Điều 1", b: [3, 2, 1], c: null, d: 0, z: 1 }, canonical: '{"a":"tiếng Việt có dấu: Điều 1","b":[3,2,1],"c":null,"d":0,"z":1}', bytes: 76, sha256: "a104b64d509f6f95c6e2fecaf4a2aaf7e73f9cce16f78ffb681e9502e563dc8c" },
  { id: "ULH-VEC-16", category: "ULH_INTERNAL", source: "Unified Legal Hub Internal Fixture Pack (ULH-R131)", name: "Discrepancy Candidate B (103 bytes)", input: { a: "tiếng Việt có dấu: Điều 1. Phạm vi điều chỉnh", b: [3, 2, 1], c: null, d: 0, z: 1 }, canonical: '{"a":"tiếng Việt có dấu: Điều 1. Phạm vi điều chỉnh","b":[3,2,1],"c":null,"d":0,"z":1}', bytes: 103, sha256: "3f682e470211e107f5cb8e5db44f10ce57ad59578bc8cb2c4d534ef4f90c5760" },
];

for (const vec of ULH_INTERNAL_VECTORS) {
  test(`[${vec.category}] ${vec.id}: ${vec.name}`, () => {
    const serialized = canonicalJson(vec.input);
    assert.equal(serialized, vec.canonical);
    assert.equal(Buffer.from(serialized, "utf8").length, vec.bytes);
    assert.equal(canonicalSha256(vec.input), vec.sha256);
    assert.equal(verifyCanonicalSha256(vec.input, vec.sha256, CANONICAL_CHECKSUM_ALGORITHM), true);
  });
}

// ============================================================================
// 5. EDGE-CASE VALID VECTORS (UTF-16 NUMERIC KEYS, SOLIDUS, CONTROLS, NFC/NFD, ASTRAL)
// ============================================================================

const EDGE_CASE_VALID_VECTORS: ConformanceVector[] = [
  { id: "EDGE-01", category: "EDGE_CASE", source: "TASK-001R2 Edge Case Suite (V8 Integer Keys)", name: "Numeric string keys sorted by UTF-16 code units", input: { "10": "ten", "2": "two", "1": "one" }, canonical: '{"1":"one","10":"ten","2":"two"}', bytes: 32, sha256: "88f1d5d864d29ee7e34bed097931cc725766463ad2b97c08685f0c20dbc66b21" },
  { id: "EDGE-02", category: "EDGE_CASE", source: "TASK-001R2 Edge Case Suite (RFC 8785 Section 3.2.2.2)", name: "Solidus forward slash unescaped", input: { url: "https://law.gov.vn/api/v1/doc/1" }, canonical: '{"url":"https://law.gov.vn/api/v1/doc/1"}', bytes: 41, sha256: "f9f46ccd9ebb60950b0ab6866dd210a368f51bfc7e91143de3c1cb3f08f9f812" },
  { id: "EDGE-03", category: "EDGE_CASE", source: "TASK-001R2 Edge Case Suite (RFC 8785 Section 3.2.2.2)", name: "ASCII control characters U+0000..U+001F", input: { ctrl: "\u0000\u0001\u0008\u0009\u000a\u000c\u000d\u001f" }, canonical: '{"ctrl":"\\u0000\\u0001\\b\\t\\n\\f\\r\\u001f"}', bytes: 39, sha256: "069e4eeef1efb54885129180553bd57720a204f8a6642275280d87c01e247342" },
  { id: "EDGE-04", category: "EDGE_CASE", source: "TASK-001R2 Edge Case Suite (Unicode NFC Raw)", name: "Vietnamese NFC precomposed preserved without normalization", input: { text: "Việt" }, canonical: '{"text":"Việt"}', bytes: 17, sha256: "526bd496e5779228518b5f7a0f01a82885981199b8f34140ab7a51baa8531860" },
  { id: "EDGE-05", category: "EDGE_CASE", source: "TASK-001R2 Edge Case Suite (Unicode NFD Raw)", name: "Vietnamese NFD decomposed preserved without normalization", input: { text: "Vie\u0323\u0302t" }, canonical: '{"text":"Vie\u0323\u0302t"}', bytes: 19, sha256: "157cd7ab5f00bc0d0003ceaaf1493ee8b16ff782e8dc6869dc125c1f27b77908" },
  { id: "EDGE-06", category: "EDGE_CASE", source: "TASK-001R2 Edge Case Suite (Astral Surrogate Pair)", name: "Valid astral surrogate pair CJK Extension B U+20BB7", input: { kanji: "𠮷", emoji: "📜" }, canonical: '{"emoji":"📜","kanji":"𠮷"}', bytes: 31, sha256: "ebc34251e184013e7401e4ae42d8055aeb549b9918ba39f30a9f9478b34e383b" },
];

for (const vec of EDGE_CASE_VALID_VECTORS) {
  test(`[${vec.category}] ${vec.id}: ${vec.name}`, () => {
    const serialized = canonicalJson(vec.input);
    assert.equal(serialized, vec.canonical);
    assert.equal(Buffer.from(serialized, "utf8").length, vec.bytes);
    assert.equal(canonicalSha256(vec.input), vec.sha256);
  });
}

// ============================================================================
// 6. UNICODE VALIDITY & SURROGATE REJECTION TESTS
// ============================================================================

test("[EDGE_CASE] Unicode validity: từ chối lone high/low surrogate và cặp đảo ngược ở value & key", () => {
  assert.throws(() => canonicalJson("chuỗi không hợp lệ \uD800"), TypeError);
  assert.throws(() => canonicalJson("bad \uD800A"), TypeError);
  assert.throws(() => canonicalJson("bad \uDC00"), TypeError);
  assert.throws(() => canonicalJson("\uDCDC\uD83D"), TypeError);
  assert.throws(() => canonicalJson({ "bad\uD800name": 1 }), TypeError);
  assert.throws(() => canonicalJson({ "\uDC00": 2 }), TypeError);
  assert.throws(() => canonicalJson({ "\uDCDC\uD83D": 3 }), TypeError);
});

test("[EDGE_CASE] Unicode NFC vs NFD: không tự động chuẩn hóa, giữ nguyên mã byte khác nhau", () => {
  const nfc = "Việt";
  const nfd = nfc.normalize("NFD");
  assert.notEqual(nfc, nfd);
  assert.notEqual(canonicalJson({ text: nfc }), canonicalJson({ text: nfd }));
  assert.notEqual(canonicalSha256({ text: nfc }), canonicalSha256({ text: nfd }));
});

// ============================================================================
// 7. JSON DATA MODEL & R4 SPECIAL JAVASCRIPT OBJECT TESTS
// ============================================================================

test("[EDGE_CASE] JSON data model: từ chối undefined ở top-level, object và array", () => {
  assert.throws(() => canonicalJson(undefined), TypeError);
  assert.throws(() => canonicalJson({ a: undefined, b: 1 }), TypeError);
  assert.throws(() => canonicalJson({ nested: { x: undefined } }), TypeError);
  assert.throws(() => canonicalJson([1, undefined, 2]), TypeError);
});

test("[EDGE_CASE] JSON data model: từ chối sparse array", () => {
  const sparse1 = [1, , 3];
  const sparse2 = new Array(3);
  assert.throws(() => canonicalJson(sparse1), TypeError);
  assert.throws(() => canonicalJson(sparse2), TypeError);
  assert.throws(() => canonicalJson({ list: sparse1 }), TypeError);
});

test("[EDGE_CASE] JSON data model: từ chối Date, Map, Set, RegExp, Buffer, TypedArray, boxed primitives, class instance", () => {
  assert.throws(() => canonicalJson(new Date()), TypeError);
  assert.throws(() => canonicalJson(new Map([["a", 1]])), TypeError);
  assert.throws(() => canonicalJson(new Set([1, 2])), TypeError);
  assert.throws(() => canonicalJson(Buffer.from("test")), TypeError);
  assert.throws(() => canonicalJson(new Uint8Array([1, 2, 3])), TypeError);
  assert.throws(() => canonicalJson(/regex/), TypeError);
  // Boxed primitives (non-plain objects)
  assert.throws(() => canonicalJson(Object(42)), TypeError);
  assert.throws(() => canonicalJson(Object("abc")), TypeError);
  assert.throws(() => canonicalJson(Object(true)), TypeError);

  class CustomLegalEntity {
    name = "Bộ Tư pháp";
  }
  assert.throws(() => canonicalJson(new CustomLegalEntity()), TypeError);
});

test("[EDGE_CASE] JSON data model: chấp nhận Object.create(null) plain dictionary", () => {
  const nullProto: Record<string, unknown> = Object.create(null);
  nullProto.b = 2;
  nullProto.a = 1;
  assert.equal(canonicalJson(nullProto), '{"a":1,"b":2}');
});

test("[EDGE_CASE] JSON data model: từ chối BigInt, Symbol, Function và tham chiếu vòng", () => {
  assert.throws(() => canonicalJson(BigInt(123456789)), TypeError);
  assert.throws(() => canonicalJson(Symbol("secret")), TypeError);
  assert.throws(() => canonicalJson(() => {}), TypeError);

  const cyclicObj: Record<string, unknown> = { name: "loop" };
  cyclicObj.self = cyclicObj;
  assert.throws(() => canonicalJson(cyclicObj), TypeError);

  const cyclicArr: unknown[] = [1, 2];
  cyclicArr.push(cyclicArr);
  assert.throws(() => canonicalJson(cyclicArr), TypeError);
});

test("[R4] Special JS objects: từ chối symbol-keyed properties trên object và array", () => {
  const sym = Symbol("hiddenMeta");
  const objWithSym = { a: 1, [sym]: "must-not-be-silently-dropped" };
  assert.throws(() => canonicalJson(objWithSym), TypeError);

  const arrWithSym: unknown[] = [1, 2];
  (arrWithSym as unknown as Record<symbol, unknown>)[sym] = "hidden";
  assert.throws(() => canonicalJson(arrWithSym), TypeError);
});

test("[R4] Special JS objects: từ chối getter, setter và accessor properties trên object và array", () => {
  const getterObj = {
    get dynamic() {
      return 1;
    },
  };
  const setterOnlyObj = {
    set writeOnly(_v: number) {
      // no-op
    },
  };
  const accessorObj = {};
  Object.defineProperty(accessorObj, "prop", {
    get: () => "computed",
    set: () => {},
    enumerable: true,
  });

  assert.throws(() => canonicalJson(getterObj), TypeError);
  assert.throws(() => canonicalJson(setterOnlyObj), TypeError);
  assert.throws(() => canonicalJson(accessorObj), TypeError);

  const arrayWithAccessor: unknown[] = [1];
  Object.defineProperty(arrayWithAccessor, "0", {
    get: () => 99,
    enumerable: true,
  });
  assert.throws(() => canonicalJson(arrayWithAccessor), TypeError);
});

test("[R4] Special JS objects: từ chối non-enumerable properties trên object và extra properties trên array", () => {
  const objWithHidden: Record<string, unknown> = { visible: 1 };
  Object.defineProperty(objWithHidden, "hidden", {
    value: "secret-flag",
    enumerable: false,
  });
  assert.throws(() => canonicalJson(objWithHidden), TypeError);

  const objWithToJson: Record<string, unknown> = { a: 1 };
  Object.defineProperty(objWithToJson, "toJSON", {
    value: () => ({ spoofed: true }),
    enumerable: false,
  });
  assert.throws(() => canonicalJson(objWithToJson), TypeError);

  const arrWithExtraProp = Object.assign([1, 2], { extraKey: "not-an-index" });
  assert.throws(() => canonicalJson(arrWithExtraProp), TypeError);
});

// ============================================================================
// 8. R1 & R2 — CHECKSUM/MARKER PAIRING & NARROWED FALLBACK POLICY TESTS
// ============================================================================

test("[R1/R2] mỗi thuật toán tạo đúng cặp checksum + marker và từ chối marker chéo", () => {
  // Numeric-keyed object produces 3 distinct serializations across JCS, V1, and LEGACY_JSON_STRINGIFY
  const sample = { "10": 1, "2": 2, z: 3, a: 4 };

  const jcsEnv = createCanonicalChecksum(sample, CANONICAL_CHECKSUM_ALGORITHM);
  const v1Env = createCanonicalChecksum(sample, LEGACY_CANONICAL_CHECKSUM_ALGORITHM);
  const legacyEnv = createCanonicalChecksum(sample, LEGACY_JSON_STRINGIFY_CHECKSUM_ALGORITHM);

  assert.equal(jcsEnv.algorithmCode, "RFC8785_JCS");
  assert.equal(jcsEnv.canonicalJson, '{"10":1,"2":2,"a":4,"z":3}');

  assert.equal(v1Env.algorithmCode, "CANONICAL_JSON_V1_SHA256");
  assert.equal(v1Env.canonicalJson, '{"2":2,"10":1,"a":4,"z":3}');

  assert.equal(legacyEnv.algorithmCode, "LEGACY_JSON_STRINGIFY_SHA256");
  assert.equal(legacyEnv.canonicalJson, '{"2":2,"10":1,"z":3,"a":4}');

  assert.notEqual(jcsEnv.checksumSha256, v1Env.checksumSha256);
  assert.notEqual(v1Env.checksumSha256, legacyEnv.checksumSha256);
  assert.notEqual(jcsEnv.checksumSha256, legacyEnv.checksumSha256);

  // Strict single-algorithm verification: passes ONLY with its own matching marker
  assert.equal(verifyCanonicalSha256(sample, jcsEnv.checksumSha256, "RFC8785_JCS"), true);
  assert.equal(verifyCanonicalSha256(sample, jcsEnv.checksumSha256, "CANONICAL_JSON_V1_SHA256"), false);
  assert.equal(verifyCanonicalSha256(sample, jcsEnv.checksumSha256, "LEGACY_JSON_STRINGIFY_SHA256"), false);

  assert.equal(verifyCanonicalSha256(sample, v1Env.checksumSha256, "CANONICAL_JSON_V1_SHA256"), true);
  assert.equal(verifyCanonicalSha256(sample, v1Env.checksumSha256, "RFC8785_JCS"), false);
  assert.equal(verifyCanonicalSha256(sample, v1Env.checksumSha256, "LEGACY_JSON_STRINGIFY_SHA256"), false);

  assert.equal(verifyCanonicalSha256(sample, legacyEnv.checksumSha256, "LEGACY_JSON_STRINGIFY_SHA256"), true);
  assert.equal(verifyCanonicalSha256(sample, legacyEnv.checksumSha256, "RFC8785_JCS"), false);
  assert.equal(verifyCanonicalSha256(sample, legacyEnv.checksumSha256, "CANONICAL_JSON_V1_SHA256"), false);

  // Direct legacy helper consistency
  assert.equal(legacyCanonicalJson(sample), v1Env.canonicalJson);
  assert.equal(legacyCanonicalSha256(sample), v1Env.checksumSha256);
  assert.equal(legacyJsonStringify(sample), legacyEnv.canonicalJson);
  assert.equal(legacyJsonStringifySha256(sample), legacyEnv.checksumSha256);
});

test("[R2] từ chối mọi algorithm marker không nằm trong danh mục chính thức (bao gồm alias 'RFC8785')", () => {
  const sample = { a: 1 };
  const hash = canonicalSha256(sample);

  assert.deepEqual([...SUPPORTED_CHECKSUM_ALGORITHMS], [
    "RFC8785_JCS",
    "CANONICAL_JSON_V1_SHA256",
    "LEGACY_JSON_STRINGIFY_SHA256",
  ]);
  assert.equal(isSupportedChecksumAlgorithm("RFC8785_JCS"), true);
  assert.equal(isSupportedChecksumAlgorithm("RFC8785"), false);

  assert.throws(() => verifyCanonicalSha256(sample, hash, "RFC8785"), TypeError);
  assert.throws(() => verifyCanonicalSha256(sample, hash, ""), TypeError);
  assert.throws(() => verifyCanonicalSha256(sample, hash, "SHA256"), TypeError);
  assert.throws(() => verifyCanonicalSha256(sample, hash, "UNKNOWN_ALG"), TypeError);
});

test("[R2] verifyCanonicalSha256 không có marker KHÔNG fallback về legacy (ngăn dữ liệu mới lọt nhánh fallback)", () => {
  const sample = { "10": 1, "2": 2 };
  const jcsHash = canonicalSha256(sample);
  const v1Hash = legacyCanonicalSha256(sample);
  const legacyHash = legacyJsonStringifySha256(sample);

  assert.equal(verifyCanonicalSha256(sample, jcsHash), true);
  assert.equal(verifyCanonicalSha256(sample, v1Hash), false);
  assert.equal(verifyCanonicalSha256(sample, legacyHash), false);
});

test("[R2/CLOSURE-02] closed allow-list cho historical fallback: ràng buộc bảng/cột/thuật toán lịch sử và từ chối scope không hợp lệ", () => {
  const scopeIds = Object.keys(HISTORICAL_CHECKSUM_FALLBACK_SCOPES);
  assert.deepEqual(scopeIds, [
    "legal_builder.release_package.manifest_checksum_sha256",
    "legal_builder.amendment_source_version.checksum_sha256",
    "legal_builder.draft_merge_operation.input_checksum_sha256",
    "legal_builder.draft_merge_operation.preview_checksum_sha256",
    "legal_builder.draft_merge_conflict.evidence_checksum_sha256",
  ]);

  // Verify every declared scope binds table, column, and historical algorithms ONLY (never RFC8785_JCS)
  for (const spec of Object.values(HISTORICAL_CHECKSUM_FALLBACK_SCOPES)) {
    assert.ok(spec.table.startsWith("legal_builder."));
    assert.ok(spec.checksumColumn.length > 0);
    assert.ok(spec.allowedHistoricalAlgorithms.length > 0);
    assert.equal(
      (spec.allowedHistoricalAlgorithms as readonly string[]).includes(CANONICAL_CHECKSUM_ALGORITHM),
      false,
      `Scope ${spec.scopeId} không được phép chứa RFC8785_JCS trong tập thuật toán lịch sử.`,
    );
  }

  // Tables that already have NOT NULL algorithm marker columns MUST NOT be in fallback allow-list
  assert.equal(isAllowedHistoricalFallbackScope("legal_builder.draft_version.snapshot_checksum_sha256"), false);
  assert.equal(isAllowedHistoricalFallbackScope("legal_builder.draft_checkpoint.snapshot_checksum_sha256"), false);
  assert.equal(isAllowedHistoricalFallbackScope("legacy_unmarked_snapshot"), false);
  assert.equal(isAllowedHistoricalFallbackScope(""), false);

  const sample = { "10": 1, "2": 2, z: 3, a: 4 };
  const v1Hash = legacyCanonicalSha256(sample);
  const jcsHash = canonicalSha256(sample);
  const legacyStringifyHash = legacyJsonStringifySha256(sample);

  // 1. Reject empty/whitespace reason or scope
  assert.throws(
    () =>
      verifyHistoricalChecksumWithoutMarker(sample, v1Hash, {
        reason: "",
        scope: "legal_builder.release_package.manifest_checksum_sha256",
        recordClassification: "HISTORICAL_PRE_JCS",
      }),
    TypeError,
  );
  assert.throws(
    () =>
      verifyHistoricalChecksumWithoutMarker(sample, v1Hash, {
        reason: "   ",
        scope: "legal_builder.release_package.manifest_checksum_sha256",
        recordClassification: "HISTORICAL_PRE_JCS",
      }),
    TypeError,
  );
  assert.throws(
    () =>
      verifyHistoricalChecksumWithoutMarker(sample, v1Hash, {
        reason: "audit",
        scope: "   ",
        recordClassification: "HISTORICAL_PRE_JCS",
      } as unknown as HistoricalFallbackContext),
    TypeError,
  );

  // 2. Reject undeclared or marked-table scopes
  assert.throws(
    () =>
      verifyHistoricalChecksumWithoutMarker(sample, v1Hash, {
        reason: "attempt undeclared scope",
        scope: "unknown_scope",
        recordClassification: "HISTORICAL_PRE_JCS",
      } as unknown as HistoricalFallbackContext),
    TypeError,
  );
  assert.throws(
    () =>
      verifyHistoricalChecksumWithoutMarker(sample, v1Hash, {
        reason: "attempt fallback on marked draft_version table",
        scope: "legal_builder.draft_version.snapshot_checksum_sha256",
        recordClassification: "HISTORICAL_PRE_JCS",
      } as unknown as HistoricalFallbackContext),
    TypeError,
  );

  // 3. Reject new data classification from entering historical fallback
  assert.throws(
    () =>
      verifyHistoricalChecksumWithoutMarker(sample, jcsHash, {
        reason: "new record must not use fallback",
        scope: "legal_builder.release_package.manifest_checksum_sha256",
        recordClassification: "NEW_JCS",
      } as unknown as HistoricalFallbackContext),
    TypeError,
  );

  // 4. Prove new RFC8785_JCS hash is NOT accepted by historical fallback (only V1 is allowed for this scope)
  const resNewJcsHash = verifyHistoricalChecksumWithoutMarker(sample, jcsHash, {
    reason: "Kiểm toán gói release lịch sử trước cutover JCS",
    scope: "legal_builder.release_package.manifest_checksum_sha256",
    recordClassification: "HISTORICAL_PRE_JCS",
  });
  assert.equal(resNewJcsHash.verified, false);
  assert.equal(resNewJcsHash.matchedAlgorithm, null);
  assert.equal(resNewJcsHash.usedFallback, true);
  assert.equal(resNewJcsHash.table, "legal_builder.release_package");
  assert.equal(resNewJcsHash.checksumColumn, "manifest_checksum_sha256");
  assert.deepEqual(resNewJcsHash.attemptedAlgorithms, ["CANONICAL_JSON_V1_SHA256"]);

  // 5. Prove historical V1 hash IS verified with full traceability
  const resV1 = verifyHistoricalChecksumWithoutMarker(sample, v1Hash, {
    reason: "Kiểm toán gói release lịch sử trước cutover JCS",
    scope: "legal_builder.release_package.manifest_checksum_sha256",
    recordClassification: "HISTORICAL_PRE_JCS",
  });
  assert.equal(resV1.verified, true);
  assert.equal(resV1.matchedAlgorithm, "CANONICAL_JSON_V1_SHA256");
  assert.equal(resV1.usedFallback, true);
  assert.equal(resV1.table, "legal_builder.release_package");
  assert.equal(resV1.checksumColumn, "manifest_checksum_sha256");
  assert.deepEqual(resV1.attemptedAlgorithms, ["CANONICAL_JSON_V1_SHA256"]);

  // 6. Prove unpermitted algorithm for that scope (LEGACY_JSON_STRINGIFY_SHA256) is NOT matched
  const resUnpermittedAlg = verifyHistoricalChecksumWithoutMarker(sample, legacyStringifyHash, {
    reason: "Kiểm toán gói release lịch sử trước cutover JCS",
    scope: "legal_builder.release_package.manifest_checksum_sha256",
    recordClassification: "HISTORICAL_PRE_JCS",
  });
  assert.equal(resUnpermittedAlg.verified, false);
  assert.equal(resUnpermittedAlg.matchedAlgorithm, null);
});

test("[R1] regression guard: không repository hoặc script nào tạo checksum JCS nhưng ghi cứng marker CANONICAL_JSON_V1_SHA256", () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const webRoot = path.resolve(currentDir, "../..");
  const filesToCheck = [
    path.join(webRoot, "src/server/project-administration-repository.ts"),
    path.join(webRoot, "src/server/authoring-finalization-repository.ts"),
    path.join(webRoot, "src/server/merge-completion-repository.ts"),
    path.join(webRoot, "src/server/step4-change-repository.ts"),
    path.join(webRoot, "scripts/bootstrap-pilot-project.ts"),
  ];

  for (const filePath of filesToCheck) {
    const content = fs.readFileSync(filePath, "utf8");
    assert.equal(
      content.includes("CANONICAL_JSON_V1_SHA256"),
      false,
      `Phát hiện ghi cứng marker CANONICAL_JSON_V1_SHA256 trong ${filePath} khi sử dụng canonicalSha256 (RFC8785_JCS).`,
    );
    assert.equal(
      content.includes("CANONICAL_CHECKSUM_ALGORITHM"),
      true,
      `Thiếu tham chiếu CANONICAL_CHECKSUM_ALGORITHM trong ${filePath}.`,
    );
  }
});

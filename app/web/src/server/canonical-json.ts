import { createHash } from "node:crypto";

/** Official algorithm identifier conforming to RFC 8785 (JCS). */
export const CANONICAL_CHECKSUM_ALGORITHM = "RFC8785_JCS" as const;

/** Legacy V1 algorithm identifier (historical snapshots created before RFC 8785 migration). */
export const LEGACY_CANONICAL_CHECKSUM_ALGORITHM = "CANONICAL_JSON_V1_SHA256" as const;

/** Legacy pre-M3 algorithm identifier (plain JSON.stringify). */
export const LEGACY_JSON_STRINGIFY_CHECKSUM_ALGORITHM = "LEGACY_JSON_STRINGIFY_SHA256" as const;

/** Closed allow-list of official checksum algorithm markers (no undocumented aliases permitted). */
export const SUPPORTED_CHECKSUM_ALGORITHMS = [
  CANONICAL_CHECKSUM_ALGORITHM,
  LEGACY_CANONICAL_CHECKSUM_ALGORITHM,
  LEGACY_JSON_STRINGIFY_CHECKSUM_ALGORITHM,
] as const;

export type SupportedChecksumAlgorithm = (typeof SUPPORTED_CHECKSUM_ALGORITHMS)[number];

/** Historical algorithms permitted only in controlled unmarked-legacy fallback scopes (never RFC8785_JCS). */
export type HistoricalChecksumAlgorithm =
  | typeof LEGACY_CANONICAL_CHECKSUM_ALGORITHM
  | typeof LEGACY_JSON_STRINGIFY_CHECKSUM_ALGORITHM;

export interface HistoricalFallbackScopeSpec {
  readonly scopeId: HistoricalFallbackScopeId;
  readonly table: string;
  readonly checksumColumn: string;
  readonly allowedHistoricalAlgorithms: readonly HistoricalChecksumAlgorithm[];
  readonly rationale: string;
}

/**
 * Closed allow-list of schema scopes that lack a checksum algorithm marker column in migrations 0001..0031.
 * Tables WITH a marker column (draft_checkpoint, draft_version per migration 0014) are explicitly EXCLUDED
 * and MUST always use strict `verifyCanonicalSha256` with their persisted algorithm marker.
 */
export const HISTORICAL_CHECKSUM_FALLBACK_SCOPES = {
  "legal_builder.release_package.manifest_checksum_sha256": {
    scopeId: "legal_builder.release_package.manifest_checksum_sha256",
    table: "legal_builder.release_package",
    checksumColumn: "manifest_checksum_sha256",
    allowedHistoricalAlgorithms: [LEGACY_CANONICAL_CHECKSUM_ALGORITHM],
    rationale: "Migration 0020/0023 chưa có cột algorithm marker; gói release lịch sử trước cutover JCS dùng CANONICAL_JSON_V1_SHA256.",
  },
  "legal_builder.amendment_source_version.checksum_sha256": {
    scopeId: "legal_builder.amendment_source_version.checksum_sha256",
    table: "legal_builder.amendment_source_version",
    checksumColumn: "checksum_sha256",
    allowedHistoricalAlgorithms: [LEGACY_CANONICAL_CHECKSUM_ALGORITHM],
    rationale: "Migration 0009 chưa có cột algorithm marker; phiên bản nguồn sửa đổi lịch sử trước cutover JCS dùng CANONICAL_JSON_V1_SHA256.",
  },
  "legal_builder.draft_merge_operation.input_checksum_sha256": {
    scopeId: "legal_builder.draft_merge_operation.input_checksum_sha256",
    table: "legal_builder.draft_merge_operation",
    checksumColumn: "input_checksum_sha256",
    allowedHistoricalAlgorithms: [LEGACY_CANONICAL_CHECKSUM_ALGORITHM],
    rationale: "Migration 0016 chưa có cột checksum algorithm marker; input checksum lịch sử trước cutover JCS dùng CANONICAL_JSON_V1_SHA256.",
  },
  "legal_builder.draft_merge_operation.preview_checksum_sha256": {
    scopeId: "legal_builder.draft_merge_operation.preview_checksum_sha256",
    table: "legal_builder.draft_merge_operation",
    checksumColumn: "preview_checksum_sha256",
    allowedHistoricalAlgorithms: [LEGACY_CANONICAL_CHECKSUM_ALGORITHM],
    rationale: "Migration 0016 chưa có cột checksum algorithm marker; preview token lịch sử trước cutover JCS dùng CANONICAL_JSON_V1_SHA256.",
  },
  "legal_builder.draft_merge_conflict.evidence_checksum_sha256": {
    scopeId: "legal_builder.draft_merge_conflict.evidence_checksum_sha256",
    table: "legal_builder.draft_merge_conflict",
    checksumColumn: "evidence_checksum_sha256",
    allowedHistoricalAlgorithms: [LEGACY_CANONICAL_CHECKSUM_ALGORITHM],
    rationale: "Migration 0016 chưa có cột checksum algorithm marker; evidence checksum lịch sử trước cutover JCS dùng CANONICAL_JSON_V1_SHA256.",
  },
} as const;

export type HistoricalFallbackScopeId = keyof typeof HISTORICAL_CHECKSUM_FALLBACK_SCOPES;

export function isAllowedHistoricalFallbackScope(scope: string): scope is HistoricalFallbackScopeId {
  return Object.prototype.hasOwnProperty.call(HISTORICAL_CHECKSUM_FALLBACK_SCOPES, scope);
}

export interface ChecksumEnvelope {
  readonly canonicalJson: string;
  readonly checksumSha256: string;
  readonly algorithmCode: SupportedChecksumAlgorithm;
}

export interface HistoricalFallbackContext {
  readonly reason: string;
  readonly scope: HistoricalFallbackScopeId;
  readonly recordClassification: "HISTORICAL_PRE_JCS";
}

export interface HistoricalFallbackVerificationResult {
  readonly verified: boolean;
  readonly matchedAlgorithm: HistoricalChecksumAlgorithm | null;
  readonly usedFallback: true;
  readonly reason: string;
  readonly scope: HistoricalFallbackScopeId;
  readonly table: string;
  readonly checksumColumn: string;
  readonly attemptedAlgorithms: readonly HistoricalChecksumAlgorithm[];
}

export function isSupportedChecksumAlgorithm(algorithm: string): algorithm is SupportedChecksumAlgorithm {
  return (SUPPORTED_CHECKSUM_ALGORITHMS as readonly string[]).includes(algorithm);
}

/**
 * Validates that a string contains only valid Unicode scalar values (no lone surrogates).
 * RFC 8785 Section 3.2.2.2 requires rejecting invalid Unicode strings such as lone surrogates.
 * Note: Does NOT perform NFC or NFD normalization.
 */
function validateUnicodeString(str: string, context: string): void {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      if (i + 1 >= str.length) {
        throw new TypeError(`Chuỗi Unicode không hợp lệ trong ${context}: lone high surrogate tại vị trí ${i}.`);
      }
      const nextCode = str.charCodeAt(i + 1);
      if (nextCode < 0xdc00 || nextCode > 0xdfff) {
        throw new TypeError(`Chuỗi Unicode không hợp lệ trong ${context}: lone high surrogate tại vị trí ${i}.`);
      }
      i++; // Skip paired low surrogate
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError(`Chuỗi Unicode không hợp lệ trong ${context}: lone low surrogate tại vị trí ${i}.`);
    }
  }
}

/**
 * Checks whether an object is a plain JSON object (Object.prototype or null prototype).
 * Rejects Date, Map, Set, RegExp, Buffer, TypedArray, boxed primitives, and class instances.
 */
function isPlainJsonObject(val: object): val is Record<string, unknown> {
  if (val === null || Array.isArray(val)) return false;
  if (val instanceof Date) return false;
  if (val instanceof Map || val instanceof Set) return false;
  if (val instanceof RegExp) return false;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(val)) return false;
  if (ArrayBuffer.isView(val)) return false;

  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

/**
 * RFC 8785 JSON Canonicalization Scheme (JCS) serializer with strict JSON data model validation.
 *
 * Rejected constructs (TypeError):
 * - undefined (top-level, object property value, or array element)
 * - sparse arrays (holes) and arrays with extra own properties, symbol keys, or accessors
 * - symbol-keyed properties, non-enumerable own properties, and getter/setter accessors on objects
 * - non-plain objects (Date, Map, Set, Buffer, TypedArray, RegExp, boxed primitives, class instances)
 * - non-finite numbers (NaN, Infinity, -Infinity)
 * - BigInt, Symbol, Function
 * - cyclic object or array references
 * - lone high/low Unicode surrogates in string values or object property names
 */
function jcsSerialize(val: unknown, seen = new Set<object>()): string {
  if (val === undefined) {
    throw new TypeError("Canonical JSON không chấp nhận giá trị undefined.");
  }
  if (val === null) {
    return "null";
  }
  if (typeof val === "boolean") {
    return val ? "true" : "false";
  }
  if (typeof val === "number") {
    if (!Number.isFinite(val)) {
      throw new TypeError("Canonical JSON chỉ chấp nhận số hữu hạn.");
    }
    if (Object.is(val, -0) || val === 0) {
      return "0";
    }
    return val.toString();
  }
  if (typeof val === "string") {
    validateUnicodeString(val, "giá trị chuỗi (string value)");
    let out = '"';
    for (let i = 0; i < val.length; i++) {
      const c = val[i];
      const code = val.charCodeAt(i);
      if (c === '"') out += '\\"';
      else if (c === "\\") out += "\\\\";
      else if (c === "\b") out += "\\b";
      else if (c === "\f") out += "\\f";
      else if (c === "\n") out += "\\n";
      else if (c === "\r") out += "\\r";
      else if (c === "\t") out += "\\t";
      else if (code < 0x20) {
        out += "\\u" + code.toString(16).padStart(4, "0");
      } else {
        out += c;
      }
    }
    out += '"';
    return out;
  }
  if (Array.isArray(val)) {
    if (Object.getOwnPropertySymbols(val).length > 0) {
      throw new TypeError("Mảng chứa thuộc tính khóa Symbol không thuộc JSON data model.");
    }
    const ownNames = Object.getOwnPropertyNames(val);
    const expectedIndexCount = val.length;
    if (ownNames.length !== expectedIndexCount + 1) {
      // Either sparse array (fewer index properties) or extra custom own properties on array
      for (const name of ownNames) {
        if (name === "length") continue;
        const idx = Number(name);
        if (!Number.isInteger(idx) || idx < 0 || idx >= expectedIndexCount || String(idx) !== name) {
          throw new TypeError(`Mảng chứa thuộc tính ngoài chỉ mục "${name}" không thuộc JSON data model.`);
        }
      }
    }
    if (seen.has(val)) {
      throw new TypeError("Phát hiện tham chiếu vòng (cyclic reference) trong mảng.");
    }
    seen.add(val);
    try {
      const items: string[] = [];
      for (let i = 0; i < val.length; i++) {
        const key = String(i);
        const desc = Object.getOwnPropertyDescriptor(val, key);
        if (!desc) {
          throw new TypeError(`Mảng thưa (sparse array) tại vị trí ${i} không được chấp nhận.`);
        }
        if (desc.get !== undefined || desc.set !== undefined || !("value" in desc)) {
          throw new TypeError(`Phần tử mảng tại vị trí ${i} là accessor (getter/setter) không thuộc JSON data model.`);
        }
        if (!desc.enumerable) {
          throw new TypeError(`Phần tử mảng tại vị trí ${i} là non-enumerable không thuộc JSON data model.`);
        }
        if (desc.value === undefined) {
          throw new TypeError(`Phần tử mảng tại vị trí ${i} có giá trị undefined không được chấp nhận.`);
        }
        items.push(jcsSerialize(desc.value, seen));
      }
      return "[" + items.join(",") + "]";
    } finally {
      seen.delete(val);
    }
  }
  if (typeof val === "object") {
    if (!isPlainJsonObject(val)) {
      const typeName = val?.constructor?.name || typeof val;
      throw new TypeError(`Đối tượng kiểu ${typeName} không thuộc JSON data model.`);
    }
    if (Object.getOwnPropertySymbols(val).length > 0) {
      throw new TypeError("Đối tượng chứa thuộc tính khóa Symbol không thuộc JSON data model.");
    }
    if (seen.has(val)) {
      throw new TypeError("Phát hiện tham chiếu vòng (cyclic reference) trong đối tượng.");
    }
    seen.add(val);
    try {
      const ownKeys = Object.getOwnPropertyNames(val);
      const record = val as Record<string, unknown>;
      for (const k of ownKeys) {
        validateUnicodeString(k, `tên thuộc tính (property name "${k}")`);
        const desc = Object.getOwnPropertyDescriptor(record, k);
        if (!desc) {
          throw new TypeError(`Không thể đọc descriptor của thuộc tính "${k}".`);
        }
        if (desc.get !== undefined || desc.set !== undefined || !("value" in desc)) {
          throw new TypeError(`Thuộc tính accessor (getter/setter) "${k}" không thuộc JSON data model.`);
        }
        if (!desc.enumerable) {
          throw new TypeError(`Thuộc tính non-enumerable "${k}" không thuộc JSON data model.`);
        }
        if (desc.value === undefined) {
          throw new TypeError(`Thuộc tính "${k}" có giá trị undefined không được chấp nhận.`);
        }
      }
      // RFC 8785 Section 3.2.3: UTF-16 code units lexicographical sorting
      ownKeys.sort((a, b) => {
        const len = Math.min(a.length, b.length);
        for (let i = 0; i < len; i++) {
          const diff = a.charCodeAt(i) - b.charCodeAt(i);
          if (diff !== 0) return diff;
        }
        return a.length - b.length;
      });
      const items: string[] = [];
      for (const k of ownKeys) {
        const desc = Object.getOwnPropertyDescriptor(record, k)!;
        items.push(jcsSerialize(k, seen) + ":" + jcsSerialize(desc.value, seen));
      }
      return "{" + items.join(",") + "}";
    } finally {
      seen.delete(val);
    }
  }
  throw new TypeError(`Không thể canonicalize giá trị kiểu ${typeof val}.`);
}

/** Legacy V1 normalizer preserving exact historical behavior of CANONICAL_JSON_V1_SHA256. */
function legacyNormalize(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical JSON chỉ chấp nhận số hữu hạn.");
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map((item) => legacyNormalize(item));
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      if (source[key] !== undefined) result[key] = legacyNormalize(source[key]);
    }
    return result;
  }
  throw new TypeError(`Không thể canonicalize giá trị kiểu ${typeof value}.`);
}

/** Legacy V1 Canonical JSON string (JSON.stringify over sorted object). */
export function legacyCanonicalJson(value: unknown): string {
  return JSON.stringify(legacyNormalize(value));
}

/** Legacy V1 SHA-256 hex digest (algorithm marker: CANONICAL_JSON_V1_SHA256). */
export function legacyCanonicalSha256(value: unknown): string {
  return createHash("sha256").update(legacyCanonicalJson(value), "utf8").digest("hex");
}

/** Legacy pre-M3 JSON.stringify serialization (algorithm marker: LEGACY_JSON_STRINGIFY_SHA256). */
export function legacyJsonStringify(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError("Giá trị không thể serialize bằng JSON.stringify.");
  }
  return serialized;
}

/** Legacy pre-M3 SHA-256 hex digest (algorithm marker: LEGACY_JSON_STRINGIFY_SHA256). */
export function legacyJsonStringifySha256(value: unknown): string {
  return createHash("sha256").update(legacyJsonStringify(value), "utf8").digest("hex");
}

/**
 * Standard Canonical JSON strictly conforming to RFC 8785 (JCS).
 * Output is deterministic UTF-8 JSON with lexicographical UTF-16 code unit key sorting.
 */
export function canonicalJson(value: unknown): string {
  return jcsSerialize(value);
}

/**
 * SHA-256 hex digest of the RFC 8785 canonical JSON UTF-8 byte stream (algorithm marker: RFC8785_JCS).
 */
export function canonicalSha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

/**
 * Atomically produces canonical JSON, SHA-256 checksum, and matching official algorithm marker
 * to eliminate checksum/marker pairing mismatches.
 */
export function createCanonicalChecksum(
  value: unknown,
  algorithm: SupportedChecksumAlgorithm = CANONICAL_CHECKSUM_ALGORITHM,
): ChecksumEnvelope {
  if (!isSupportedChecksumAlgorithm(algorithm)) {
    throw new TypeError(`Mã thuật toán checksum không được hỗ trợ: "${String(algorithm)}".`);
  }
  if (algorithm === CANONICAL_CHECKSUM_ALGORITHM) {
    const serialized = canonicalJson(value);
    return {
      canonicalJson: serialized,
      checksumSha256: createHash("sha256").update(serialized, "utf8").digest("hex"),
      algorithmCode: CANONICAL_CHECKSUM_ALGORITHM,
    };
  }
  if (algorithm === LEGACY_CANONICAL_CHECKSUM_ALGORITHM) {
    const serialized = legacyCanonicalJson(value);
    return {
      canonicalJson: serialized,
      checksumSha256: createHash("sha256").update(serialized, "utf8").digest("hex"),
      algorithmCode: LEGACY_CANONICAL_CHECKSUM_ALGORITHM,
    };
  }
  const serialized = legacyJsonStringify(value);
  return {
    canonicalJson: serialized,
    checksumSha256: createHash("sha256").update(serialized, "utf8").digest("hex"),
    algorithmCode: LEGACY_JSON_STRINGIFY_CHECKSUM_ALGORITHM,
  };
}

/**
 * Strict single-algorithm checksum verifier.
 *
 * Policy:
 * - Official algorithm marker MUST be one of:
 *   "RFC8785_JCS", "CANONICAL_JSON_V1_SHA256", "LEGACY_JSON_STRINGIFY_SHA256".
 * - Unsupported markers (including undocumented aliases such as "RFC8785") throw TypeError.
 * - Omitting `algorithm` verifies strictly against "RFC8785_JCS" (NO silent legacy fallback).
 * - For historical records stored without an algorithm marker column, callers MUST explicitly use
 *   `verifyHistoricalChecksumWithoutMarker` with documented reason and scope.
 */
export function verifyCanonicalSha256(
  value: unknown,
  expected: string,
  algorithm: string = CANONICAL_CHECKSUM_ALGORITHM,
): boolean {
  if (!isSupportedChecksumAlgorithm(algorithm)) {
    throw new TypeError(`Mã thuật toán checksum không được hỗ trợ: "${algorithm}".`);
  }
  const normalizedExpected = expected.trim().toLowerCase();
  if (algorithm === CANONICAL_CHECKSUM_ALGORITHM) {
    return canonicalSha256(value) === normalizedExpected;
  }
  if (algorithm === LEGACY_CANONICAL_CHECKSUM_ALGORITHM) {
    return legacyCanonicalSha256(value) === normalizedExpected;
  }
  return legacyJsonStringifySha256(value) === normalizedExpected;
}

/**
 * Controlled, traceable verification fallback strictly scoped to declared historical tables
 * that lack a checksum algorithm marker column in migrations 0001..0031.
 *
 * Security & policy invariants:
 * - `context.scope` MUST exist in closed allow-list `HISTORICAL_CHECKSUM_FALLBACK_SCOPES`.
 * - `context.reason` MUST be non-empty.
 * - `context.recordClassification` MUST be `"HISTORICAL_PRE_JCS"` (new data is rejected).
 * - Evaluates ONLY the historical algorithms bound to that scope (NEVER `RFC8785_JCS`).
 * - New data flows MUST NEVER call this function; they MUST use `verifyCanonicalSha256`.
 */
export function verifyHistoricalChecksumWithoutMarker(
  value: unknown,
  expected: string,
  context: HistoricalFallbackContext,
): HistoricalFallbackVerificationResult {
  const reason = typeof context?.reason === "string" ? context.reason.trim() : "";
  const rawScope = typeof context?.scope === "string" ? context.scope.trim() : "";
  if (!reason || !rawScope) {
    throw new TypeError("Fallback lịch sử không có marker bắt buộc phải cung cấp đầy đủ reason và scope truy nguyên.");
  }
  if (!isAllowedHistoricalFallbackScope(rawScope)) {
    throw new TypeError(`Scope fallback lịch sử không hợp lệ hoặc không nằm trong closed allow-list: "${rawScope}".`);
  }
  if (context?.recordClassification !== "HISTORICAL_PRE_JCS") {
    throw new TypeError(
      `Dữ liệu mới không được phép đi vào nhánh fallback lịch sử (bắt buộc recordClassification="HISTORICAL_PRE_JCS").`,
    );
  }

  const spec = HISTORICAL_CHECKSUM_FALLBACK_SCOPES[rawScope];
  const normalizedExpected = expected.trim().toLowerCase();
  const attemptedAlgorithms: HistoricalChecksumAlgorithm[] = [];

  for (const algorithm of spec.allowedHistoricalAlgorithms) {
    attemptedAlgorithms.push(algorithm);
    if (verifyCanonicalSha256(value, normalizedExpected, algorithm)) {
      return {
        verified: true,
        matchedAlgorithm: algorithm,
        usedFallback: true,
        reason,
        scope: spec.scopeId,
        table: spec.table,
        checksumColumn: spec.checksumColumn,
        attemptedAlgorithms,
      };
    }
  }

  return {
    verified: false,
    matchedAlgorithm: null,
    usedFallback: true,
    reason,
    scope: spec.scopeId,
    table: spec.table,
    checksumColumn: spec.checksumColumn,
    attemptedAlgorithms,
  };
}

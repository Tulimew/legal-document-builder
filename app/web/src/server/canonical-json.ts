import { createHash } from "node:crypto";

/**
 * Validates that a string does not contain lone high or low surrogates.
 * RFC 8785 Section 3.2.2.2 requires valid Unicode code points (scalar values).
 * UTF-16 code units in range 0xD800..0xDFFF must form valid surrogate pairs.
 * Note: Does NOT perform NFC or NFD normalization.
 */
function validateUnicodeString(str: string, context: string): void {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      // High surrogate: must be followed by a low surrogate (0xDC00..0xDFFF)
      if (i + 1 >= str.length) {
        throw new TypeError(`Chuỗi Unicode không hợp lệ trong ${context}: lone high surrogate tại vị trí ${i}.`);
      }
      const nextCode = str.charCodeAt(i + 1);
      if (nextCode < 0xdc00 || nextCode > 0xdfff) {
        throw new TypeError(`Chuỗi Unicode không hợp lệ trong ${context}: lone high surrogate tại vị trí ${i}.`);
      }
      i++; // Skip paired low surrogate
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      // Lone low surrogate (not preceded by high surrogate)
      throw new TypeError(`Chuỗi Unicode không hợp lệ trong ${context}: lone low surrogate tại vị trí ${i}.`);
    }
  }
}

/**
 * Checks whether an object is a plain JSON object (Object.prototype or null prototype).
 * Rejects Date, Map, Set, Buffer, TypedArray, RegExp, class instances, etc.
 */
function isPlainJsonObject(val: object): val is Record<string, unknown> {
  if (val === null) return false;
  if (Array.isArray(val)) return false;
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
    if (seen.has(val)) {
      throw new TypeError("Phát hiện tham chiếu vòng (cyclic reference) trong mảng.");
    }
    seen.add(val);
    try {
      const items: string[] = [];
      for (let i = 0; i < val.length; i++) {
        if (!(i in val) || val[i] === undefined) {
          throw new TypeError(`Mảng thưa (sparse array) hoặc chứa undefined tại vị trí ${i} không được chấp nhận.`);
        }
        items.push(jcsSerialize(val[i], seen));
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
    if (seen.has(val)) {
      throw new TypeError("Phát hiện tham chiếu vòng (cyclic reference) trong đối tượng.");
    }
    seen.add(val);
    try {
      const record = val as Record<string, unknown>;
      const keys = Object.keys(record);
      for (const k of keys) {
        validateUnicodeString(k, `tên thuộc tính (property name "${k}")`);
        if (record[k] === undefined) {
          throw new TypeError(`Thuộc tính "${k}" có giá trị undefined không được chấp nhận.`);
        }
      }
      // UTF-16 code units lexicographical sorting
      keys.sort((a, b) => {
        const len = Math.min(a.length, b.length);
        for (let i = 0; i < len; i++) {
          const diff = a.charCodeAt(i) - b.charCodeAt(i);
          if (diff !== 0) return diff;
        }
        return a.length - b.length;
      });
      const items: string[] = [];
      for (const k of keys) {
        items.push(jcsSerialize(k, seen) + ":" + jcsSerialize(record[k], seen));
      }
      return "{" + items.join(",") + "}";
    } finally {
      seen.delete(val);
    }
  }
  if (typeof val === "bigint" || typeof val === "symbol" || typeof val === "function") {
    throw new TypeError(`Không thể canonicalize giá trị kiểu ${typeof val}.`);
  }
  throw new TypeError(`Không thể canonicalize giá trị kiểu ${typeof val}.`);
}

/** Legacy normalizer preserving backward compatibility with CANONICAL_JSON_V1_SHA256 */
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

/** Legacy V1 Canonical JSON string (JSON.stringify over sorted object) */
export function legacyCanonicalJson(value: unknown): string {
  return JSON.stringify(legacyNormalize(value));
}

/** Legacy V1 SHA-256 hex digest */
export function legacyCanonicalSha256(value: unknown): string {
  return createHash("sha256").update(legacyCanonicalJson(value), "utf8").digest("hex");
}

/**
 * Standard Canonical JSON strictly conforming to RFC 8785 (JCS).
 * Output is deterministic UTF-8 JSON with lexicographical UTF-16 code unit key sorting.
 */
export function canonicalJson(value: unknown): string {
  return jcsSerialize(value);
}

/**
 * SHA-256 hex digest of the RFC 8785 canonical JSON UTF-8 byte stream.
 */
export function canonicalSha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

/**
 * Dual-algorithm verifier.
 * If algorithm is specified, verifies strictly against that algorithm.
 * If algorithm is unspecified, tries RFC 8785 first, then falls back to legacy V1 and standard JSON.stringify.
 */
export function verifyCanonicalSha256(value: unknown, expected: string, algorithm?: string): boolean {
  const normalizedExpected = expected.trim().toLowerCase();
  if (algorithm === "RFC8785_JCS" || algorithm === "RFC8785") {
    return canonicalSha256(value) === normalizedExpected;
  }
  if (algorithm === "CANONICAL_JSON_V1_SHA256") {
    return legacyCanonicalSha256(value) === normalizedExpected;
  }
  if (algorithm === "LEGACY_JSON_STRINGIFY_SHA256") {
    return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex") === normalizedExpected;
  }
  // Dual-mode fallback for unversioned / legacy callers
  if (canonicalSha256(value) === normalizedExpected) {
    return true;
  }
  if (legacyCanonicalSha256(value) === normalizedExpected) {
    return true;
  }
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex") === normalizedExpected;
}

/** Primary algorithm identifier conforming to RFC 8785 */
export const CANONICAL_CHECKSUM_ALGORITHM = "RFC8785_JCS" as const;

/** Alias for RFC 8785 JCS checksum algorithm */
export const RFC8785_CHECKSUM_ALGORITHM = "RFC8785_JCS" as const;

/** Legacy algorithm code for historical checkpoints and migrations */
export const LEGACY_CANONICAL_CHECKSUM_ALGORITHM = "CANONICAL_JSON_V1_SHA256" as const;

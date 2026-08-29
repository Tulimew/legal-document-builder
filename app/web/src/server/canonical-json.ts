import { createHash } from "node:crypto";

function normalize(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical JSON chỉ chấp nhận số hữu hạn.");
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map((item) => normalize(item));
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      if (source[key] !== undefined) result[key] = normalize(source[key]);
    }
    return result;
  }
  throw new TypeError(`Không thể canonicalize giá trị kiểu ${typeof value}.`);
}

/** UTF-8 JSON, object keys sorted recursively, array order preserved. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function canonicalSha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

export function verifyCanonicalSha256(value: unknown, expected: string): boolean {
  return canonicalSha256(value) === expected.trim().toLowerCase();
}

export const CANONICAL_CHECKSUM_ALGORITHM = "CANONICAL_JSON_V1_SHA256" as const;

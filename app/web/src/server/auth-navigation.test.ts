import assert from "node:assert/strict";
import test from "node:test";
import { isAuthenticationFailure, loginPathFor, safeReturnTo } from "@/lib/auth-navigation";

test("expired sessions redirect to login with a safe return path", () => {
  assert.equal(loginPathFor("/projects/abc?tab=drafting"), "/dang-nhap?returnTo=%2Fprojects%2Fabc%3Ftab%3Ddrafting");
  assert.equal(isAuthenticationFailure(401), true);
  assert.equal(isAuthenticationFailure(403, "UNAUTHENTICATED"), true);
  assert.equal(isAuthenticationFailure(500, "BACKEND_ERROR"), false);
});

test("login return path cannot become an external redirect", () => {
  assert.equal(safeReturnTo("https://example.invalid"), "/");
  assert.equal(safeReturnTo("//example.invalid/path"), "/");
  assert.equal(safeReturnTo("/quan-tri"), "/quan-tri");
});


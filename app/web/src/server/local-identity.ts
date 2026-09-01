import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

import type { Pool } from "pg";

import { AppError } from "./errors";

function scrypt(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCallback(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, value) => error ? reject(error) : resolve(value as Buffer)));
}
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const SESSION_COOKIE = "legal_builder_session";

export async function hashLocalPassword(password: string, salt = randomBytes(16).toString("base64url")): Promise<{ salt: string; hash: string }> {
  if (password.length < 12 || password.length > 256) throw new AppError("INVALID_REQUEST", "Mật khẩu phải có từ 12 đến 256 ký tự.");
  const value = await scrypt(password, salt);
  return { salt, hash: value.toString("base64url") };
}

export async function verifyLocalPassword(password: string, salt: string, expected: string): Promise<boolean> {
  const actual = await scrypt(password, salt);
  const expectedBytes = Buffer.from(expected, "base64url");
  return actual.length === expectedBytes.length && timingSafeEqual(actual, expectedBytes);
}

function sessionSecret(env: NodeJS.ProcessEnv): string {
  const value = env.AUTH_SESSION_SECRET?.trim();
  if (!value || value.length < 32) throw new AppError("AUTH_NOT_CONFIGURED", "AUTH_SESSION_SECRET phải có ít nhất 32 ký tự.");
  return value;
}

function signature(payload: string, env: NodeJS.ProcessEnv): string {
  return createHmac("sha256", sessionSecret(env)).update(payload).digest("base64url");
}

export function createLocalSession(userId: string, env: NodeJS.ProcessEnv = process.env, now = Date.now()): string {
  const ttlSeconds = Number(env.AUTH_SESSION_TTL_SECONDS || 28_800);
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 300 || ttlSeconds > 86_400) throw new AppError("CONFIGURATION_INVALID", "AUTH_SESSION_TTL_SECONDS không hợp lệ.");
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt: now + ttlSeconds * 1000 })).toString("base64url");
  return `${payload}.${signature(payload, env)}`;
}

export function actorFromLocalSession(headers: Headers, env: NodeJS.ProcessEnv = process.env, now = Date.now()): { userId: string } {
  const cookie = headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!cookie) throw new AppError("UNAUTHENTICATED", "Chưa đăng nhập.");
  const [payload, suppliedSignature, extra] = cookie.split(".");
  if (!payload || !suppliedSignature || extra) throw new AppError("UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  const expected = signature(payload, env);
  const suppliedBytes = Buffer.from(suppliedSignature);
  const expectedBytes = Buffer.from(expected);
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) throw new AppError("UNAUTHENTICATED", "Phiên đăng nhập không hợp lệ.");
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId?: unknown; expiresAt?: unknown };
    if (typeof decoded.userId !== "string" || typeof decoded.expiresAt !== "number" || decoded.expiresAt <= now) throw new Error();
    return { userId: decoded.userId };
  } catch { throw new AppError("UNAUTHENTICATED", "Phiên đăng nhập đã hết hạn hoặc không hợp lệ."); }
}

export function localSessionCookie(value: string, env: NodeJS.ProcessEnv = process.env): string {
  const maxAge = Number(env.AUTH_SESSION_TTL_SECONDS || 28_800);
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${maxAge}`;
}

export const clearLocalSessionCookie = `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0`;

export async function authenticateLocalCredentials(pool: Pick<Pool, "query">, usernameInput: string, password: string): Promise<string> {
  const username = usernameInput.trim().toLowerCase();
  if (!USERNAME.test(username) || !password) throw new AppError("UNAUTHENTICATED", "Tên đăng nhập hoặc mật khẩu không đúng.");
  const result = await pool.query(`SELECT u.id,u.status_code,c.password_salt,c.password_hash,c.failed_attempt_count,c.locked_until
    FROM legal_builder.user_account u JOIN legal_builder.local_account_credential c ON c.user_account_id=u.id
    WHERE u.external_provider_code='local' AND lower(u.external_subject)=$1`, [username]);
  const row = result.rows[0];
  if (!row || row.status_code !== "ACTIVE" || (row.locked_until && new Date(row.locked_until).getTime() > Date.now())) throw new AppError("UNAUTHENTICATED", "Tên đăng nhập hoặc mật khẩu không đúng.");
  const valid = await verifyLocalPassword(password, row.password_salt, row.password_hash);
  if (!valid) {
    await pool.query(`UPDATE legal_builder.local_account_credential SET failed_attempt_count=failed_attempt_count+1,
      locked_until=CASE WHEN failed_attempt_count+1>=5 THEN clock_timestamp()+interval '15 minutes' ELSE locked_until END WHERE user_account_id=$1`, [row.id]);
    throw new AppError("UNAUTHENTICATED", "Tên đăng nhập hoặc mật khẩu không đúng.");
  }
  await pool.query("UPDATE legal_builder.local_account_credential SET failed_attempt_count=0,locked_until=NULL WHERE user_account_id=$1", [row.id]);
  await pool.query("UPDATE legal_builder.user_account SET last_authenticated_at=clock_timestamp() WHERE id=$1", [row.id]);
  return row.id as string;
}

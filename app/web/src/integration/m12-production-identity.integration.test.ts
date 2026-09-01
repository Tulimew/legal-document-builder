import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { Pool } from "pg";

import { authenticateLocalCredentials, hashLocalPassword } from "@/server/local-identity";

test("M12 local identity persists scrypt credentials, updates login evidence and locks repeated failures", async (t) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const personId = randomUUID(), userId = randomUUID(), username = `m12-${randomUUID().slice(0, 8)}`;
  t.after(async () => {
    await pool.query("DELETE FROM legal_builder.local_account_credential WHERE user_account_id=$1", [userId]);
    await pool.query("DELETE FROM legal_builder.user_account WHERE id=$1", [userId]);
    await pool.query("DELETE FROM legal_builder.person WHERE id=$1", [personId]);
    await pool.end();
  });
  const credential = await hashLocalPassword("m12-integration-password");
  await pool.query("INSERT INTO legal_builder.person(id,display_name,status_code,created_at) VALUES($1,'M12 Test','ACTIVE',clock_timestamp())", [personId]);
  await pool.query("INSERT INTO legal_builder.user_account(id,person_id,external_provider_code,external_subject,status_code,created_at) VALUES($1,$2,'local',$3,'ACTIVE',clock_timestamp())", [userId, personId, username]);
  await pool.query("INSERT INTO legal_builder.local_account_credential(user_account_id,password_salt,password_hash,password_changed_at,created_at) VALUES($1,$2,$3,clock_timestamp(),clock_timestamp())", [userId, credential.salt, credential.hash]);
  assert.equal(await authenticateLocalCredentials(pool, username.toUpperCase(), "m12-integration-password"), userId);
  assert.ok((await pool.query("SELECT last_authenticated_at FROM legal_builder.user_account WHERE id=$1", [userId])).rows[0].last_authenticated_at);
  for (let attempt = 0; attempt < 5; attempt++) await assert.rejects(() => authenticateLocalCredentials(pool, username, "wrong"), /Tên đăng nhập hoặc mật khẩu/);
  const state = (await pool.query("SELECT failed_attempt_count,locked_until FROM legal_builder.local_account_credential WHERE user_account_id=$1", [userId])).rows[0];
  assert.equal(state.failed_attempt_count, 5);
  assert.ok(new Date(state.locked_until).getTime() > Date.now());
  await assert.rejects(() => authenticateLocalCredentials(pool, username, "m12-integration-password"), /Tên đăng nhập hoặc mật khẩu/);
});

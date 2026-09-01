import { randomUUID } from "node:crypto";
import process from "node:process";

import { Pool } from "pg";

import { hashLocalPassword } from "../src/server/local-identity";

async function main(): Promise<void> {
const [usernameInput, displayNameInput] = process.argv.slice(2);
const password = process.env.LEGAL_BUILDER_INITIAL_PASSWORD;
if (!usernameInput || !displayNameInput || !password) throw new Error("Usage: LEGAL_BUILDER_INITIAL_PASSWORD=<secret> npm.cmd run auth:provision -- <username> <display-name>");
const username = usernameInput.trim().toLowerCase();
const displayName = displayNameInput.trim();
const { salt, hash } = await hashLocalPassword(password);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const personId = randomUUID();
  const userId = randomUUID();
  await client.query("INSERT INTO legal_builder.person(id,display_name,status_code,created_at) VALUES($1,$2,'ACTIVE',clock_timestamp())", [personId, displayName]);
  await client.query("INSERT INTO legal_builder.user_account(id,person_id,external_provider_code,external_subject,status_code,created_at) VALUES($1,$2,'local',$3,'ACTIVE',clock_timestamp())", [userId, personId, username]);
  await client.query("INSERT INTO legal_builder.local_account_credential(user_account_id,password_salt,password_hash,password_changed_at,created_at) VALUES($1,$2,$3,clock_timestamp(),clock_timestamp())", [userId, salt, hash]);
  await client.query("COMMIT");
  console.log(JSON.stringify({ created: true, userId, username, membershipRequired: true }));
} catch (error) { await client.query("ROLLBACK"); throw error; }
finally { client.release(); await pool.end(); }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Provisioning failed"}\n`);
  process.exitCode = 1;
});

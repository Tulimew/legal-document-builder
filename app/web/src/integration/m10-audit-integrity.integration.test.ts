import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { Client } from "pg";

const envText = readFileSync(path.resolve(".env.local"), "utf8");
const localEnv = Object.fromEntries(envText.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")]; }));

test("M10 PostgreSQL security evidence is append-only", async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL ?? localEnv.DATABASE_URL });
  await client.connect();
  try {
    const id = randomUUID();
    await client.query("BEGIN");
    await client.query("INSERT INTO legal_builder.security_rejection_event(id,project_id,rejection_type_code,correlation_id) VALUES($1,NULL,'OTHER','m10-immutable-test')", [id]);
    await assert.rejects(() => client.query("UPDATE legal_builder.security_rejection_event SET rejection_type_code='ORIGIN' WHERE id=$1", [id]), /immutable/i);
    await client.query("ROLLBACK");

    await client.query("BEGIN");
    await client.query("INSERT INTO legal_builder.security_rejection_event(id,project_id,rejection_type_code,correlation_id) VALUES($1,NULL,'OTHER','m10-immutable-test')", [id]);
    await assert.rejects(() => client.query("DELETE FROM legal_builder.security_rejection_event WHERE id=$1", [id]), /immutable/i);
    await client.query("ROLLBACK");
  } finally {
    await client.end();
  }
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { PostgresAiReportTemplateRepository } from "./ai-report-template-repository";

test("migration cài đủ 10 mẫu hồ sơ pháp lý hiện hành và không sửa tài liệu lịch sử", async () => {
  const sql = await readFile(path.resolve(process.cwd(), "../../packages/database/migrations/0030_ai_regulatory_report_templates.sql"), "utf8");
  const codes = ["POLICY_SUBMISSION","DRAFT_SUBMISSION","POLICY_IMPACT_ASSESSMENT","POLICY_CODIFICATION_EXPLANATION","DIRECT_CODIFICATION_EXPLANATION","SPECIAL_IMPACT_ASSESSMENT","LEGAL_BASIS_REVIEW","IMPLEMENTATION_REVIEW","CONSULTATION_SYNTHESIS","DRAFT_COMPARISON"];
  for (const code of codes) assert.match(sql, new RegExp(`'${code}'`));
  assert.match(sql, /4231\/VBHN-BTP/);
  assert.match(sql, /Mẫu số 10 Phụ lục IV/);
  assert.doesNotMatch(sql, /UPDATE\s+legal_builder\.draft_version/i);
});

test("repository chỉ đọc phiên bản mẫu ACTIVE đang có hiệu lực", async () => {
  let query = "";
  const pool = { query: async (sql: string) => { query = sql; return { rowCount: 1, rows: [{ code:"CONSULTATION_SYNTHESIS",name:"Bản tổng hợp ý kiến, tiếp thu, giải trình",document_kind_code:"SYNTHESIS",version_code:"2025.07.01",effective_from:"2025-07-01",legal_basis:{primary:{number:"4231/VBHN-BTP",date:"2025-07-15",instrument:"Nghị định hợp nhất",provision:"Mẫu số 09 Phụ lục IV"},status:"CURRENT_VERIFIED_2026-09-02"},prompt_instruction:"Không tự quyết định tiếp thu.",output_outline:["Ý kiến","Dự kiến xử lý"] }] }; } };
  const template = await new PostgresAiReportTemplateRepository(pool as never).requireActive("CONSULTATION_SYNTHESIS");
  assert.match(query, /status_code='ACTIVE'/);
  assert.match(query, /effective_from<=CURRENT_DATE/);
  assert.equal(template.versionCode, "2025.07.01");
  assert.equal(template.legalBasis.primary.provision, "Mẫu số 09 Phụ lục IV");
});

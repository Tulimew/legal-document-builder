import type { Pool } from "pg";
import { AppError } from "./errors";

export type AiReportTemplate = {
  code: string;
  name: string;
  documentKind: string;
  versionCode: string;
  effectiveFrom: string;
  legalBasis: {
    primary: { number: string; date: string; instrument: string; provision: string };
    secondary?: { number: string; provision: string };
    status: string;
  };
  instruction: string;
  outline: string[];
};

export class PostgresAiReportTemplateRepository {
  constructor(private readonly pool: Pool) {}

  async listActive(): Promise<AiReportTemplate[]> {
    const result = await this.pool.query(`
      SELECT d.code,d.name,d.document_kind_code,v.version_code,v.effective_from,
             v.legal_basis,v.prompt_instruction,v.output_outline
      FROM legal_builder.ai_report_template_definition d
      JOIN legal_builder.ai_report_template_version v ON v.definition_code=d.code
      WHERE d.status_code='ACTIVE' AND v.status_code='ACTIVE'
        AND v.effective_from<=CURRENT_DATE
        AND (v.effective_to IS NULL OR v.effective_to>=CURRENT_DATE)
      ORDER BY d.code
    `);
    return result.rows.map(mapTemplate);
  }

  async requireActive(code: string): Promise<AiReportTemplate> {
    const result = await this.pool.query(`
      SELECT d.code,d.name,d.document_kind_code,v.version_code,v.effective_from,
             v.legal_basis,v.prompt_instruction,v.output_outline
      FROM legal_builder.ai_report_template_definition d
      JOIN legal_builder.ai_report_template_version v ON v.definition_code=d.code
      WHERE d.code=$1 AND d.status_code='ACTIVE' AND v.status_code='ACTIVE'
        AND v.effective_from<=CURRENT_DATE
        AND (v.effective_to IS NULL OR v.effective_to>=CURRENT_DATE)
    `, [code]);
    if (!result.rowCount) throw new AppError("INVALID_REQUEST", "Mẫu báo cáo AI không tồn tại hoặc chưa có hiệu lực.");
    return mapTemplate(result.rows[0]);
  }
}

function mapTemplate(row: Record<string, unknown>): AiReportTemplate {
  return {
    code: String(row.code),
    name: String(row.name),
    documentKind: String(row.document_kind_code),
    versionCode: String(row.version_code),
    effectiveFrom: new Date(String(row.effective_from)).toISOString().slice(0, 10),
    legalBasis: row.legal_basis as AiReportTemplate["legalBasis"],
    instruction: String(row.prompt_instruction),
    outline: row.output_outline as string[],
  };
}

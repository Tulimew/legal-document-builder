import type { AssetRef } from "@legal-document-builder/contracts";
import type { Pool } from "pg";

export interface AvailableAssetVersion extends AssetRef {
  originalFileName: string;
  verificationStatus: string;
}

interface AssetRow { asset_id: string; asset_version_id: string; media_type: string; byte_size: string; checksum_sha256: string; original_file_name: string; verification_status_code: string }

export class PostgresAssetRepository {
  constructor(private readonly pool: Pool) {}
  async listAvailable(projectId: string): Promise<AvailableAssetVersion[]> {
    const result = await this.pool.query<AssetRow>(
      `SELECT a.id asset_id,av.id asset_version_id,av.media_type,av.byte_size,av.checksum_sha256,
              av.original_file_name,av.verification_status_code
         FROM legal_builder.asset a
         JOIN legal_builder.asset_version av ON av.asset_id=a.id
        WHERE a.project_id=$1 AND a.status_code='ACTIVE'
        ORDER BY av.created_at DESC,av.id`, [projectId],
    );
    return result.rows.map((row) => ({ assetId: row.asset_id, assetVersionId: row.asset_version_id, mediaType: row.media_type, byteSize: Number(row.byte_size), checksum: { algorithm: "SHA-256", value: row.checksum_sha256 }, originalFileName: row.original_file_name, verificationStatus: row.verification_status_code }));
  }
}

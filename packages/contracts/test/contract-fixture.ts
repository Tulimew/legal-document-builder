import {
  CONTRACT_VERSION,
  type AssetDescriptor,
  type DraftVersion,
  type LegalDocumentSnapshot,
  type SaveWorkspaceCommand,
  type TableBlock,
} from "../src";

export const legacyContractVersion = "1.0" as const;
export const legacyTableBlockFixture = {
  kind: "TABLE",
  rows: [],
} satisfies TableBlock;

export const assetDescriptorFixture = {
  contractVersion: CONTRACT_VERSION,
  assetId: "asset-sample-001",
  assetVersionId: "asset-version-sample-001",
  mediaType: "image/png",
  byteSize: 1024,
  checksum: {
    algorithm: "SHA-256",
    value: "0000000000000000000000000000000000000000000000000000000000000000",
  },
  originalFileName: "hinh-minh-hoa-gia-dinh.png",
  verificationStatus: "SAMPLE_NOT_VERIFIED",
  metadata: {},
  createdAt: "2026-08-30T15:00:00+07:00",
  createdBy: { userId: "user-sample", personId: "person-sample" },
} satisfies AssetDescriptor;

const document = {
  contractVersion: CONTRACT_VERSION,
  legalDocumentId: "legal-document-sample",
  documentTypeCode: "CIRCULAR_AMENDING_SAMPLE",
  relationType: "AMENDING_DOCUMENT",
  metadata: { title: "Dữ liệu kiểm thử, không có giá trị pháp lý" },
  ruleSet: {
    definitionId: "ruleset-circular",
    versionId: "ruleset-circular-v0.1",
    versionCode: "0.1",
  },
  nodes: [
    {
      id: "node-article-1",
      nodeTypeCode: "ARTICLE",
      parentNodeId: null,
      orderKey: "0001",
      title: "Phạm vi điều chỉnh",
      content: [
        {
          kind: "PARAGRAPH",
          spans: [{ text: "Nội dung hoàn toàn giả định dùng để kiểm tra hợp đồng." }],
        },
        {
          kind: "TABLE",
          tableId: "table-sample-001",
          caption: [{ kind: "PARAGRAPH", spans: [{ text: "Bảng dữ liệu giả định" }] }],
          verificationStatus: "SAMPLE_NOT_VERIFIED",
          metadata: {},
          rows: [
            {
              id: "table-row-001",
              cells: [
                {
                  id: "table-cell-001",
                  blocks: [{ kind: "PARAGRAPH", spans: [{ text: "Ô dữ liệu mẫu" }] }],
                },
              ],
            },
          ],
        },
        {
          kind: "FIGURE",
          figureId: "figure-sample-001",
          asset: {
            assetId: "asset-sample-001",
            assetVersionId: "asset-version-sample-001",
            mediaType: "image/png",
            byteSize: 1024,
            checksum: {
              algorithm: "SHA-256",
              value: "0000000000000000000000000000000000000000000000000000000000000000",
            },
          },
          alternativeText: "Hình minh họa hoàn toàn giả định.",
          caption: [{ kind: "PARAGRAPH", spans: [{ text: "Hình mẫu số 1" }] }],
          verificationStatus: "SAMPLE_NOT_VERIFIED",
          displayRoleCode: "ILLUSTRATION",
          metadata: {},
        },
      ],
      metadata: {},
      displayNumber: "Điều 1",
      lifecycleStatus: "ACTIVE",
    },
  ],
  sourceRelations: [],
} satisfies LegalDocumentSnapshot;

export const draftVersionFixture = {
  contractVersion: CONTRACT_VERSION,
  id: "draft-version-006",
  projectId: "project-sample",
  branchId: "branch-merged",
  code: "DT-006",
  name: "Phiên bản hợp nhất mẫu",
  parentVersionIds: ["draft-version-005"],
  mergedSourceVersionIds: ["draft-version-005", "draft-version-pa-002"],
  document,
  ruleSet: document.ruleSet,
  bases: [
    {
      id: "basis-merge-006",
      basisTypeCode: "MERGE",
      source: {
        sourceType: "DRAFT_VERSION",
        sourceId: "draft-version-pa-002",
        label: "Phương án PA-002 giả định",
      },
      roleCode: "PRIMARY_BASIS",
      summary: "Hợp nhất phương án giả định.",
      recordedAt: "2026-08-30T16:00:00+07:00",
      recordedBy: { userId: "user-sample", personId: "person-sample" },
    },
  ],
  sealedAt: "2026-08-30T16:00:00+07:00",
  sealedBy: { userId: "user-sample", personId: "person-sample" },
} satisfies DraftVersion;

export const saveWorkspaceFixture = {
  contractVersion: CONTRACT_VERSION,
  workspaceId: "workspace-sample",
  expectedRevision: 12,
  document,
  actor: { userId: "user-sample", projectMembershipId: "membership-sample" },
  correlationId: "correlation-sample-001",
} satisfies SaveWorkspaceCommand;

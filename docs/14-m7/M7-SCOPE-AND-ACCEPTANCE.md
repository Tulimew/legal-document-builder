# M7 — Governed Publishing & Release Artifacts

> Trạng thái: **PROPOSED SCOPE GATE**
>
> Baseline: `main@17b66a1514532576fd4f2b9648281bcea0d1ea4a`; M6 đã merge; 138/138 tests, lint/build/diff-check PASS; migrations `0001`–`0019`.

## 1. Objective

M7 biến immutable `DraftVersion` và dữ liệu nghiệp vụ PostgreSQL thành tài liệu DOCX/PDF được quản trị: input bất biến, template có phiên bản, job bền vững, binary ngoài PostgreSQL, checksum, provenance, kiểm tra đầu ra và `ReleasePackage` bị khóa. M7 hoàn thành đường đi thủ công từ nội dung cấu trúc đến artifact có thể kiểm tra lại mà không biến DOCX/PDF thành nguồn nội dung thứ hai.

M7 không phải nghiệm thu NAS/production. Storage được đi qua port; adapter development dùng filesystem riêng có root cấu hình rõ. Production IAM, chữ ký số, tích hợp hệ thống quản lý văn bản, AI và lựa chọn NAS/S3 cụ thể nằm ngoài M7.

## 2. Why this milestone is next

Sau M6, editor, immutable version, comparison, provenance, fork và merge đã có baseline persistent. Khoảng trống lớn nhất trong phạm vi sản phẩm v1 là đầu ra được quản trị: export hiện chạy phía browser, template JSON còn prototype, binary không được lưu qua `StoragePort`, chưa có `GeneratedDocument`, publishing job hoặc `ReleasePackage`. Xử lý khoảng trống này trước deployment giúp chốt data lifecycle và audit boundary mà chưa phụ thuộc nhà cung cấp identity hay loại NAS.

## 3. Baseline classification

| Capability | Trạng thái sau M6 |
| --- | --- |
| Canonical structured snapshot | **IMPLEMENTED** |
| Immutable DraftVersion/checksum/graph | **IMPLEMENTED** |
| Persistent review/comparison/provenance | **IMPLEMENTED** |
| Client-side review/comparison DOCX | **PROTOTYPE** — có QA nội dung nhưng chưa là governed artifact |
| Template JSON | **PROTOTYPE** — có ID/version nhưng chưa persisted/immutable/approved |
| Asset metadata/version | **IMPLEMENTED FOUNDATION** — binary/storage lifecycle chưa có |
| StoragePort và filesystem adapter | **NOT IMPLEMENTED** |
| Durable publishing job/worker | **NOT IMPLEMENTED** |
| GeneratedDocument | **NOT IMPLEMENTED** |
| ReleasePackage/ReleasePackageItem | **NOT IMPLEMENTED** |
| Production PDF renderer | **NOT IMPLEMENTED** |
| Production IAM/NAS/backup/restore | **NOT IMPLEMENTED / OUT OF SCOPE** |

## 4. Invariants inherited from M1–M6

1. Chỉ immutable `DraftVersion` được dùng làm nguồn nội dung dự thảo trong publishing/release; workspace không được đưa trực tiếp vào gói.
2. DOCX/PDF là output có thể tái tạo, không phải authoritative legal content và không được ghi ngược vào snapshot.
3. Mỗi artifact ghi exact source version, RuleSet version, template version, renderer version và checksum input/output.
4. Template/version đã được artifact hoặc release tham chiếu là bất biến; sửa mẫu tạo version mới.
5. Binary nằm ngoài PostgreSQL; DB chỉ lưu metadata, byte size, media type, checksum và opaque storage key.
6. Storage key/path nội bộ không xuất hiện trong public DTO, URL hoặc log nhạy cảm.
7. Retry tạo cùng logical job phải idempotent; regenerate có chủ ý tạo `GeneratedDocument` mới, không overwrite artifact cũ.
8. `ReleasePackage` sau khi sealed là bất biến. Thay đổi item/metadata tạo package mới hoặc revision mới rõ ràng, không sửa tại chỗ.
9. Job failure không thay đổi DraftVersion, approval, source data hoặc artifact đã thành công trước đó.
10. Mọi chuyển trạng thái quan trọng có actor/authority/correlation/audit; worker không tự cấp thẩm quyền nghiệp vụ.
11. Không giả lập provenance, không dùng localStorage/mock làm publishing state, không lưu binary trong JSONB.
12. Không coi thành công development filesystem/PDF QA là nghiệm thu NAS hoặc production.

## 5. Delivery phases

### Phase 1 — Persisted template and publication contracts

- Thêm contracts/schema cho `PublishingTemplateDefinition`, immutable `PublishingTemplateVersion`, `PublishingJob`, `GeneratedDocument`, `ReleasePackage` và typed item.
- Backfill có kiểm soát hai template prototype hiện có thành version `DEVELOPMENT_ONLY`; giữ nguyên ID/version hiện có khi hợp lệ, không tuyên bố là mẫu pháp lý đã duyệt.
- Template payload chỉ chứa cấu hình renderer được allowlist; không lưu/execute arbitrary code, HTML hoặc path.
- Thêm permission tối thiểu: template read/manage, publishing request/read, generated document read, package create/seal/read.
- API validation và repository PostgreSQL; trạng thái và transition bị ràng buộc ở server/DB.

### Phase 2 — StoragePort and immutable artifact storage

- Định nghĩa `StoragePort`: put-once, open/read, stat/verify và existence check; delete không nằm trong M7 public workflow.
- Development filesystem adapter dùng root tuyệt đối từ environment, storage key do server sinh và chống path traversal/symlink escape.
- Ghi file theo temporary sibling + atomic rename; checksum/size được tính khi stream, sau đó verify lại từ storage.
- Không trả physical path; download đi qua API authorization và headers an toàn.
- Failure trước DB finalize phải cleanup temp; failure sau binary write nhưng trước DB commit được đánh dấu orphan để reconciliation, không bị coi là artifact thành công.

### Phase 3 — Durable publishing job and DOCX renderer

- PostgreSQL job queue với claim bằng `FOR UPDATE SKIP LOCKED`, lease, bounded retry, terminal failure và recovery sau process restart.
- Request job khóa exact immutable inputs và idempotency key. Worker renderer là tiến trình logic riêng nhưng dùng cùng codebase/modular monolith.
- Server-side DOCX renderer cho ít nhất:
  - canonical draft document từ `DraftVersion`;
  - review synthesis từ persistent comments/resolutions/linked changes;
  - draft comparison từ hai immutable versions và thuyết minh persistent nếu có.
- Renderer giữ tiếng Việt, Unicode, Times New Roman baseline, hierarchy, paragraph/list/table/figure/caption, before/after và provenance summary theo template.
- `GeneratedDocument` chỉ chuyển `AVAILABLE` sau render, OOXML structural checks, storage verify và DB finalize thành công.

### Phase 4 — PDF rendition and governed ReleasePackage

- PDF là rendition từ exact generated DOCX hoặc trực tiếp cùng immutable render input; lineage phải khai báo rõ, không suy đoán.
- PDF engine được cô lập sau port. Nếu runtime hiện có không đáp ứng Unicode/table/figure và deterministic acceptance, được đề xuất dependency/tool tối thiểu kèm license/deployment impact trước khi cài.
- Tạo package từ typed items: DraftVersion, GeneratedDocument và SupportingDocument; item role/order/label rõ.
- Package validation kiểm tra project ownership, artifact availability/checksum, source-version consistency, required DOCX/PDF pair và workflow/RuleSet blockers được cấu hình.
- Seal package bằng actor có quyền, authority basis và expected revision; transaction ghi package manifest checksum và audit. Sealed package/item bất biến.

### Phase 5 — Download, verification and end-to-end acceptance

- UI quản lý job/artifact/package trên dữ liệu PostgreSQL thật; không đưa storage key ra client.
- Authorized download stream từ StoragePort; unauthorized/cross-project actor bị từ chối trước khi mở binary.
- Verification endpoint/command đối chiếu DB metadata, stored bytes, SHA-256, package manifest, exact source/template/renderer lineage.
- Browser E2E: chọn DraftVersion → request DOCX/PDF → quan sát durable status → tải → tạo/seal package → verify.
- Restart/retry, concurrent workers, stale package revision, rollback, missing/corrupt binary và idempotency được integration test.

## 6. Locked M7 decisions

### M7-D01 — Storage neutrality

Domain/application chỉ biết opaque storage key qua `StoragePort`. M7 cung cấp development filesystem adapter; không chọn NAS vendor, SMB mount hay S3-compatible production adapter.

### M7-D02 — Binary immutability

Put-once theo generated ID/version. Không overwrite binary đã có metadata hoặc package reference. Cleanup chỉ áp dụng temp/orphan theo reconciliation có audit.

### M7-D03 — Template governance

Template definition có nhiều immutable versions. Chỉ status `APPROVED` mới được dùng cho governed release; `DEVELOPMENT_ONLY` được dùng cho test/artifact development nhưng package phải hiển thị không phải production release.

### M7-D04 — Job durability

PostgreSQL là queue baseline; không thêm Redis/RabbitMQ/Kafka. Claim dùng lease và `SKIP LOCKED`; retry hữu hạn, backoff xác định và lỗi được giảm thiểu dữ liệu nhạy cảm.

### M7-D05 — Idempotency

Idempotency key cùng project, operation và canonical input fingerprint trả cùng job/result. Regenerate với key mới tạo artifact mới và lineage riêng.

### M7-D06 — Renderer provenance

Renderer code/version là input audit. Artifact checksum không được dùng thay cho source content identity; cả source snapshot checksum và output checksum đều được lưu.

### M7-D07 — PDF boundary

PDF không được tạo bằng browser print như đường production. Engine phải chạy server/worker, có health/capability check và được test với tiếng Việt, bảng và hình. Quyết định engine cụ thể được phép hoãn đến Phase 4 evidence gate.

### M7-D08 — Release sealing

`DRAFT` package có optimistic revision; `SEALED` package và item bất biến. M7 không triển khai chữ ký số hay trạng thái pháp lý “đã ban hành”; seal chỉ là khóa gói trong hệ thống.

### M7-D09 — Authorization boundary

M7 dùng IAM/membership/delegation hiện có và không hard-code development actor. Production identity provider không thuộc scope, nhưng mọi API/download vẫn phải enforce permission server-side.

### M7-D10 — No historical fabrication

Không backfill `GeneratedDocument`, job, package hoặc approval cho file DOCX/PDF từng được tạo phía client. Chỉ template prototype có thể được backfill thành `DEVELOPMENT_ONLY` với provenance migration rõ.

## 7. Data model acceptance

### PublishingTemplateVersion

- exact definition/version identity, status, renderer kind, schema version, immutable configuration, provenance và approval metadata;
- constraint status/configuration; immutable sau khi được job/artifact tham chiếu.

### PublishingJob

- project, requested artifact kind, immutable input descriptor/fingerprint, idempotency key;
- `QUEUED | RUNNING | SUCCEEDED | FAILED | CANCELLED` với transition hợp lệ;
- lease owner/expiry, attempts/max attempts, sanitized error, timestamps và actor request.

### GeneratedDocument

- project, job, kind/media type, exact source IDs/checksums, template and renderer versions;
- opaque storage key, byte size, output checksum, verification status/time;
- immutable khi `AVAILABLE`; regenerate tạo row mới.

### ReleasePackage

- project, code/name/purpose, status `DRAFT | SEALED | SUPERSEDED`, revision, authority basis;
- typed items với stable order/role và cross-project/type constraints;
- canonical manifest JSON/checksum khi sealed; sealed package/item immutable.

## 8. Acceptance criteria

### Persistence and invariants

- [ ] Migrations forward-only; không rewrite snapshot/UUID/checksum lịch sử.
- [ ] Prototype template backfill chỉ tạo `DEVELOPMENT_ONLY` record có provenance rõ.
- [ ] Invalid job/package transitions bị DB/server từ chối và rollback.
- [ ] Sealed artifact/package/item không update/delete được.
- [ ] Cross-project source, template, artifact và package item bị từ chối.

### Storage and security

- [ ] Binary không nằm trong PostgreSQL/JSON/public DTO/log.
- [ ] Path traversal, absolute key, symlink escape và unauthorized download bị từ chối.
- [ ] Atomic write/checksum/size verification và orphan reconciliation được test.
- [ ] Missing/corrupt binary được báo `FAILED_VERIFICATION`, không giả `AVAILABLE`.

### Jobs and rendering

- [ ] Concurrent workers không claim cùng job; expired lease recover được.
- [ ] Idempotent duplicate request không tạo duplicate artifact.
- [ ] Retry hữu hạn; terminal failure giữ source và artifact cũ nguyên vẹn.
- [ ] DOCX mở được bằng Microsoft Word và có Unicode tiếng Việt, hierarchy, LIST/TABLE/FIGURE/caption/reference/provenance cần thiết.
- [ ] PDF mở/render được và giữ Unicode, bảng, hình, pagination tối thiểu.
- [ ] Output checksum verify được sau storage round-trip.

### Release package

- [ ] Chỉ immutable version và available verified document được đưa vào gói.
- [ ] Draft package có optimistic concurrency; stale update rollback.
- [ ] Seal kiểm tra required items/gates, ghi manifest checksum, authority và audit trong transaction.
- [ ] Sealed package không mutate; thay đổi tạo package mới/supersede rõ ràng.
- [ ] Package verification tái lập manifest từ persistent metadata mà không synthetic provenance.

### Quality gates

- [ ] Unit tests cho renderer mapping, manifest canonicalization, state machines và storage key validation.
- [ ] PostgreSQL integration cho migrations, job claim/retry/idempotency, artifact finalize, package seal/rollback.
- [ ] Filesystem integration trong temporary root; không ghi ngoài test root.
- [ ] Browser E2E cho request/status/download/package/seal/verify.
- [ ] DOCX visual/structural QA bằng Microsoft Word; PDF render/inspect QA.
- [ ] `npm.cmd test`, lint, production build và `git diff --check` PASS.

## 9. Explicitly out of scope

- Production NAS/S3 adapter selection, deployment packaging, backup/restore, RPO/RTO and performance certification.
- Production identity provider, SSO, directory provisioning and secret management platform.
- Digital signature, timestamp authority, official issuance number or integration with document-management/portal systems.
- AI drafting, summarization, provider policy or external data transfer.
- OCR, bulk PDF extraction, conversion of arbitrary uploaded Office documents or reverse import into canonical content.
- Public release portal, email distribution, CDN and external sharing links.
- Production-approved legal templates unless supplied and approved by the owner/authority.

## 10. Delivery sequence and commit gates

1. `feat(m7): persist publishing templates and artifact contracts`
2. `feat(m7): add immutable storage port and filesystem adapter`
3. `feat(m7): add durable DOCX publishing jobs`
4. `feat(m7): add PDF rendition and governed release packages`
5. `test(m7): complete publishing and release acceptance`

Mỗi phase chỉ commit/push sau acceptance tương ứng, tests, lint/build và diff-check. Không merge `main` giữa phase.

## 11. Stop conditions during implementation

Implementation chỉ phải dừng khi cần: thay business invariant/version immutability; backfill artifact/history không có evidence; chọn/cài PDF engine có license hoặc deployment impact không rõ; thêm dependency nền tảng lớn; thay production IAM/NAS boundary; xóa/ghi đè binary có reference; hoặc chuẩn bị merge M7 vào `main`.

## 12. Definition of Done

M7 là `READY TO MERGE` khi một immutable DraftVersion có thể tạo DOCX/PDF qua durable job, lưu/verify binary qua StoragePort, tập hợp thành sealed ReleasePackage có manifest/provenance bất biến, tải có authorization và tái kiểm tra checksum/lineage end-to-end trên PostgreSQL development thật. Verdict này không đồng nghĩa production identity, official issuance, chữ ký số hoặc NAS deployment readiness.

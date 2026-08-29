# M3 Handoff — Legal Document Builder

> Thời điểm khảo sát: 29/08/2026 (Asia/Saigon)  
> Repository: `Tulimew/legal-document-builder`  
> Phạm vi snapshot: nhánh `codex/m3-persistent-review`, commit `d44bd3b` trước khi tạo tài liệu này.

## Quy ước mức độ xác nhận

Tài liệu dùng các nhãn sau để tránh biến thiết kế thành tuyên bố đã triển khai:

- **[CODE]**: xác nhận trực tiếp trong source code, migration, contract hoặc test hiện tại.
- **[DOCS]**: quyết định/thiết kế được ghi trong tài liệu repository; có thể rộng hơn code.
- **[GIT]**: xác nhận từ lịch sử commit, nhánh hoặc diff.
- **[CONVERSATION]**: đã được người dùng và Codex thống nhất trong thread hiện tại.
- **[CHƯA TRIỂN KHAI]**: có chủ đích nhưng chưa có luồng thực thi hoàn chỉnh trong code.
- **[CẦN XÁC MINH]**: thiếu bằng chứng hoặc cần người dùng/chuyên gia xác nhận.

## 1. Executive Summary

Legal Document Builder là ứng dụng hỗ trợ xây dựng mới hoặc sửa đổi, bổ sung văn bản quy phạm pháp luật. Nguyên tắc trung tâm là nội dung pháp lý có cấu trúc mới là nguồn dữ liệu chính; DOCX/PDF chỉ là đầu ra trình bày. Hệ thống phải hoạt động thủ công đầy đủ khi không có AI; AI không được tự phê duyệt, tự tiếp thu hoặc ghi đè dự thảo chính. **[DOCS][CONVERSATION]**

Kiến trúc baseline là modular monolith TypeScript, UI/API bằng Next.js, PostgreSQL là nguồn dữ liệu giao dịch, binary dự kiến nằm ngoài CSDL, và các tích hợp identity/storage/AI phải đi qua ranh giới adapter. Quyết định này có ADR và không nên bị thay bằng microservice chỉ vì sở thích kiến trúc. **[DOCS]** Code hiện tại mới thực hiện một modular monolith gọn trong `app/web` cùng package contract và migration; chưa có các package `domain`, `application`, `infrastructure`, `publishing` độc lập như cấu trúc đích trong tài liệu. **[CODE]**

M1 hình thành nguyên mẫu UI/UX và mô hình Structured Legal Editor bằng dữ liệu mẫu. **[GIT][CODE]** M2 chuyển phần nền nghiệp vụ quan trọng sang PostgreSQL: workspace có revision, workflow stage, IAM baseline, góp ý, thảo luận, kết luận họp, phạm vi sửa nhiều văn bản, phiếu thay đổi Bước 4 và transaction chốt DraftVersion/LegalChange. **[GIT][CODE]** M3 hiện tại hoàn thiện lát cắt xử lý góp ý bền vững: đọc toàn bộ lịch sử `CommentResolution`, đọc `DraftLegalNodeChange` đã chốt, bắt buộc kết quả tiếp thu liên kết đúng phiên bản áp dụng, và xuất DOCX tổng hợp từ dữ liệu góp ý PostgreSQL trên màn M3. **[GIT][CODE][CONVERSATION]**

M3 không phải bản production/NAS. Editor trung tâm vẫn phụ thuộc đáng kể vào `mock-data` và localStorage cho một số màn/prototype. So sánh phiên bản, structural mapping, timeline, tooltip/panel truy nguyên có UI phong phú nhưng hiện dựa trên dữ liệu mẫu; backend chưa có API diff tổng quát cho hai DraftVersion bất kỳ. **[CODE]** Worker xuất bản, StoragePort, ReleasePackage, file persistence, PDF, AI thật, identity provider thật, backup/restore NAS và observability production chưa được triển khai. **[CODE][DOCS]**

PostgreSQL development trên PC đã được cài đặt và trước task handoff đã có database seed/migration chạy được. **[CONVERSATION]** Tuy nhiên tài liệu này không kiểm tra cấu hình production, không kiểm tra NAS, và không coi dữ liệu development là dữ liệu pháp lý thật. **[CẦN XÁC MINH]**

Vòng nghiệm thu P0 đã chạy kịch bản end-to-end có LegalChange thật trên PostgreSQL development: nhập góp ý → ghi quan điểm → kết luận họp → tạo/duyệt phiếu Bước 4 → chốt phiên bản → ghi resolution liên kết change → kiểm tra DOCX và truy vết hai chiều. Việc tiếp theo là người dùng review kết quả và quyết định merge M3; không mở M4 trước quyết định đó. **[CODE][CONVERSATION]**

## 2. Mục tiêu của M3

M3 giải quyết khoảng trống còn lại sau M2: dữ liệu góp ý đã có PostgreSQL nhưng màn tổng hợp chưa ghi kết quả xử lý, chưa đọc lịch sử, và `listComments` trả `linkedChangeIds` rỗng dù schema đã có bảng nối. **[GIT][CODE]**

Mục tiêu được thống nhất:

1. Góp ý, quan điểm thành viên và quyết định họp tồn tại trong PostgreSQL. **[CONVERSATION]** Phần lớn đã có từ M2; M3 sử dụng lại. **[CODE]**
2. Kết quả tiếp thu/giải trình có lịch sử bất biến và liên kết được với thay đổi dự thảo/căn cứ nghiệp vụ. **[CONVERSATION][CODE]**
3. Màn tổng hợp M3 không dùng localStorage khi cấu hình development PostgreSQL tồn tại. **[CONVERSATION][CODE]**
4. DOCX tổng hợp lấy Comment/CommentResolution từ PostgreSQL, không lấy kho góp ý localStorage trong nhánh persistent. **[CONVERSATION][CODE]**
5. Không tích hợp AI thật, không triển khai production/NAS trong mốc này. **[CONVERSATION]**

## 3. Tiến trình M1 → M2 → M3

| Mốc | Mục tiêu | Thay đổi chính | Quyết định quan trọng | Hạn chế còn lại |
| --- | --- | --- | --- | --- |
| M1 | Khám phá UX và mô hình nội dung | Next.js prototype; dashboard, editor ba cột, cây cấu trúc, so sánh, góp ý, họp; dữ liệu mẫu/localStorage | Structured Legal Editor là nguồn chính; phân biệt stable ID và số hiển thị | Chưa persistence thật; UI có thể mô phỏng hành vi chưa có backend |
| M2 | Nền nghiệp vụ và persistence development | Contracts 1.1; migration `0001`–`0013`; IAM, workflow, workspace, review, deliberation, meeting, amendment target/layout, Step 4 finalization; seed development | PostgreSQL là source of truth cho các luồng đã nối; Step và DraftVersion là hai trục; record quan trọng bất biến; transaction + audit | UI/editor/diff vẫn pha trộn mock/localStorage; thiếu integration/E2E rộng; chưa production |
| M3 | Khép kín xử lý góp ý và truy nguyên tới thay đổi đã chốt | GET history resolution; GET draft changes; aggregate linked changes; UI ghi resolution mới; kiểm tra cùng effective version; DOCX persistent; docs M3 | Tiếp thu phải gắn change + effective DraftVersion; không tiếp thu phải giải trình; sửa sai bằng sequence mới | Fixture nghiệm thu động đã có LegalChange thật và DOCX đã được kiểm thử; diff/editor ngoài lát cắt M3 vẫn chưa persistent hoàn toàn |

Nguồn: M1/M2 được tổng hợp từ git history và code; tên mốc M1 không xuất hiện như một commit riêng nên ranh giới M1 là diễn giải có kiểm soát. **[GIT][CẦN XÁC MINH]** M3 là commit riêng `d44bd3b`. **[GIT]**

## 4. Trạng thái sản phẩm tại M3

### Đã hoàn thành trong phạm vi development

- API health và pool PostgreSQL. **[CODE]**
- Migration runner forward-only và seed development có guard database `_dev`. **[CODE]**
- Workspace GET/PUT, optimistic revision, validation cây cơ bản và audit. **[CODE]**
- Workflow version/stage instance baseline, gán workflow, tạo/cập nhật lần thực thi. **[CODE]**
- IAM baseline: user/person/organization/membership/role/delegation/permission và server authorization. **[CODE]**
- Ghi/đọc góp ý; ghi/đọc quan điểm thành viên; ghi/đọc quyết định họp. **[CODE]**
- Phiếu thay đổi Bước 4, quyết định duyệt/từ chối/yêu cầu sửa, readiness và finalization transaction. **[CODE]**
- Finalization tạo checkpoint, DraftVersion, parent edge, node states, DraftLegalNodeChange, bases, audit và tăng workspace revision. **[CODE]**
- M3 đọc lịch sử resolution và linked changes; ghi resolution mới theo sequence. **[CODE]**
- M3 xuất DOCX tổng hợp từ Comment/CommentResolution persistent. **[CODE]**

### Đã có nhưng chưa hoàn chỉnh

- Editor tải nội dung workspace PostgreSQL và có thể nhận nội dung điền trước từ kết luận, nhưng cấu trúc trang, node selection, comments và nhiều view vẫn xuất phát từ `mock-data`. **[CODE]**
- UI so sánh có net/evolution/step, marker, filters, panel provenance và structural mapping, nhưng toàn bộ graph/change/evolution/mapping là dữ liệu mẫu phía client. **[CODE]**
- DOCX tổng hợp và bản so sánh chạy phía client bằng `docx`; DOCX persistent đã có kiểm thử nội dung OOXML và kiểm tra bằng Microsoft Word, nhưng chưa có worker, GeneratedDocument, checksum hoặc StoragePort. **[CODE]**
- Workflow, amendment layout, deliberation và Step 4 có fallback prototype/localStorage khi thiếu cấu hình. **[CODE]**
- Contract/schema cho bảng, hình và asset đã có; luồng upload/storage thực chưa có. **[CODE]**
- Database schema hỗ trợ branch, merge edges và far comparison data, nhưng use case/API tổng quát chưa có. **[CODE]**

### Đang triển khai

- Nhánh `codex/m3-persistent-review` đang chờ review/merge vào `main`. **[GIT]**
- Handoff này là thay đổi tài liệu chưa commit theo yêu cầu task. **[GIT]**

### Chưa triển khai

- Identity provider thực; hiện chỉ có adapter từ chối mặc định và chế độ development header. **[CODE]**
- File storage/NAS/S3 adapter, upload/download có quyền, ReleasePackage và GeneratedDocument persistence. **[CHƯA TRIỂN KHAI]**
- Worker/job queue thực, PDF pipeline, OCR. **[CHƯA TRIỂN KHAI]**
- AI provider, prompt/evaluation/guardrail runtime. **[CHƯA TRIỂN KHAI]**
- Collaboration realtime, soft lock hoàn chỉnh, undo/redo/checkpoint UI thực. **[CHƯA TRIỂN KHAI]**
- API diff hai DraftVersion bất kỳ, merge workflow và conflict resolution tổng quát. **[CHƯA TRIỂN KHAI]**
- Production deployment, backup/restore, monitoring, RPO/RTO và security hardening. **[CHƯA TRIỂN KHAI]**

## 5. Kiến trúc hiện tại

### Kiến trúc thực tế trong code

```text
app/web (Next.js 16 + React 19 + TypeScript)
├─ src/app                 Pages và /api/v1 Route Handlers
├─ src/components          UI editor/review/workflow
├─ src/server              Repository SQL, auth, identity, validation, HTTP
├─ src/lib                 mock/prototype stores, development mapping, DOCX
└─ scripts                 migration runner và development seed

packages/contracts         TypeScript DTO + JSON Schema v1/v1.1
packages/database          PostgreSQL migrations 0001–0013
docs                       Business/domain/UI/architecture decisions
```

- Next.js App Router cung cấp cả presentation và BFF/API. **[CODE]**
- Repository dùng SQL trực tiếp qua `pg`; không có ORM. **[CODE]**
- Transaction boundary nằm trong repository cho các use case quan trọng. **[CODE]**
- Validation request là hàm TypeScript thủ công; JSON Schema chủ yếu mô tả contract nội dung/drafting, chưa được dùng làm validation runtime chung cho mọi API. **[CODE]**
- Domain/application chưa tách package; logic nghiệp vụ hiện nằm trong `src/server/*-repository.ts` và `validation/*`. **[CODE]**
- PostgreSQL dùng quan hệ cho identity/workflow/provenance và JSONB cho snapshot/nội dung cấu trúc phù hợp. **[CODE]**

### Kiến trúc đã quyết định nhưng chưa hiện thực đầy đủ

- Modular monolith có domain/application độc lập framework. **[DOCS]**
- Binary ngoài PostgreSQL qua StoragePort. **[DOCS][CHƯA TRIỂN KHAI]**
- Worker riêng và PostgreSQL job queue cho xuất bản. **[DOCS][CHƯA TRIỂN KHAI]**
- AI/identity/storage qua port-adapter. **[DOCS][CHƯA TRIỂN KHAI]**

## 6. Mô hình nghiệp vụ đã chốt

| Khái niệm | Ý nghĩa | Quan hệ |
| --- | --- | --- |
| Hồ sơ (`LegalDocumentProject`) | Không gian vòng đời của một sáng kiến văn bản | Chứa workflow được gán, thành viên, văn bản, nhánh, workspace, đợt xử lý và audit |
| Bước | Định nghĩa nghĩa vụ/cổng trong một WorkflowVersion | Không phải DraftVersion; có thể lặp/song song theo cấu hình |
| Lần thực thi bước (`WorkflowStageInstance`) | Một lần kích hoạt cụ thể của bước | Có sequence, trạng thái, gate, người phụ trách; một bước có nhiều instance |
| Đợt xử lý (`ReviewRound`) | Hoạt động nghiệp vụ có ranh giới như lấy ý kiến/họp/chỉnh lý | Có thể gắn một DraftVersion nguồn; không thay thế stage instance |
| Workspace | Trạng thái biên tập có thể sửa của một nhánh | Autosave/revision không đồng nghĩa tạo DraftVersion |
| DraftVersion | Snapshot chính thức bất biến | Thuộc đúng một nhánh; có parent/merge sources và căn cứ |

Các quan hệ không phải một-một. Một bước có thể không tạo hoặc tạo nhiều DraftVersion; một DraftVersion có thể đi qua nhiều đợt/bước. Không giới hạn nghiệp vụ số vòng hay số phiên bản. **[DOCS]** Schema và repository hiện hỗ trợ phần nền của quan hệ này. **[CODE]**

## 7. Structured Legal Content Model

`LegalDocumentSnapshot` chứa metadata, loại văn bản/quan hệ, RuleSet version, source relations và mảng `LegalNode`. Mỗi LegalNode có stable UUID, `nodeTypeCode`, parent ID, order key, title, content blocks, metadata, display number và lifecycle status. **[CODE]**

| Thành phần | Contract/thiết kế | Trạng thái runtime M3 |
| --- | --- | --- |
| Phần | `nodeTypeCode` cấu hình; sample dùng `SECTION` | Có trong contract/schema và seed/editor mẫu |
| Chương | `CHAPTER` | Có trong contract/schema và seed/editor mẫu |
| Mục | Loại node cấu hình | Có trong thiết kế; seed mẫu không chứng minh đầy đủ |
| Tiểu mục | Loại node cấu hình | Có trong thiết kế; cần xác minh RuleSet/runtime |
| Điều | `ARTICLE` | Có trong contract, review target và seed |
| Khoản | `CLAUSE` | Có trong contract, review target và seed |
| Điểm | `POINT` | Có trong contract, review target và seed |
| Đoạn nội dung | `ParagraphBlock` gồm `InlineSpan` | Có trong contract/schema và workspace persistence |
| Danh sách | `ListBlock` | Có contract/schema; editor runtime chưa chứng minh biên tập đầy đủ |
| Bảng | `TableBlock` | Có contract/schema 1.1; UI/runtime còn hạn chế |
| Hình | `FigureBlock` + AssetRef | Có contract/schema/database metadata; storage/upload chưa có |

Stable identity không đồng nhất với `displayNumber`. Đánh lại số hoặc di chuyển giữ cùng LegalNode ID. **[DOCS]** Database lưu node state theo version và unique `(draft_version_id, legal_node_id)`. **[CODE]**

## 8. Versioning tại M3

### Đã code

- Workspace có revision và optimistic concurrency. **[CODE]**
- Finalization Bước 4 yêu cầu expected revision, version code/name, completion report và authority basis. **[CODE]**
- Server khóa workspace, kiểm tra proposal, before/after conflict và code version trùng. **[CODE]**
- Transaction tạo `PRE_VERSION` checkpoint, DraftVersion snapshot + SHA-256, parent edge, toàn bộ node states, DraftLegalNodeChange, version/change basis, finalization link và audit. **[CODE]**
- DraftVersion và các record provenance chính có trigger chặn UPDATE/DELETE. **[CODE]**
- Stable LegalNode ID đi qua `workspace_legal_node` và `legal_node_version_state`. **[CODE]**

### Đã quyết định trong docs/schema

- Graph version hỗ trợ `PARENT` và merge source; một version thuộc đúng một branch. **[DOCS][CODE]**
- Snapshot là trạng thái chính thức; delta/LegalChange giữ diễn biến và provenance. **[DOCS][CODE]**
- So sánh không liền kề phải dùng state đầu/cuối và đường version được chứng minh. **[DOCS]**

### Chưa làm đầy đủ

- UI “Tạo phiên bản” prototype cũ không phải use case persistent duy nhất; luồng thực nằm ở Step 4 finalization. **[CODE]**
- Chưa có API tạo branch/fork/merge và chọn path tổng quát. **[CHƯA TRIỂN KHAI]**
- Chưa có engine/API so sánh xa từ database. **[CHƯA TRIỂN KHAI]**
- Chưa có idempotency key riêng cho finalization ngoài correlation ID và uniqueness constraints. **[CẦN XÁC MINH]**

## 9. Diff tại M3

| Năng lực | Đã code | Chỉ thiết kế/mẫu |
| --- | --- | --- |
| Text diff | UI `<ins>/<del>` và before/after trong Step 4 | Dữ liệu ComparisonView là mock; chưa có diff engine server |
| Structural diff | UI mapping/view và loại “thay đổi cấu trúc” | Mapping là mock; chưa tính từ node states DB |
| Add/delete/edit/move | Contract có 6 DraftNodeChangeType; schema chấp nhận | Finalization hiện chỉ sinh `DRAFT_CONTENT_CHANGE` |
| Metadata | Change/proposal lưu actor, time, reason, status, effective version | Một số field UI lấy mock |
| Provenance/căn cứ | `draft_change_basis`, `draft_version_basis`, resolution-change, audit | Chưa có query/read model tổng hợp mọi nguồn |
| UI marker/tooltip/panel | Có marker, popover, trace panel, filters, timeline | Dữ liệu hiển thị chủ yếu từ mock-data |
| Alternative proposals/conflicts | ResolutionCase/Option/Decision và Step4 proposal/decision có PostgreSQL | Merge nhiều phương án/nhánh tổng quát chưa có |

Không được tuyên bố M3 đã có structural diff production hoặc far comparison chỉ dựa trên UI prototype. **[CODE]**

## 10. Các quyết định đã chốt

| Quyết định | Lý do | Ảnh hưởng | Nguồn |
| --- | --- | --- | --- |
| Structured Legal Editor là source of truth | Truy nguyên, tái tạo và nhiều đầu ra | Không dùng DOCX làm database nội dung chính | docs/conversation |
| Step và DraftVersion là hai trục độc lập | Workflow không đồng nhất với lịch sử nội dung | Không gắn cứng một version cho một step | docs/conversation/code |
| Stable node ID khác display number | Renumber/move không làm mất lịch sử | Diff/mapping dùng ID, không dùng số Điều | docs/code |
| DraftVersion và quyết định quan trọng bất biến | Cần audit và sửa sai có lịch sử | Sửa bằng record/version/sequence mới | docs/code |
| Mọi thay đổi phải truy nguyên căn cứ | Trách nhiệm nghiệp vụ | Change/version basis và audit là bắt buộc | docs/code |
| Tiếp thu phải gắn LegalChange và effective version | Không tuyên bố tiếp thu khi chưa có thay đổi thực | API validation + database relation | conversation/code |
| Không tiếp thu phải có giải trình | Trách nhiệm giải trình | Request bị từ chối nếu thiếu | docs/code |
| Backend là điểm thực thi quyền | Ẩn nút frontend không đủ | Mọi API gọi authorizeProject | docs/code |
| Modular monolith TypeScript | Transaction và vận hành NAS đơn giản | Không tự chuyển microservice | ADR/docs |
| PostgreSQL là dữ liệu giao dịch chính | Quan hệ, transaction, migration, audit | Không lưu toàn domain vào localStorage/JSON file | ADR/docs/code |
| Binary không lưu trong PostgreSQL | Tách backup DB và storage | StoragePort trong tương lai | ADR/docs |
| AI tùy chọn, không quyết định | An toàn và vận hành thủ công | AI chỉ đề xuất có metadata | docs/conversation |
| Không dùng dữ liệu thật trong seed/test/Git | An toàn dữ liệu | Seed phải hoàn toàn giả định | AGENTS/docs/code |

## 11. Các phương án đã loại bỏ

| Phương án | Lý do không chọn | Phương án đã chọn | Nguồn |
| --- | --- | --- | --- |
| Microservice từ đầu | Tăng vận hành, distributed transaction, chưa có bằng chứng scale | Modular monolith TypeScript | ADR |
| Nhồi logic vào Next.js route/component | Domain phụ thuộc framework, khó test/quyền dễ chỉ nằm frontend | Repository/application boundary, hướng tới package domain | ADR |
| Lưu toàn nghiệp vụ trong file/JSON blob | Yếu ràng buộc, transaction, migration và query | PostgreSQL quan hệ + JSONB có chủ đích | ADR |
| Lưu binary trong PostgreSQL | Làm nặng backup giao dịch và ghép storage với DB | Binary ngoài DB, metadata/checksum trong DB | ADR |
| Tự coi autosave là DraftVersion | Tạo quá nhiều phiên bản và sai nghĩa nghiệp vụ | Workspace revision/checkpoint riêng, version do người có quyền chốt | docs |
| Dùng số hiển thị làm identity | Renumber/move phá lịch sử | Stable UUID LegalNode | docs |
| AI tự chọn phương án/tiếp thu | Không có thẩm quyền và khó kiểm soát | Người có quyền ghi quyết định; AI chỉ hỗ trợ | docs/conversation |
| Tiếp thu mà không liên kết thay đổi | Không chứng minh nội dung đã cập nhật | Resolution bắt buộc linked change + version | conversation/code |

Không có bằng chứng trong thread hiện tại về các phương án sản phẩm khác đã bị người dùng loại bỏ ngoài các quyết định trên. **[CẦN XÁC MINH]**

## 12. File và module quan trọng

| File/thư mục | Vai trò | M3 | Ghi chú |
| --- | --- | --- | --- |
| `app/web/src/server/review-repository.ts` | Comment/resolution/draft change query | Trực tiếp | Lõi M3 persistent review |
| `.../comments/[commentId]/resolutions/route.ts` | GET history, POST resolution | Trực tiếp | Auth + validation + repository |
| `.../projects/[projectId]/draft-changes/route.ts` | GET LegalChange đã chốt | Trực tiếp | Mới ở M3 |
| `persistent-review-summary.tsx` | UI xử lý + lịch sử + link changes | Trực tiếp | PostgreSQL khi development configured |
| `review-export-toolbar.tsx` | DOCX tổng hợp | Trực tiếp | Persistent branch đọc API; prototype fallback còn tồn tại |
| `packages/contracts/src/review.ts` | DTO review M3 | Trực tiếp | Có `ReviewDraftChange` |
| `step4-change-repository.ts` | Proposal/decision/finalization | Nền M3 | Tạo change/version để resolution liên kết |
| `workspace-repository.ts` | Structured workspace persistence | Nền M3 | Optimistic revision + audit |
| `deliberation-repository.ts` | Opinions/options/decisions | Nền M3 | PostgreSQL từ M2 |
| `packages/database/migrations` | Schema vật lý | Nền M3 | `0001`–`0013`; M3 không thêm migration |
| `packages/contracts/src/legal-content.ts` | Structured legal model | Nền | Paragraph/list/table/figure |
| `comparison-view.tsx` và `mock-data.ts` | UI diff prototype | Liên quan | Không phải diff DB thực |
| `document-exports.ts` | Sinh DOCX phía client | Trực tiếp | Chưa publishing worker |
| `seed-development.mjs` | 3 hồ sơ giả định | Nền/test | Chưa seed LegalChange finalized cho M3 |
| `docs/10-kien-truc-ky-thuat/*` | Baseline kiến trúc | Nền | Một số nội dung rộng hơn code |

## 13. Git / Commit Map

| Commit | Vai trò |
| --- | --- |
| `dc6ac65` | Khởi tạo hệ tài liệu sản phẩm |
| `b302ca0` | Chốt mô hình nghiệp vụ nền |
| `9698ad9` | Thiết kế Structured Legal Editor |
| `e93effb` | Khởi tạo Next.js web app |
| `3cfa4dd` | P0 foundation: contracts, migrations, API, IAM/review/workspace và prototype review-to-draft |
| `5347463` | Workflow stage persistence |
| `1156b16` | Development seed có guard |
| `322c410` | Hoàn thiện M2 drafting workflow: deliberation, meeting, amendment, Step 4 finalization |
| `d44bd3b` | M3 persistent review resolution, history, linked changes và DOCX persistent |

`main` hiện ở `322c410`; M3 nằm trên nhánh `codex/m3-persistent-review`. **[GIT]**

## 14. Các invariant nghiệp vụ

- Một Step không bị giới hạn chỉ có một DraftVersion; hai trục độc lập. **[DOCS]**
- Autosave/workspace revision không tự tạo DraftVersion. **[DOCS][CODE]**
- DraftVersion đã chốt là bất biến; thay đổi tiếp theo tạo version mới. **[DOCS][CODE]**
- Mỗi DraftVersion thuộc đúng một branch; merge version truy nguyên source versions. **[DOCS][CODE]**
- LegalNode stable ID khác display number; renumber/move giữ ID. **[DOCS][CODE]**
- Cây LegalNode không chu trình; parent phải tồn tại; order key cùng cấp không trùng. **[CODE]**
- Comment, target, resolution và nhiều quyết định/provenance record là append-only. **[CODE]**
- Resolution sau supersede resolution trước bằng sequence; không UPDATE bản cũ. **[CODE]**
- `PARTIALLY_ACCEPTED` và `EXPLAINED_NOT_ACCEPTED` cần explanation. **[CODE]**
- Tiếp thu toàn bộ/một phần phải có effective DraftVersion và ít nhất một linked change; mọi linked change phải cùng effective version. **[CODE]**
- Ý kiến `OTHER` không được gắn giả tạo vào LegalNode; ý kiến cấu trúc phải có target node. **[CODE]**
- Step 4 finalization không chạy khi còn pending/revision requested/conflict hoặc không có proposal approved. **[CODE]**
- Actor/quyền được xác định phía server; request công khai không được tự khai actor đáng tin. **[CODE]**
- AI suggestion không phải quyết định pháp lý cuối cùng. **[DOCS][CONVERSATION]**
- Tài liệu/căn cứ pháp lý không được suy diễn; nguồn phải có metadata và verification. **[AGENTS][DOCS]**

## 15. Technical Debt

### Critical

- Chưa có production identity, storage, backup/restore và security validation; không được triển khai NAS ở trạng thái này. **[CODE]**
- Không còn blocker Critical nào trong phạm vi merge M3 sau vòng nghiệm thu P0 ngày 29/08/2026. Các thiếu sót production/NAS ở dòng trên nằm ngoài tiêu chí merge M3 nhưng vẫn là blocker triển khai thực tế. **[CODE][CONVERSATION]**

### High

- Editor/diff trung tâm còn dựa trên `mock-data` và localStorage; UI có thể tạo ấn tượng năng lực vượt backend. **[CODE]**
- Fixture integration tạo động LegalChange/DraftVersion thật trong PostgreSQL development; seed tĩnh vẫn chưa chứa sẵn chuỗi này. **[CODE]**
- DOCX vẫn sinh client-side và chưa persistence/checksum/template job, nhưng đã có integration test OOXML và đã mở/render thành công bằng Microsoft Word. **[CODE]**
- Domain/application vẫn nằm trong Next.js app thay vì package độc lập như ADR hướng tới. **[CODE][DOCS]**
- Thiếu read model/API provenance thống nhất từ comment → decision → proposal → change → version. **[CODE]**

### Medium

- Nhiều file được nén thành một dòng, làm giảm khả năng review/maintain. **[CODE]**
- `packages/database/README.md` chỉ liệt kê migration đầu, lỗi thời so với `0001`–`0013`. **[DOCS]**
- `app/web/README.md` vẫn mô tả chủ yếu prototype. **[DOCS]**
- Prototype fallback và persistent mode cùng tồn tại, tạo hai hành vi khác nhau. **[CODE]**
- Validation contract chưa thống nhất bằng schema runtime cho mọi endpoint. **[CODE]**
- Chưa có pagination/filter server cho danh sách comments/changes. **[CODE]**

### Low

- Một số mapping development ID ↔ local node ID hard-code. **[CODE]**
- Thông báo lỗi trong một số UI bị nuốt hoặc chỉ hiển thị notice đơn giản. **[CODE]**
- Chưa có test accessibility/responsive tự động cho UI M3. **[CODE]**

## 16. Open Questions

Không tự chốt các nội dung sau:

1. M4 chính thức tập trung vào nguồn/căn cứ pháp lý, hoàn thiện editor/diff persistent hay publishing/NAS trước? **[CẦN NGƯỜI DÙNG XÁC NHẬN]**
2. Identity provider/danh bạ thực tế của cơ quan là gì? **[CẦN XÁC MINH]**
3. NAS mục tiêu, kiểu storage, quyền file, backup, RPO/RTO và tải đồng thời? **[CẦN XÁC MINH]**
4. Quy tắc cấu trúc/đánh số chính thức cho từng loại văn bản và cơ chế phê duyệt RuleSet? **[CẦN CHUYÊN GIA]**
5. Mẫu DOCX/PDF chính thức và tiêu chí fidelity? **[CẦN NGƯỜI DÙNG/CHUYÊN GIA]**
6. Chính sách dữ liệu cho AI, vị trí xử lý và nhà cung cấp được phép? **[CẦN PHÊ DUYỆT]**
7. M1/M2/M3 có tiêu chí nghiệm thu chính thức ngoài trạng thái commit hiện tại không? **[CẦN NGƯỜI DÙNG XÁC NHẬN]**
8. Có cần bỏ hoàn toàn prototype fallback sau nghiệm thu M3 hay giữ làm demo? **[CẦN NGƯỜI DÙNG XÁC NHẬN]**

## 17. Backlog sau M3

### P0 — phải xử lý trước khi tiếp tục

Đã đóng trong vòng nghiệm thu ngày 29/08/2026:

1. [x] Fixture động tạo LegalChange đã finalization và chạy chuỗi M3 trên PostgreSQL development thật.
2. [x] Integration test cho resolution, history/supersede, ba loại kết quả, linked change, effective version, mismatch rollback và invalid actor.
3. [x] Kiểm tra DOCX ở mức OOXML, Microsoft Word và render trực quan: tiếng Việt, Times New Roman, bảng, góp ý, resolution, linked change, before/after.
4. [x] Chạy lại toàn bộ test, lint và production build.

P0 còn lại: người dùng review kết quả và quyết định merge. Không có blocker kỹ thuật P0 đã biết trong phạm vi M3; chưa được tự merge.

### P1 — chức năng cốt lõi tiếp theo

1. Chuyển editor và comparison từ mock/localStorage sang workspace/version/change API thật.
2. Xây read model provenance thống nhất và API diff hai DraftVersion.
3. Hoàn thiện branch/fork/merge và conflict handling persistent nếu vẫn trong phạm vi sản phẩm.
4. Hoàn thiện source document/legal basis verification theo metadata, không suy đoán hiệu lực.

### P2 — có thể làm sau

1. Publishing worker, GeneratedDocument, StoragePort và template version persistence.
2. ReleasePackage và gate trước phát hành.
3. Identity adapter thực, audit viewer, file access endpoint.
4. E2E browser test cho các luồng trọng yếu.

### P3 — tối ưu/nâng cấp

1. AI assistant có guardrail sau khi manual flow hoàn chỉnh và chính sách dữ liệu được duyệt.
2. Performance, pagination, caching/read model optimization.
3. Observability, job metrics, accessibility và responsive hardening.
4. NAS packaging chỉ sau khảo sát hạ tầng và test backup/restore.

## 18. Hướng dẫn cho AI reviewer khác

- Có thể phản biện implementation, test coverage, SQL, UX, security, performance và thứ tự backlog.
- Không tự thay đổi các invariant/decision tại mục 10 và 14; nếu cần thay đổi phải nêu bằng chứng, tác động dữ liệu và ADR/migration cần thiết.
- Không yêu cầu viết lại toàn bộ bằng framework/pattern khác chỉ vì sở thích.
- Luôn phân biệt UI prototype với năng lực backend thật.
- Mọi thay đổi schema/provenance/versioning phải nêu migration forward, compatibility, rollback/repair và tác động record bất biến.
- Không suy luận quy định pháp luật, thời hạn, thẩm quyền hoặc hiệu lực nguồn khi chưa có tài liệu đã kiểm chứng.
- AI không được tự tạo quyết định tiếp thu/phê duyệt cuối cùng.

## 19. Current Repository Snapshot

| Thuộc tính | Giá trị |
| --- | --- |
| Branch trước khi tạo handoff | `codex/m3-persistent-review` |
| HEAD trước khi tạo handoff | `d44bd3b feat: implement persistent M3 review resolution` |
| Upstream | `origin/codex/m3-persistent-review` |
| `main`/`origin/main` | `322c410 feat: complete M2 drafting business workflow` |
| Git status trước task | Sạch |
| Migration trong repo | `0001`–`0013` |
| Stack | Next.js 16.3.2, React 19.2.8, TypeScript, pg 8.23.0, docx 9.7.1 |
| Test sau nghiệm thu P0 | 39/39 pass; gồm 30 unit/validation và 9 test/subtest M3 dùng PostgreSQL development thật |
| Integration fixture | Comment → opinion → decision → approved proposal → finalization → DraftVersion + LegalChange → accepted/partial/explained resolutions → history/supersede |
| Lint | Pass (`npm run lint`) |
| Production build | Pass (`npm run build`, Next.js 16.3.2; 13 trang static/dynamic được sinh, toàn bộ API M3 có trong route map) |
| DOCX | OOXML ZIP hợp lệ; Times New Roman; bảng Word; đủ tiếng Việt, góp ý, tiếp thu/giải trình, linked change, trước/sau; Microsoft Word mở và xuất PDF thành công; render 1 trang không clipping/overlap/mất glyph |
| Thời điểm tạo | 29/08/2026, Asia/Saigon |

Sau vòng nghiệm thu, git status có source/test/tài liệu chưa commit như báo cáo cuối task. Không commit/push theo yêu cầu. **[GIT]**

### Kết luận nghiệm thu P0 ngày 29/08/2026

- **Đủ điều kiện kỹ thuật để đề nghị merge M3: YES.** Đây không phải hành động merge và không phải nghiệm thu production/NAS.
- Lỗi phát hiện và sửa: integration test ban đầu không đọc được `.env.local` do đường dẫn phụ thuộc working directory; đã chuyển sang đường dẫn xác định từ `import.meta.url`. DOCX persistent ban đầu không chứa linked changes và before/after; đã bổ sung builder persistent và kiểm thử nội dung.
- LibreOffice renderer không có trên máy; thay bằng Microsoft Word COM để mở file và xuất PDF, sau đó Poppler render PDF thành PNG để kiểm tra trực quan.
- Test PostgreSQL tạo record fixture bất biến có hậu tố thời gian trong database `_dev`; đây là dữ liệu giả định nghiệm thu, không phải dữ liệu pháp lý thật.

## 20. Next Recommended Action

1. Người dùng rà soát báo cáo nghiệm thu và quyết định có merge M3 hay không.
2. Nếu được xác nhận, commit/push các thay đổi nghiệm thu và merge theo quy trình repository.
3. Chỉ sau khi M3 được chốt mới xác định phạm vi M4 từ Open Questions và backlog.

## Phụ lục A — Những dữ liệu còn thiếu khi lập handoff

- Không có tài liệu tiêu chí nghiệm thu chính thức mang tên M1/M2/M3; ranh giới mốc được dựng từ commit và conversation. **[CẦN XÁC MINH]**
- Không có `AI-REVIEW-PACK.md` trong repository tại thời điểm khảo sát. **[CODE/FILESYSTEM]**
- Không có bằng chứng trong repository về cấu hình NAS, identity provider, RPO/RTO hoặc mẫu xuất bản chính thức. **[CẦN XÁC MINH]**
- Integration test PostgreSQL M3 đã được khai báo trong `npm test`; phạm vi test này xác nhận lát cắt nghiệm thu M3, không đại diện cho toàn bộ transaction của sản phẩm tương lai. **[CODE]**
- Tài liệu handoff chỉ có ngữ cảnh conversation hiển thị trong thread này; không có quyền truy cập một lịch sử ngoài thread hoặc trên máy cơ quan. **[CẦN XÁC MINH]**

## Phụ lục B — Bản đồ nguồn thông tin

- **Code:** `app/web/src`, `packages/contracts`, `packages/database/migrations`, scripts và test.
- **Docs:** toàn bộ `docs`, đặc biệt mô hình nghiệp vụ, Structured Legal Editor, architecture/ADR, database, workflow và review/resolution.
- **Git:** log `a61278d` → `d44bd3b`, diff/stat các commit foundation, M2 và M3.
- **Conversation:** cài môi trường PC, PostgreSQL 18 development, phạm vi M3 persistent review, không AI thật/production/NAS, kết quả test/build và đề xuất bước tiếp theo.

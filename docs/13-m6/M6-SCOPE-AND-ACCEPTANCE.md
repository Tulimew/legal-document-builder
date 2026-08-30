# M6 — Structured Legal Editor & Rich Authoring

> Trạng thái: **APPROVED SCOPE GATE — implementation được phép bắt đầu**
>
> Baseline: `main@61d6716743b1b592bbcb55f99a38d19a0dbb2e6d`, M5 đã merge; 112/112 tests, lint/build/diff-check PASS; migrations `0001`–`0016`.

## 1. Objective

M6 hoàn thiện trải nghiệm biên tập trực tiếp trên canonical structured legal model, bao gồm `PARAGRAPH`, `LIST`, `TABLE` và `FIGURE`, đồng thời chứng minh dữ liệu biên tập đi xuyên suốt PostgreSQL workspace, immutable `DraftVersion`, fork và merge M5 mà không flatten, mất identity hoặc dựng provenance giả.

M6 không triển khai publishing/NAS, production identity, AI integration hoặc deployment hardening.

## 2. Baseline classification

| Capability | Trạng thái sau M5 |
| --- | --- |
| Persistent PostgreSQL workspace và autosave | **IMPLEMENTED** |
| Canonical `LegalContentBlock[]` validation/round-trip | **IMPLEMENTED FOUNDATION** |
| Paragraph/List field editing | **PARTIAL** — điều khiển theo block/span, chưa phải rich authoring hoàn chỉnh |
| Table render/cell text/safe metadata editing | **PARTIAL** — chưa author hàng/cột/cell topology đầy đủ |
| Figure render/safe metadata editing | **PARTIAL** — chưa có luồng tạo/chọn asset version |
| Node tree create/delete/move/reparent | **NOT IMPLEMENTED** trong editor |
| Session undo/redo và canonical paste pipeline | **NOT IMPLEMENTED** |
| Immutable snapshot comparison | **IMPLEMENTED** |
| Branch/fork/three-way merge/conflict history | **IMPLEMENTED** |
| General authoring → immutable version finalization | **PARTIAL** — Step 4 có transaction chuyên biệt; editor tổng quát chưa có command rõ |
| Publishing, NAS, production IAM, AI | **NOT IMPLEMENTED / OUT OF SCOPE** |

## 3. Invariants inherited from M1–M5

1. Canonical `LegalDocument`/`LegalNode`/`LegalContentBlock[]` là business data; DOM, HTML và editor state chỉ là biểu diễn tạm thời.
2. `LegalNode.id` tiếp tục là stable identity qua save, version, fork và merge. Không nhận dạng node bằng display number, title hoặc vị trí.
3. `DraftVersion` và `legal_node_version_state` bất biến. Autosave workspace không tự tạo hoặc sửa immutable version.
4. Table row/cell IDs, list item IDs, figure IDs và asset-version references không được tái sinh ngoài thao tác tạo entity mới rõ ràng.
5. Mọi save dùng optimistic workspace revision và PostgreSQL transaction. Stale write không overwrite dữ liệu mới hơn.
6. Không flatten `LIST`, `TABLE`, `FIGURE` thành paragraph hoặc plain text ở bất kỳ write/finalization/merge path nào.
7. Fork/merge tiếp tục dùng immutable snapshot và graph-proven ancestry; không synthetic path hoặc provenance.
8. Unsupported operation phải bị từ chối trước mutation, giữ nguyên canonical data và thông báo rõ cho user.
9. Không dùng mock/localStorage làm business persistence. Session-local selection/undo history không được xem là persistence hoặc audit.
10. Không làm test pass bằng cách giảm validation, identity, immutability, provenance hoặc authority checks.

## 4. Proposed capabilities

### Phase 1 — Canonical rich editing foundation

- Một command layer typed cho edit operations thay vì component tự mutate JSON tùy ý.
- Rich paragraph/list authoring trên spans: nhập/xóa text, selection, marks, references và footnotes; normalization tạo canonical spans xác định.
- Keyboard behavior cần thiết cho paragraph/list (split/join, item create/delete, indent/outdent trong giới hạn RuleSet).
- Session-local undo/redo trên canonical commands; save/reload/stale response có semantics rõ.
- Plain-text paste và supported rich paste đi qua sanitizer/parser xác định; không lưu HTML thô.
- Dirty/saving/failed/navigation warning và autosave single-flight 1.5 giây từ M4 được giữ nguyên.

### Phase 2 — Table authoring

- Tạo/xóa table có chủ ý.
- Thêm/xóa/reorder hàng và cột, edit cell paragraph content, caption/source/verification/metadata.
- Merge/split cell theo rectangular grid rules nếu M6-D03 được khóa theo đề xuất.
- Bảo toàn `tableId`, `rowId`, `cellId`, spans và metadata của phần không bị thao tác.
- Server validation từ chối overlap, gap, span ngoài biên, duplicate identity hoặc topology không xác định.
- Keyboard/focus và accessible labels đủ để thao tác bảng trong browser acceptance.

### Phase 3 — Figure and structured references

- Tạo figure từ một `AssetRef`/`AssetVersion` đã tồn tại và được phép sử dụng.
- Thay asset chỉ bằng version bất biến đã tồn tại; không mutate asset version.
- Edit alt text, captions, display role, source, verification và metadata an toàn.
- Tạo/xóa/edit references và footnote links mà không mất metadata chưa được UI hỗ trợ.
- Asset upload/storage/rendering pipeline không thuộc M6.

### Phase 4 — Legal structure authoring and version bridge

- Add/delete/reorder/reparent `LegalNode` trên tree với stable ID, parent/order consistency và RuleSet validation phía server.
- Renumber là kết quả nghiệp vụ/display, không thay stable identity.
- Referenced node deletion trả domain conflict; không cascade làm mất provenance/audit.
- Editor chọn đúng project/document/branch/workspace từ persistent context, không phụ thuộc một fixed development fixture.
- Một explicit authoring finalization command tạo immutable version từ aligned canonical workspace theo M6-D08; autosave không đồng nghĩa finalization.

### Phase 5 — M5 compatibility and end-to-end acceptance

- Fork từ immutable version; edit và save đủ `PARAGRAPH`, `LIST`, `TABLE`, `FIGURE`; tạo version đầu tiên của fork.
- So sánh arbitrary versions thấy đúng structured changes và node-level moved/renumbered semantics.
- Merge non-conflicting structured edits giữ đủ identities/metadata.
- Divergent structured edits sinh conflict; manual resolution lưu structured result và resolution history.
- Merge completion tạo canonical snapshot/checksum đúng, immutable edges/provenance đầy đủ và không làm mất source history.
- Browser E2E chạy trên PostgreSQL development thật, không mock/localStorage cho business state.

## 5. Proposed M6 decisions requiring owner approval

### M6-D01 — Paragraph/List block identity

Không thêm stable top-level ID cho `ParagraphBlock`/`ListBlock` trong M6 và không backfill historical snapshots. M6 chỉ cam kết stable identity ở `LegalNode`, list item, table/row/cell và figure levels hiện có. Block-level move detection không thuộc M6 acceptance.

### M6-D02 — Rich editor representation

Canonical spans/marks/references/footnotes là write contract. DOM/HTML chỉ được dùng tạm trong UI; mọi input phải được chuyển thành canonical commands và server-validated `LegalContentBlock[]` trước save.

### M6-D03 — Table topology

M6 gồm create/delete table, row/column add/delete/reorder và merge/split cell. Grid phải rectangular sau khi quy đổi `rowSpan`/`columnSpan`; thao tác không thể biểu diễn hợp lệ bị từ chối nguyên tử.

### M6-D04 — Figure asset boundary

M6 không upload hoặc lưu binary. Figure chỉ tham chiếu `AssetVersion` bất biến đã tồn tại; create/replace asset yêu cầu user chọn reference hợp lệ và có quyền. Thiếu asset provider phù hợp thì UI vẫn round-trip/edit figure hiện có và báo rõ create/replace chưa khả dụng, không tạo asset giả.

### M6-D05 — LegalNode tree authoring

Add/delete/reorder/reparent node thuộc M6. Stable ID không đổi khi move/renumber; server áp RuleSet và domain conflict. Không triển khai arbitrary schema/rule designer.

### M6-D06 — Paste/import boundary

Plain text và tập con deterministic của HTML được hỗ trợ. Parser chỉ nhận cấu trúc ánh xạ không mất dữ liệu sang canonical model. Nội dung unsupported bị báo trước khi mutation; không cố đoán hoặc silently flatten.

### M6-D07 — Undo/redo semantics

Undo/redo là session-local command history, không phải version/audit persistence. History bị clear hoặc rebase rõ ràng khi reload workspace, branch switch hoặc stale-revision recovery; không lưu localStorage.

### M6-D08 — General authoring finalization

M6 bổ sung explicit transaction để seal aligned workspace thành immutable `DraftVersion` tổng quát. Transaction tạo canonical snapshot/node states/checksum, net `LegalChange`/provenance và `PARENT` edge được graph chứng minh. Version đầu tiên trên fork dùng fork point làm parent. Không sửa hoặc backfill version lịch sử; nếu khảo sát implementation cho thấy cần migration làm thay đổi/backfill history, phải dừng xin phê duyệt.

### M6-D09 — Autosave versus version creation

Autosave chỉ cập nhật mutable workspace revision. Chỉ explicit “Create Version” có authority/reason mới tạo immutable version. Không cho finalization khi dirty, saving, failed, stale hoặc workspace không aligned với expected revision.

### M6-D10 — Structured merge acceptance

M6 không thay thuật toán ancestry M5. Compatibility gate phải bao phủ non-conflict và conflict cho structured blocks, manual structured resolution, identity preservation, checksum JSONB round-trip, rollback và audit/provenance survival.

### M6-D11 — Collaboration boundary

M6 dùng optimistic revision và navigation/stale recovery hiện có; không triển khai realtime collaborative editing, CRDT/OT hoặc presence. Nếu cần soft lock chỉ được dùng advisory UX, không thay authority/concurrency invariant.

### M6-D12 — Identity boundary

M6 được dùng development actor/fixture cho test nhưng application path không được hard-code một actor/workspace duy nhất. Production authentication/authorization provider vẫn ngoài scope; các write path tiếp tục yêu cầu actor/authority contracts hiện có.

## 6. Data and migration gate

- Ưu tiên dùng canonical contracts/schema hiện có; migration chỉ được thêm khi có evidence từ persistent authoring/version transaction.
- Không migration nào được silently rewrite/backfill `LegalNode.id`, block identity, immutable snapshot hoặc checksum lịch sử.
- Migration mới phải cùng commit với repository/application code và PostgreSQL integration tests.
- Nếu cần historical backfill, destructive compatibility change hoặc thay invariant, implementation phải dừng theo quyền phê duyệt của chủ dự án.

## 7. Acceptance criteria

### Canonical editing

- [ ] Paragraph/List editing, marks, references và footnotes round-trip canonical JSON không mất dữ liệu.
- [ ] Selection/keyboard/paste commands có deterministic normalization và undo/redo.
- [ ] Unsupported paste/command không mutate document và có user-visible error.
- [ ] Không lưu DOM/HTML/localStorage làm business content.

### Table/Figure

- [ ] Table create/delete, row/column add/delete/reorder và merge/split cell được test.
- [ ] Invalid table topology bị server từ chối nguyên tử.
- [ ] Table IDs, spans, captions, source, verification và metadata round-trip.
- [ ] Figure create/edit/replace/delete theo asset boundary; asset/metadata round-trip.
- [ ] Figure hiện có không mất dữ liệu khi asset create/replace unavailable.

### Structure and persistence

- [ ] Add/delete/reorder/reparent node giữ stable `LegalNode.id`; renumber không đổi identity.
- [ ] Referenced-node delete trả domain conflict và rollback.
- [ ] Autosave 1.5 giây, single-flight queue, manual save và navigation warning tiếp tục pass.
- [ ] Stale revision không overwrite; undo history recovery có hành vi rõ.
- [ ] PostgreSQL JSONB round-trip giữ canonical structured data.

### Version/fork/merge

- [ ] Explicit authoring finalization tạo immutable version, snapshot, checksum, changes/provenance và graph edge đúng.
- [ ] First version trên fork có parent graph-proven từ fork point.
- [ ] Fork → rich edit → save → version → comparison chạy trên PostgreSQL thật.
- [ ] Structured non-conflict merge bảo toàn content/IDs/metadata.
- [ ] Structured conflict/manual resolution/history chạy end-to-end.
- [ ] Rollback không để lại version/edge/change/node-state/audit một phần.
- [ ] Không synthetic ancestry/path/provenance.

### Quality gates

- [ ] Unit tests cho command/normalization/grid operations/invariants.
- [ ] PostgreSQL integration tests cho save/finalize/fork/merge/rollback/concurrency.
- [ ] Browser E2E cho paragraph/list/table/figure và fork/version/merge journey.
- [ ] Vietnamese Unicode/font/table/figure render được kiểm tra trong browser.
- [ ] `npm.cmd test`, lint, production build và `git diff --check` PASS.

## 8. Explicitly out of scope

- Publishing workflow, DOCX/PDF publication pipeline và NAS/storage deployment.
- Asset binary upload, transcoding, CDN/object storage hoặc publishing rendition.
- Production identity provider, SSO, organization provisioning hoặc deployment secrets.
- AI drafting/rewrite/provider/data-governance integration.
- Deployment hardening, backup/restore, monitoring, HA hoặc performance certification.
- Realtime multi-user collaboration, CRDT/OT và presence.
- Stable top-level IDs cho Paragraph/List và block-level move detection.
- Rewrite M5 ancestry/merge architecture chỉ vì editor framework preference.

## 9. Delivery sequence and commit gates

1. `feat(m6): add canonical rich editing foundation`
2. `feat(m6): complete structured table authoring`
3. `feat(m6): complete figure and reference authoring`
4. `feat(m6): add legal structure and version finalization`
5. `test(m6): prove editor version fork and merge compatibility`

Mỗi phase chỉ được commit sau khi acceptance liên quan, tests, lint/build và diff-check đạt. Branch M6 có thể push sau từng gate nhưng không merge `main` cho đến khi có owner approval cuối.

## 10. Definition of Done

M6 chỉ được kết luận `READY TO MERGE` khi canonical rich editor hoàn thành trong phạm vi trên, PostgreSQL E2E chứng minh structured content đi qua save/version/fork/merge không mất dữ liệu, mọi quality gate đạt, migration (nếu có) được kiểm thử, tài liệu trạng thái/completion report cập nhật và không có invariant/scope decision chưa được chủ dự án khóa.

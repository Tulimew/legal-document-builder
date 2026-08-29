# M5 — Branch, Fork, Merge & Conflict Resolution

> Trạng thái: **APPROVED SCOPE GATE — chưa bắt đầu implementation**
>
> Baseline: `main@556823cc8cc64a27484890d46f6b45a30811deb3`, M4 đã merge và đạt 87/87 tests.

## 1. Objective

M5 biến version graph hiện có thành luồng nghiệp vụ persistent để người dùng tạo phương án song song, tiếp tục biên tập độc lập, phân tích khác biệt, giải quyết xung đột có thẩm quyền và tạo một `DraftVersion` hợp nhất bất biến có provenance đầy đủ.

M5 không thay đổi stable `LegalNode.id`, không sửa `DraftVersion` đã khóa, không ghi đè nhánh nguồn và không tự lựa chọn nội dung xung đột.

## 2. Baseline classification

| Capability | Trạng thái sau M4 |
| --- | --- |
| `draft_branch`, trạng thái ACTIVE/CLOSED/MERGED | **PARTIAL** — schema/contract có; chưa có application API đầy đủ |
| `forked_from_version_id` | **PARTIAL** — schema có FK; chưa có transaction fork workspace |
| Một workspace cho mỗi branch | **IMPLEMENTED FOUNDATION** — constraint và persistent workspace có sẵn |
| Immutable `DraftVersion` và node states | **IMPLEMENTED** |
| `draft_version_edge` PARENT/MERGE_SOURCE, chống chu trình | **IMPLEMENTED FOUNDATION** — schema/trigger có; chưa có merge use case tổng quát |
| Arbitrary snapshot comparison | **IMPLEMENTED** trong M4 |
| General fork/merge APIs và UI | **NOT IMPLEMENTED** |
| Three-way conflict analysis | **NOT IMPLEMENTED** |
| Persistent conflict/resolution history | **NOT IMPLEMENTED** |
| Automatic conflict resolution | **NOT IMPLEMENTED** và không thuộc M5 |

Fixture hợp nhất trong migration `0002` chứng minh hình dạng dữ liệu, không phải bằng chứng rằng runtime merge đã hoàn chỉnh.

## 3. Locked invariants inherited from M1–M4

1. `LegalNode.id` là stable identity qua fork và merge; không match bằng display number hoặc vị trí.
2. `DraftVersion` và `legal_node_version_state` bất biến; merge luôn tạo version mới.
3. Một `DraftVersion` thuộc đúng một branch đích.
4. Merge version có tối đa một cạnh `PARENT` chính và phải ghi mọi nguồn ngoài parent bằng `MERGE_SOURCE`.
5. Version graph không chu trình và chỉ nằm trong cùng project/document.
6. Branch/workspace nguồn không bị sửa bởi fork hoặc merge.
7. Không synthetic ancestry/path/provenance.
8. Không dùng localStorage/mock làm business persistence.
9. AI/hệ thống không tự quyết định khi có xung đột nghiệp vụ.
10. Merge chỉ thành công trong một PostgreSQL transaction; failure không để lại branch/version/edge/node-state/audit một phần.

### 3.1. Target workspace alignment

Merge analysis và completion dùng immutable target head làm `OURS`. Target workspace phải được chứng minh aligned với target head bằng canonical snapshot equality/checksum evidence. `expectedRevision` chỉ là concurrency guard, không phải bằng chứng workspace bằng target version.

Nếu workspace có thay đổi chưa được finalization thành target head, server trả domain state `TARGET_WORKSPACE_DIRTY`, không analysis/complete, không overwrite workspace và yêu cầu user finalization hoặc chủ động reload/discard. Source input luôn là immutable `sourceVersionId`; thay đổi chưa finalization trong source workspace không tham gia merge.

### 3.2. Forked branch head semantics

`forked_from_version_id` là fork point, không phải version thuộc branch mới. Ngay sau fork, branch mới có workspace clone từ source snapshot và có thể chưa có `DraftVersion` thuộc chính branch đó. Source version vẫn chỉ thuộc source branch. Head của branch mới chỉ xuất hiện sau lần finalization đầu tiên trên branch mới.

### 3.3. Ambiguous merge base

Merge base chỉ được chọn từ tập graph-proven maximal common ancestors. Client không được chỉ định arbitrary version:

- không có common ancestor hợp lệ: merge bị từ chối;
- có đúng một candidate: server chọn candidate đó;
- có nhiều candidate: server trả danh sách candidates để user lựa chọn;
- selected base được persist trong `MergeOperation` và bất biến sau khi operation sinh analysis/conflict;
- muốn đổi base phải ABANDON operation và tạo operation mới;
- không synthetic base.

### 3.4. Merge algorithm auditability

Persistent `MergeOperation` phải ghi `analysis_algorithm_code`, `analysis_algorithm_version`, base/ours/theirs version IDs, canonical input checksum/evidence và preview checksum/token.

Preview/completion token bind với base/ours/theirs immutable IDs, target head, target workspace alignment/revision, algorithm version và latest effective conflict-resolution sequences. Completion rebuild authoritative result server-side; không nhận merged document tùy ý từ client.

## 4. M5 capabilities

### A. Branch lifecycle and fork

- Liệt kê branch và head version có scope project/document.
- Tạo branch ACTIVE từ một immutable source `DraftVersion`.
- Fork transaction tạo branch, workspace revision `0`, document/node workspace từ đúng source snapshot và audit event.
- Fork giữ toàn bộ structured blocks, IDs, references, assets, metadata và RuleSet pin.
- Branch code unique trong project; source version phải cùng project/document.
- Branch ACTIVE có thể đổi tên/mục đích nếu business history không bị che; code và fork point không đổi.
- Đóng branch cần lý do. Branch đã đóng không save/fork/merge-source theo write path thông thường.
- Không xóa branch trong M5.

### B. Merge analysis

Merge request xác định:

- target branch và immutable target head (`ours`);
- một source version (`theirs`) từ branch khác;
- common ancestor được graph chứng minh (`base`);
- expected target workspace revision/head để chống stale;
- actor, reason, authority basis và correlation ID.

Trước analysis, server so canonical target workspace với snapshot của target head. Không aligned trả `TARGET_WORKSPACE_DIRTY`; source workspace không được đọc làm merge input.

Common ancestor phải được tính từ `draft_version_edge`, không suy từ timestamp/code. Nếu có nhiều merge base hợp lệ hoặc graph không cho một lựa chọn duy nhất, analysis trả trạng thái cần lựa chọn rõ; không tự đoán.

Three-way analysis theo stable `LegalNode.id`:

| Base → ours | Base → theirs | Kết quả |
| --- | --- | --- |
| không đổi | thay đổi | `AUTO_APPLICABLE_THEIRS` |
| thay đổi | không đổi | `KEEP_OURS` |
| cùng thay đổi canonical giống nhau | cùng thay đổi | `SAME_CHANGE` |
| thay đổi khác nhau trên cùng semantic field/block | thay đổi | `CONFLICT` |
| add cùng ID khác nội dung | add cùng ID | `CONFLICT` |
| delete một phía, modify/move phía kia | khác nhau | `CONFLICT` |
| move/renumber độc lập, không chạm cùng structural field | khác nhau | có thể compose nếu invariant cây vẫn hợp lệ |

Analysis là read model deterministic; không persist “merge result” nếu người dùng chưa mở merge operation.

### C. Persistent merge operation and conflict history

M5 cần persistent aggregate riêng cho một lần merge, không nhét trạng thái vào JSON metadata của branch/workspace.

Contract đề xuất:

```ts
type MergeOperationStatus =
  | "ANALYZING"
  | "CONFLICTS_OPEN"
  | "READY"
  | "COMPLETED"
  | "ABANDONED";

type MergeConflictKind =
  | "CONTENT"
  | "DELETE_MODIFY"
  | "ADD_ADD"
  | "MOVE_MOVE"
  | "REPARENT_DELETE"
  | "ORDER_COLLISION"
  | "REFERENCE_INTEGRITY"
  | "TREE_INVARIANT";

type MergeResolutionChoice =
  | "USE_OURS"
  | "USE_THEIRS"
  | "USE_MANUAL_RESULT";
```

Mỗi conflict giữ immutable base/ours/theirs state hoặc checksum + immutable version references đủ để tái tạo evidence. Mỗi lần kết luận conflict tạo sequence mới và `supersedesResolutionId`; không update/xóa lịch sử. Manual result phải là structured `LegalNode`/state hợp lệ, không phải plain text.

Operation persist selected graph-proven base cùng algorithm code/version và input checksums. Base không đổi sau khi analysis/conflict được tạo.

Không có choice `AUTO` cho conflict. Các thay đổi không xung đột có thể được máy compose deterministically nhưng phải xuất hiện trong preview và provenance.

### D. Merge preview and completion

- Preview dựng `LegalDocumentSnapshot` structured hoàn chỉnh và validation toàn cây/reference/order.
- Preview phân biệt auto-applied, kept-ours, same-change và resolved-conflict.
- Mọi conflict phải có latest effective resolution trước khi READY.
- Completion kiểm tra lại target head/workspace revision, source version và resolution sequence; stale trả domain conflict, không overwrite.
- Completion kiểm tra lại canonical alignment giữa target workspace và target head; dirty trả `TARGET_WORKSPACE_DIRTY`.
- Completion rebuild result và preview token server-side từ immutable inputs + latest resolution sequences.
- Completion tạo PRE_MERGE checkpoint, merged `DraftVersion`, node states, PARENT/MERGE_SOURCE edges, bases, legal changes/provenance và audit trong một transaction.
- `PARENT` mặc định là target head; source version ngoài parent là `MERGE_SOURCE`. Không ghi cùng source hai vai trò.
- Workspace target chuyển sang exact merged snapshot và revision tăng một lần.
- Source workspace/version giữ nguyên.
- Branch nguồn chỉ chuyển `MERGED` khi người có quyền yêu cầu rõ và transaction merge đã thành công; mặc định vẫn ACTIVE.

### E. Version graph and merge UI

- Branch switcher/list dùng PostgreSQL thật.
- Fork dialog chọn immutable version, code/name/purpose và hiển thị hậu quả.
- Merge screen chọn target/source, hiển thị graph-proven base, three-way structured preview và conflict queue.
- Conflict editor bảo toàn PARAGRAPH/LIST/TABLE/FIGURE; operation unsupported phải giữ dữ liệu và báo rõ.
- UI không gọi net two-way diff là three-way merge.
- Timeline/graph chỉ vẽ edge thật.
- Loading, empty, authorization, stale, conflict, validation và backend-unavailable state rõ ràng.

## 5. Proposed API surface

```text
GET  /api/v1/projects/{projectId}/draft-branches
POST /api/v1/projects/{projectId}/draft-branches
GET  /api/v1/projects/{projectId}/draft-branches/{branchId}
POST /api/v1/projects/{projectId}/draft-branches/{branchId}/close

POST /api/v1/projects/{projectId}/merge-analyses
POST /api/v1/projects/{projectId}/merge-operations
GET  /api/v1/projects/{projectId}/merge-operations/{mergeOperationId}
POST /api/v1/projects/{projectId}/merge-operations/{mergeOperationId}/conflicts/{conflictId}/resolutions
POST /api/v1/projects/{projectId}/merge-operations/{mergeOperationId}/complete
POST /api/v1/projects/{projectId}/merge-operations/{mergeOperationId}/abandon
```

Create branch command bắt buộc `sourceVersionId`; server tự lấy snapshot/RuleSet/project/document, không nhận authoritative document từ client.

Merge completion không nhận authoritative merged document tùy ý. Server dựng lại từ immutable inputs + latest conflict resolutions và so checksum preview token đã bind với operation/input versions.

## 6. Authorization proposal

Khảo sát permission hiện có trước implementation. Nếu không biểu đạt đủ, migration có thể thêm tối thiểu:

- `DRAFT_BRANCH_READ`
- `DRAFT_BRANCH_CREATE`
- `DRAFT_BRANCH_CLOSE`
- `DRAFT_MERGE_ANALYZE`
- `DRAFT_MERGE_RESOLVE`
- `DRAFT_MERGE_COMPLETE`

Server luôn resolve membership/delegation. Quyền đọc một version không mặc nhiên cho phép đọc nguồn review/provenance bị REDACTED. Quyền merge không mặc nhiên là quyền đóng branch nguồn.

## 7. Data model gate

Schema hiện tại đủ cho branch/version/edge nhưng không đủ cho persistent merge operation/conflict/resolution history. Implementation M5 dự kiến cần forward migration cho:

- `draft_merge_operation`;
- `draft_merge_conflict`;
- `draft_merge_conflict_resolution`;
- permission definitions/indexes cần thiết.

Migration phải forward-only, không backfill lịch sử bằng suy đoán. Các merge version fixture/legacy có thể tiếp tục tồn tại mà không có merge operation record và được read model đánh dấu `LEGACY_UNVERIFIED_OPERATION` nếu không chứng minh được operation.

Không sửa/xóa edge/version/basis legacy. Rollback strategy là ngừng write path mới; không drop audit data đã phát sinh.

## 8. Explicitly out of scope

- octopus merge nhiều hơn một source trong một operation;
- rebase, cherry-pick, squash hoặc rewrite history;
- automatic conflict decision;
- realtime co-editing;
- block-level move detection cho Paragraph/List không có top-level stable ID;
- merge giữa project hoặc legal document khác nhau;
- publishing/release package/NAS;
- production identity provider;
- AI merge suggestion hoặc AI decision;
- xóa branch/version/history;
- đổi stable LegalNode identity hoặc DraftVersion immutability.

## 9. Test strategy

### Unit/property/invariant

- deterministic merge-base/path trên DAG, không synthetic path;
- three-way classifier đủ add/delete/modify/move/renumber và multi-kind;
- unchanged-vs-changed, same-change, add/add, delete/modify, move/move;
- object property order không tạo conflict giả; array order có ý nghĩa;
- structured result giữ IDs/marks/references/TABLE/FIGURE metadata;
- resolution sequence/supersede;
- tree/order/reference invariant sau compose;
- property tests: merge không đổi source inputs, deterministic với cùng inputs, không mất node ngoài resolved deletion.

### PostgreSQL integration

- fork transaction từ immutable version tạo đúng branch/workspace/nodes;
- branch vừa fork chưa có version/head thuộc branch mới; source version không đổi branch;
- unauthorized/cross-project/cross-document/closed-branch bị từ chối;
- source và target độc lập sau save;
- merge operation/conflicts/resolutions persistent và immutable history;
- concurrent/stale target head hoặc workspace revision rollback;
- dirty target workspace bị từ chối ở cả analysis và completion;
- algorithm/input/preview checksum evidence tái lập được và token sai bị từ chối;
- completion tạo checkpoint/version/node states/bases/changes/edges/audit atomically;
- graph cycle/invalid source rollback;
- source branch/workspace không đổi;
- branch source chỉ MERGED khi explicit close-on-complete được authorize;
- legacy merge version không bị backfill giả.

### End-to-end

1. Mở project thật và fork branch B từ version của branch A.
2. Chỉnh/save structured content độc lập ở A và B.
3. Tạo ít nhất một non-conflicting change và một true conflict trên cùng stable node.
4. Mở merge operation B → A; base phải được edge graph chứng minh.
5. Preview hiển thị đúng auto-applied và conflict.
6. Resolve conflict bằng lựa chọn và manual structured result; history sequence được giữ.
7. Hoàn thành merge, reload browser.
8. Merged version có PARENT + MERGE_SOURCE, snapshot đúng, provenance đúng.
9. Source branch vẫn đọc được và không bị ghi đè.
10. Hai session stale không thể complete hai merge chồng nhau.

## 10. Acceptance criteria

- [ ] Branch list/head/workspace đều từ PostgreSQL, không mock/localStorage.
- [ ] Fork giữ structured snapshot, stable IDs, RuleSet và không sửa source.
- [ ] Fork transaction rollback toàn bộ khi lỗi.
- [ ] Fork point không bị coi là head/version thuộc branch mới; branch mới chưa có version riêng cho tới lần finalization đầu tiên.
- [ ] Target workspace phải canonical-aligned với immutable target head; dirty target bị từ chối bằng `TARGET_WORKSPACE_DIRTY` ở analysis/completion.
- [ ] Unfinalized source workspace changes không tham gia merge.
- [ ] Common ancestor/path chỉ từ graph edge thật; ambiguous/no-base không bị đoán.
- [ ] Ambiguous base chỉ cho chọn graph-proven maximal common ancestor; selected base persist và immutable sau analysis.
- [ ] Three-way analysis phân biệt base/ours/theirs và deterministic.
- [ ] Non-conflicting changes compose mà không flatten/mất metadata.
- [ ] True conflicts không được auto-decide.
- [ ] Persistent conflict có base/ours/theirs evidence và resolution history/supersede.
- [ ] Manual result là structured content/state được validate authoritative ở server.
- [ ] Merge preview và completion bind đúng immutable inputs + target revision/head.
- [ ] Operation lưu algorithm code/version, canonical input evidence và preview checksum/token đủ để audit/rebuild.
- [ ] Completion rebuild authoritative result server-side và không nhận merged document từ client.
- [ ] Stale/concurrent completion không overwrite.
- [ ] Completion atomic tạo PRE_MERGE checkpoint, merged version, node states, bases, changes, PARENT/MERGE_SOURCE edges và audit.
- [ ] Merged version thuộc đúng một target branch và immutable.
- [ ] Source branch/version/workspace không bị sửa; branch không bị xóa.
- [ ] Close/mark MERGED source branch là explicit authorized action.
- [ ] Graph không chu trình/cross-project/cross-document.
- [ ] Provenance phân biệt verified merge operation với legacy unverified merge fixture.
- [ ] Authorization, REDACTED provenance và error UX được test.
- [ ] PostgreSQL integration suite PASS.
- [ ] Browser E2E scenario PASS.
- [ ] Full tests, lint, build và `git diff --check` PASS.

## 11. Implementation phases proposed

### Phase 1 — Branch lifecycle and fork

Contracts, permissions, branch repository/routes, transactional workspace fork and branch UI. Gate: fork/source isolation/structured round-trip/auth/rollback.

### Phase 2 — Three-way merge analysis

Graph-proven merge base, structured three-way classifier, deterministic preview and unit/property/PostgreSQL tests. Gate: no synthetic base, full conflict matrix.

### Phase 3 — Persistent conflicts and resolutions

Forward migration, immutable merge operation/conflict/resolution sequence, authorization and conflict UI. Gate: history, redaction, structured manual result and concurrency.

### Phase 4 — Atomic merge completion

Revalidation, PRE_MERGE checkpoint, version/node states/edges/bases/changes/audit and target workspace update. Gate: transaction rollback, immutable inputs and source isolation.

### Phase 5 — Live graph UI and end-to-end acceptance

Connect branch/merge UI, retire mock path in scope, browser E2E, performance/concurrency evidence and completion report.

## 12. Scope decisions requiring owner approval

| ID | Proposed decision |
| --- | --- |
| M5-D01 | M5 supports exactly one source branch/version per merge operation; repeated merges handle additional sources. |
| M5-D02 | Target head is primary PARENT; source version is MERGE_SOURCE. |
| M5-D03 | Common ancestor must be unique/proven; ambiguous merge base requires user selection before analysis. |
| M5-D04 | Conflict decisions are USE_OURS/USE_THEIRS/USE_MANUAL_RESULT; no automatic decision. |
| M5-D05 | Resolution history is append-only sequence with supersede. |
| M5-D06 | Source branch remains ACTIVE by default; marking MERGED is explicit and separately authorized. |
| M5-D07 | Existing merge-shaped legacy versions are not backfilled; provenance marks missing operation evidence explicitly. |
| M5-D08 | M5 may add only the merge-operation/conflict/resolution schema and minimal permissions/indexes; no publishing/identity/AI scope. |

Implementation must not start until these decisions and the scope gate are approved.

Scope Gate và M5-D01–M5-D08 đã được chủ dự án phê duyệt. Bốn invariant tại mục 3.1–3.4 là điều kiện bắt buộc của implementation.

# M4 — Persistent Structured Editor & Version Comparison

> Trạng thái: **PROPOSED SCOPE — chưa bắt đầu implementation**
>
> Baseline khảo sát: `main` tại `95c25ab6fb58d5180dd88a75341a2a1b75d4ed16`
>
> Mục đích: khóa phạm vi, hợp đồng và tiêu chí nghiệm thu M4 trước khi viết code.

## 1. M4 Objective

M4 chuyển luồng editor/comparison/provenance trung tâm từ prototype, mock và localStorage sang luồng persistent dùng PostgreSQL thật. M4 gồm đúng ba capability:

1. **Persistent Structured Editor** — đọc và lưu `DraftWorkspace` thật, chỉnh `LegalContentBlock[]` mà không làm phẳng dữ liệu.
2. **Real DraftVersion Comparison** — so sánh hai `DraftVersion` bất biến trong cùng phạm vi project/document bằng stable `LegalNode.id`.
3. **Unified Provenance Read Model** — truy vết thay đổi từ nguồn nghiệp vụ tới phiên bản và theo chiều ngược lại, không dựng dữ liệu giả.

M4 củng cố modular monolith hiện tại; không tách dịch vụ, không đổi framework và không mở rộng sang branch merge, publishing, production deployment hoặc AI.

## 2. Current Baseline

| Baseline item | Trạng thái bắt đầu M4 |
| --- | --- |
| Git | `main@95c25ab6fb58d5180dd88a75341a2a1b75d4ed16`, đã merge Pre-M4 Integrity Hardening |
| Database | PostgreSQL; forward migrations `0001`–`0014` |
| Tests | `55/55 PASS` |
| Build gates | lint PASS, Next.js production build PASS, `git diff --check` PASS |
| Structured Step 4 | `beforeState`/`afterState` là `LegalContentBlock[]`; finalization giữ block, metadata và stable node identity |
| Snapshot integrity | canonical JSON SHA-256; lưu algorithm marker; verify sau JSONB round-trip |
| Workspace persistence | reconciliation tăng dần; không full delete/reinsert; optimistic `expectedRevision`; transaction và audit |

Các module persistent chính đã có: `PostgresWorkspaceRepository`, `PostgresStep4ChangeRepository`, `PostgresReviewRepository`, `PostgresDeliberationRepository`, workflow/amendment repositories, route handlers `/api/v1`, authorization theo project và development identity adapter.

Các module trung tâm còn prototype: `EditorWorkspace` chỉ lấy một phần nội dung PostgreSQL rồi chuyển thành chuỗi trong `textarea`; cây, document view, version graph, diff, structural mapping, timeline và trace panel vẫn dùng `mock-data`; nhiều review/deliberation/workflow/Step 4 path vẫn có localStorage fallback.

## 3. Baseline Survey

### 3.1 Editor hiện tại

| Thành phần | Quan sát hiện tại | Ý nghĩa cho M4 |
| --- | --- | --- |
| `components/editor/editor-prototype.tsx` và trang `soan-thao/page.tsx` | nhận `TreeNode`, comments, changes, warnings, operations từ `lib/mock-data.ts` | shell editor chưa lấy workspace làm nguồn duy nhất |
| `components/editor/editor-workspace.tsx` | tải workspace nếu có biến môi trường development; ánh xạ database ID sang local ID; chỉ ghép span của `PARAGRAPH` thành plain text; edit trong `textarea`; lỗi fetch bị bỏ qua; liên kết comment qua localStorage | phải thay bằng state structured và client API thật; không được silent fallback |
| `structure-tree.tsx`, `traditional-view.tsx`, `inspector-panel.tsx` | dùng type/data mock | cây và inspector của editor core phải đọc `LegalNode` thật; traditional view có thể chỉ đọc nếu không nằm critical path |
| `step4-change-panel.tsx` | có PostgreSQL API khi config tồn tại nhưng vẫn có `step4-change-store.ts`; UI tạo paragraph từ chuỗi | M4 loại fallback trong editor core và truyền structured state thật |
| `step4-finalization-panel.tsx` | readiness/finalize PostgreSQL thật, dùng development env IDs | tái sử dụng backend; nối với workspace/version state thật |
| `comparison-explanation-workbench.tsx` | changes từ mock và thuyết minh trong localStorage | không phải source of truth; phần comparison chính phải thay bằng read model thật |

### 3.2 Persistent capability đã có

- `GET /api/v1/workspaces/{workspaceId}`: authorize `WORKSPACE_READ`, trả `DraftWorkspace` và toàn bộ `LegalDocumentSnapshot` từ PostgreSQL.
- `PUT /api/v1/workspaces/{workspaceId}`: authorize `WORKSPACE_EDIT`, nhận `expectedRevision`, validate document/tree, reconcile nodes trong một transaction, tăng revision và ghi `audit_event`.
- `PostgresWorkspaceRepository.save`: chỉ upsert node mới/thay đổi, xóa node mất khỏi document nếu không bị Step 4 proposal tham chiếu, rollback trên conflict/constraint.
- `LegalNode` giữ stable `id`, `parentNodeId`, `orderKey`, `displayNumber`, content và metadata. `LegalContentBlock` hỗ trợ `PARAGRAPH`, `LIST`, `TABLE`, `FIGURE`; span có marks/reference/footnote.
- `DraftVersion.document_snapshot` và `legal_node_version_state.node_snapshot` cung cấp dữ liệu bất biến đủ để diff hai snapshot. `draft_version_edge` biểu diễn parent/merge source nhưng M4 không triển khai merge.
- Step 4 finalization tạo `DraftVersion`, node states, `DraftLegalNodeChange`, `draft_version_basis`, `draft_change_basis`, `step4_finalization_proposal` và audit trong transaction.

### 3.3 Khái niệm revision và version

`DraftWorkspace.revision` là số đồng bộ mutable, tăng sau mỗi save/finalization/prefill thành công và dùng cho optimistic concurrency. `DraftVersion` là snapshot bất biến được chốt theo một hành động nghiệp vụ. Autosave chỉ cập nhật workspace revision; **không** tạo checkpoint hoặc `DraftVersion`. M4 không được dùng hai khái niệm này thay thế nhau.

## 4. Capability A — Persistent Structured Editor

### 4.1 Target flow

1. Route/page xác định `projectId` và `workspaceId` thật, không dựa vào local tree ID.
2. Client gọi workspace GET; response trở thành source of truth cho cây, node selection, inspector và editor content.
3. Editor thao tác trực tiếp trên `LegalContentBlock[]` và giữ nguyên mọi ID/field không được chỉnh.
4. Local state có thể chứa bản nháp chưa đồng bộ, nhưng không phải persistence fallback.
5. Save/autosave gửi toàn bộ validated `LegalDocumentSnapshot` cùng revision vừa đọc.
6. Server xác thực quyền, scope, stable IDs, cấu trúc và revision; PostgreSQL transaction trả revision mới.
7. Client chỉ báo `saved` sau response thành công và cập nhật revision từ response.
8. `REVISION_CONFLICT` đưa UI vào trạng thái stale; không tự ghi đè. Người dùng reload/so sánh/reapply có chủ đích.

### 4.2 Structured editing boundary

M4 phải round-trip không mất dữ liệu đối với:

- `PARAGRAPH.spans`, `marks`, internal/external references và `footnoteId`;
- `LIST.styleCode`, item IDs và paragraph blocks;
- `TABLE.tableId`, row/cell IDs, span, caption, source, verification và metadata;
- `FIGURE.figureId`, asset ref, caption, alternative text, source, verification, display role và metadata;
- `LegalNode.id`, parent/order, title, metadata, display number/lock và lifecycle status.

Trong M4, `PARAGRAPH` và `LIST` phải có editing đầy đủ trong phạm vi contract. `TABLE` và `FIGURE` phải render và round-trip đầy đủ, đồng thời cho sửa các field an toàn; M4 không yêu cầu full table/figure authoring UI. Một operation chưa được hỗ trợ phải chuyển sang `unsupported structured operation`, bảo toàn dữ liệu gốc và báo rõ; tuyệt đối không serialize block thành plain text. Không tái sử dụng legacy plain-text adapter làm authoritative editor path.

### 4.3 Save policy

- Manual Save tiếp tục tồn tại; autosave dùng cùng endpoint/contract với debounce **1.5 giây sau thay đổi cuối**.
- Tại một thời điểm chỉ có một save request đang bay. Thay đổi phát sinh trong lúc request đang bay được giữ dirty và queue cho lần save kế tiếp; không chạy request song song và không đánh mất thay đổi.
- Không gửi request nếu canonical document không đổi.
- Navigation khi còn `dirty`, `saving` hoặc `failed` phải cảnh báo.
- Stale revision giữ local draft và bản server mới để người dùng quyết định; M4 không có automatic merge.
- Save thành công phải giữ stable node/block IDs; server không sinh lại ID cho entity đã tồn tại.
- Autosave không tạo `DraftVersion`, `DraftCheckpoint`, `LegalChange` hay provenance nghiệp vụ giả.

### 4.4 Validation

Mở rộng validation workspace hiện tại để validate đầy đủ discriminated union `LegalContentBlock[]`, UUID/ID nội bộ, marks/reference, tree và uniqueness cần thiết. Validation client chỉ hỗ trợ UX; server là authoritative boundary. Invalid/unsupported content không được gửi hoặc lưu một phần.

## 5. Capability B — Real DraftVersion Comparison

### 5.1 Scope và endpoint

Đề xuất API:

- `GET /api/v1/projects/{projectId}/draft-versions?documentId=&limit=&cursor=` — chọn phiên bản.
- `GET /api/v1/projects/{projectId}/draft-version-comparisons?baseVersionId=&targetVersionId=&limit=&cursor=` — metadata cặp phiên bản và page change.
- `GET /api/v1/projects/{projectId}/draft-version-comparisons/{comparisonKey}/nodes/{legalNodeId}` chỉ cần nếu payload node/timeline chi tiết quá lớn; ưu tiên endpoint stateless bằng IDs, không persist “comparison job”.

Server xác minh cả hai version thuộc cùng `projectId` và cùng `legal_document_id`. Không suy ra scope từ request body. Nếu chúng khác document/project, trả lỗi rõ. Hai version bất kỳ trong scope đó được so sánh dù không phải ancestor trực tiếp; path/evolution chỉ trả khi edges hiện có xác định được đường phù hợp.

### 5.2 DTO đề xuất

```ts
type DraftVersionChangeKind = "ADDED" | "DELETED" | "MODIFIED" | "MOVED" | "RENUMBERED";

interface DraftVersionSummary {
  id: EntityId; code: string; name: string; branchId: EntityId;
  legalDocumentId: EntityId; sealedAt: IsoDateTime;
}

type ComparedNodeState =
  | {
      exists: true;
      node: LegalNode;
      parentNodeId: EntityId | null;
      orderKey: string;
      displayNumber?: string;
    }
  | {
      exists: false;
    };

type MovementDetail = "REORDERED" | "REPARENTED";

interface DraftVersionNodeDiff {
  legalNodeId: EntityId;
  kinds: DraftVersionChangeKind[];
  before: ComparedNodeState;
  after: ComparedNodeState;
  movementDetail?: MovementDetail;
  blockChanges: StructuredBlockDiff[];
  provenance: ProvenanceReference[];
}

interface DraftVersionComparisonPage {
  base: DraftVersionSummary;
  target: DraftVersionSummary;
  changes: DraftVersionNodeDiff[];
  counts: Record<DraftVersionChangeKind, number>;
  nextCursor?: string;
}
```

DTO `StructuredBlockDiff` phải mô tả block kind, index/ID khi contract có ID, before/after và thay đổi span/text có cấu trúc; không chỉ có `beforeText`/`afterText`. Presentation layer có thể derive text để render `ins`/`del`.

`ComparedNodeState` là discriminated union bắt buộc: phía tồn tại phải có node/parent/order; phía `exists: false` không được chứa node, parent, order, display number hoặc placeholder giả.

### 5.3 Repository và thuật toán

Nguồn chính là `legal_node_version_state` của hai version, có thể đối chiếu `document_snapshot` để kiểm tra completeness. Load hai tập node theo `(draft_version_id, legal_node_id)` và join theo **stable `legal_node_id`**:

1. chỉ có ở target hoặc `exists` đổi false→true: `ADDED`;
2. chỉ có ở base hoặc true→false: `DELETED`;
3. cùng ID, `parentNodeId` hoặc vị trí structural thay đổi: `MOVED`; `parentNodeId` đổi cho `movementDetail: "REPARENTED"`, còn `orderKey` đổi trong cùng parent cho `movementDetail: "REORDERED"`;
4. cùng ID, `displayNumber` thay đổi: `RENUMBERED`;
5. cùng ID, canonical content/title/metadata/lifecycle khác: `MODIFIED`.

Một node có thể đồng thời `MOVED`, `RENUMBERED`, `MODIFIED`; API không ép thành delete/add. Move không được suy ra chỉ từ display number. Reorder cùng parent thuộc `MOVED/REORDERED`; đổi parent thuộc `MOVED/REPARENTED`.

Comparison content:

- so sánh canonical block JSON trước để xác định unchanged;
- align top-level blocks theo stable IDs khi loại block có ID (`tableId`, `figureId`, list item/cell IDs), sau đó theo kind+position cho paragraph/list block chưa có block-level ID;
- text diff chỉ chạy trong các span/block đã align;
- array order có ý nghĩa; object property order không có ý nghĩa;
- output ordering mặc định theo cây target; deleted nodes chèn theo vị trí base với deterministic tie-breaker `legalNodeId`.

Gap đã biết: `ParagraphBlock` và `ListBlock` không có ID top-level. M4 không thêm stable top-level ID cho hai loại block này. Có thể diff deterministically theo sequence, nhưng block-level move detection không thuộc M4 acceptance. Stable LegalNode identity vẫn phải bảo đảm move/renumber cấp node chính xác.

### 5.4 Snapshot diff và evolution invariant

- Hai `DraftVersion` bất kỳ trong cùng `projectId` và `legal_document_id` luôn có thể snapshot-diff trực tiếp từ hai trạng thái bất biến, không phụ thuộc việc có path giữa chúng.
- Evolution/path/timeline chỉ được trả khi `draft_version_edge` chứng minh được path tương ứng.
- Khi graph không chứng minh được quan hệ, API vẫn trả net snapshot diff nhưng đánh dấu evolution/path unavailable; không dựng synthetic path hoặc mốc trung gian.

`draft_legal_node_change` là provenance/event đã ghi khi Step 4 finalization, không phải nguồn duy nhất để tính arbitrary snapshot diff: version xa có thể cần net diff từ node states. Read model có thể liên kết các change record nằm trong phạm vi version/path đã xác định, nhưng không được bịa event nếu snapshot khác mà không có record.

## 6. Capability C — Unified Provenance Read Model

### 6.1 Relationship graph hiện có

```text
Comment
 ├─ CommentResolution (sequence/supersedes)
 │   └─ comment_resolution_change ──> DraftLegalNodeChange
 └─ ResolutionCase
     ├─ MemberResolutionOpinion
     ├─ ResolutionOption
     └─ ResolutionDecision (sequence/supersedes)

ResolutionDecision
 └─ workspace LegalNode.metadata.pendingDecision (prefill marker; current bridge)

Step4ChangeProposal
 ├─ Step4ChangeDecision (sequence/supersedes)
 ├─ step4_finalization_proposal ──> DraftLegalNodeChange
 └─ draft_version_basis / draft_change_basis

DraftLegalNodeChange ──> effective DraftVersion
DraftVersion ──> DraftVersionBasis / DraftVersionEdge / LegalNodeVersionState
```

Ngoài comment resolution link đã có FK, liên kết `ResolutionDecision → Step4ChangeProposal` hiện không có typed FK: pending decision nằm trong workspace metadata và `source_reference` của Step 4 là text. Vì vậy read model phải trả `MISSING`/`UNVERIFIED_REFERENCE` khi không chứng minh được link; không nối theo text/label gần giống.

### 6.2 API và DTO

Đề xuất:

- `GET /api/v1/projects/{projectId}/provenance?changeId=&draftVersionId=&legalNodeId=&commentId=&limit=&cursor=`; bắt buộc đúng một anchor chính.
- Hoặc route resource rõ hơn (`.../draft-changes/{id}/provenance`, `.../comments/{id}/provenance`) cùng dùng một repository/read-model nội bộ. Chọn một convention trước implementation, không nhân đôi SQL.

```ts
type ProvenanceLinkStatus = "VERIFIED" | "MISSING" | "UNVERIFIED_REFERENCE" | "REDACTED";
interface ProvenanceEntityRef { type: string; id: EntityId; label?: string; }
interface ProvenanceEdge { from: ProvenanceEntityRef; to?: ProvenanceEntityRef; relation: string; status: ProvenanceLinkStatus; }
interface ProvenanceEntry { entity: ProvenanceEntityRef; occurredAt?: IsoDateTime; actor?: ActorRef; summary?: string; edges: ProvenanceEdge[]; }
interface ProvenancePage { anchor: ProvenanceEntityRef; entries: ProvenanceEntry[]; nextCursor?: string; }
```

Read model truy vấn theo batch, không N+1: anchor/scope → changes/version → finalization/proposal/decision → typed bases/resolution links → comment/case/decision/opinion; actors được map theo quyền. Không tạo bảng denormalized ở M4 trừ khi benchmark chứng minh cần thiết.

Missing-link semantics:

- Entity không tồn tại trong scope: `404`.
- Link optional không có: trả edge `MISSING` hoặc empty relation theo DTO, không dựng placeholder entity thật.
- `source_type_code/source_id` không resolve được: `UNVERIFIED_REFERENCE` kèm ID gốc; không bỏ qua âm thầm.
- Người dùng không có quyền xem entity nguồn đã biết tồn tại: trả `REDACTED`, không phải `MISSING`. Edge không được chứa actor, content hoặc source metadata nhạy cảm.

Authorization tối thiểu: cùng project scope, authenticate server-side, quyền đọc workspace/version và quyền đọc review tương ứng. Trace UI không được làm lộ comment, actor hoặc source chỉ vì user xem được diff. M4 cần xác định permission code dùng lại hay bổ sung permission đọc provenance; schema permission definition chỉ đổi nếu ma trận hiện tại không biểu đạt được.

## 7. Prototype Retirement Map

| Prototype/mock/local module | Current use | M4 replacement | Remove in M4? |
| --- | --- | --- | --- |
| `lib/mock-data.ts` editor tree/document | source cho trang editor, tree, inspector, traditional view | workspace GET + `LegalNode` adapters/renderers | **Có** khỏi editor core; file có thể còn cho demo ngoài scope |
| `mock-data.ts` comparison/version graph/change/evolution/mapping | toàn bộ comparison UI | DraftVersion list/comparison/provenance APIs | **Có** khỏi comparison/timeline/trace path |
| `review-prototype-store.ts` | comment state và link detected change localStorage | persistent review APIs + provenance link thật | **Có** khỏi editor/provenance core; review prototype ngoài path chỉ xóa khi replacement test đủ |
| `deliberation-prototype-store.ts` | divergence/conclusion localStorage | deliberation repository/API + provenance read model | **Có** khỏi editor core; không bắt buộc xóa file toàn cục |
| `workflow-prototype-store.ts` | workflow workbench fallback | workflow API hiện có | **Không bắt buộc**; workflow không phải capability M4 |
| `step4-change-store.ts` | Step 4 local fallback và unit validation cũ | Step 4 PostgreSQL API/contract structured | **Có** khỏi editor core; có thể xóa khi test tương ứng chuyển sang server validation |
| comparison explanation localStorage | thuyết minh bản so sánh mẫu | real comparison output; persistence thuyết minh nằm ở backlog riêng ngoài M4 | **Có** khỏi comparison core; không tự tạo schema thuyết minh |
| `structure-mapping-view.tsx` mock paths | move/renumber mapping mẫu | `DraftVersionNodeDiff` thật | **Có** khỏi live comparison path |
| `version-timeline-panel.tsx` mock paths | node evolution mẫu | provenance/comparison timeline DTO | **Có** khỏi live path |
| `change-trace-panel.tsx` mock path | trace data mẫu | unified provenance DTO | **Có** |
| editor plain-text/local state fallback | textarea và silent fetch fallback | structured editor state + explicit error states | **Có** |
| amendment layout localStorage fallback | fallback riêng amendment layout | persistent endpoint đã có | **Không**, ngoài editor/comparison/provenance core |

Nguyên tắc: chỉ gỡ fallback sau khi replacement có PostgreSQL integration test và UI state test. Không xóa prototype chỉ để làm sạch repository nếu vẫn phục vụ demo ngoài phạm vi M4.

## 8. API and Data Model Impact

### 8.1 API cần giữ/mở rộng

- Giữ workspace GET/PUT; mở rộng validation/response error details nếu cần, không tạo endpoint save song song.
- Thêm list DraftVersions theo project/document.
- Thêm arbitrary DraftVersion comparison.
- Thêm provenance traversal từ comment/change/version/node.
- Có thể thêm endpoint đọc deliberation summary theo batch nếu provenance endpoint không bao phủ panel editor.

### 8.2 Contract/read model mới

- `DraftVersionSummary`, comparison query/page, `DraftVersionNodeDiff`, `StructuredBlockDiff`.
- `ProvenanceEntityRef`, edge/link status, entry/page.
- Error DTO giữ mã phân biệt stale, validation, forbidden, unavailable.
- Workspace contract hiện có được tái sử dụng; không tạo “editor document” dạng plain text.

### 8.3 Schema migration verdict

**Không khóa migration mới cho comparison/editor tại thời điểm scope.** Schema hiện có đủ snapshot, node-state, version edge, workspace revision và phần lớn provenance.

M4 chưa tạo typed FK `ResolutionDecision → Step4ChangeProposal` trước implementation. Phase 3 dùng `VERIFIED`, `MISSING`, `UNVERIFIED_REFERENCE` và `REDACTED` đúng evidence hiện có. Chỉ đề xuất migration nếu dữ liệu/runtime evidence thực tế chứng minh typed link là cần thiết; không backfill bằng suy đoán. Nếu migration được duyệt sau đó, migration phải:

- thêm bảng nối hoặc nullable FK typed, không thay `source_reference` âm thầm;
- forward: tạo constraint/index và cập nhật application write path cùng release;
- backfill: chỉ backfill record có evidence xác định (ví dụ decision ID trong metadata/source ref hợp lệ), record mơ hồ để `NULL`/unverified;
- compatibility: read model tiếp tục hiểu legacy unverified refs;
- rollback: bỏ write path/FK/bảng nối nhưng không xóa audit/source text;
- audit: không sửa/xóa decision, proposal, change hoặc version bất biến.

Không migration chỉ để cache diff, đổi tên field hoặc thêm convenience view. Nếu query benchmark cần index, migration index có thể tách riêng với evidence và rollback `DROP INDEX` an toàn.

## 9. UX States

| State | Hành vi bắt buộc |
| --- | --- |
| Loading | skeleton/progress; không hiển thị mock như dữ liệu thật |
| Saving | giữ dirty state, disable hành động gây mất dữ liệu; không báo saved |
| Saved | chỉ sau server acknowledgment; hiển thị revision/thời điểm phù hợp |
| Stale revision | giữ local draft, hiển thị expected/actual, cho reload hoặc reapply thủ công; không overwrite |
| Conflict | nêu node/operation liên quan và hành động phục hồi; không nuốt domain conflict |
| Validation error | chỉ tới block/node/field sai; không partial save |
| Authorization error | phân biệt 401/403; không fallback local |
| Backend unavailable | giữ bản chưa đồng bộ trong memory, cho retry; không success giả |
| Empty comparison | xác nhận hai phiên bản không khác hoặc không có version phù hợp |
| Missing provenance | hiển thị “không có liên kết được xác minh”, không dựng nguồn |
| Unsupported structured operation | chặn operation nhưng bảo toàn/render dữ liệu gốc |

## 10. Pagination and Scale

Ưu tiên cursor keyset vì các bảng có timestamp/sequence/ID ổn định; offset chỉ dùng cho danh mục nhỏ không biến động.

| Danh sách | Default/max | Strategy |
| --- | --- | --- |
| Comments | 50/200 | cursor `(recorded_at, id)` descending; mở rộng `listComments` hiện đang load toàn bộ |
| Resolution history của một comment | 25/100 | cursor `sequence` descending |
| DraftVersions | 50/200 | cursor `(sealed_at, id)` descending, filter document/branch |
| Comparison changes | 100/500 | deterministic structural sort + opaque cursor mang sort key và pair IDs |
| Provenance entries | 50/200 | cursor `(occurred_at, entity_type, id)`; graph edges của entry đi kèm |
| Step 4/change lists | 50/200 | keyset theo recorded/decided time + ID |

Cursor phải opaque, bind với filter/pair/scope và bị từ chối khi dùng sai query. Counts có thể query riêng; không bắt buộc exact count nếu gây scan lớn, nhưng acceptance dataset phải trả chính xác.

## 11. Test Strategy

### 11.1 Unit

- classifier `ADDED/DELETED/MODIFIED/MOVED/RENUMBERED`, gồm multi-kind và `MOVED/REORDERED`, `MOVED/REPARENTED`;
- move giữ ID không thành delete/add; renumber không dựa vào content/display number để match;
- `ComparedNodeState` missing-side chỉ có `{ exists: false }`, không có dữ liệu giả;
- arbitrary snapshot diff không dựng evolution/path khi `draft_version_edge` không chứng minh quan hệ;
- canonical structured equality và block alignment cho paragraph/list/table/figure;
- DTO/query validation, cursor validation và deterministic ordering;
- provenance mapping đủ `VERIFIED/MISSING/UNVERIFIED_REFERENCE/REDACTED`; `REDACTED` không lộ actor/content/source metadata;
- editor reducer/state machine: loading/dirty/saving/saved/stale/error và queued autosave.

### 11.2 PostgreSQL integration

- workspace GET/PUT bằng actor có quyền; actor không hợp lệ/không quyền;
- structured LIST/TABLE/FIGURE, IDs, marks, references và metadata round-trip;
- stale expectedRevision và transaction rollback;
- autosave không tạo DraftVersion/checkpoint/change;
- list versions đúng project/document và pagination;
- arbitrary version comparison, added/deleted/modified/moved/renumbered, `REORDERED/REPARENTED`, deterministic page;
- JSONB property-order không tạo modified giả;
- provenance traversal hai chiều qua comment resolution/change/version và Step 4 proposal/finalization;
- missing/unverified link không tạo provenance giả; redacted source không bị báo thành missing và không lộ dữ liệu;
- authorization và pagination/cursor scope.

### 11.3 End-to-end bắt buộc

Một scenario chạy UI + API + PostgreSQL development thật phải chứng minh:

1. mở hồ sơ thật;
2. load workspace PostgreSQL;
3. chỉnh một structured node, gồm ít nhất một block ngoài paragraph;
4. save và nhận revision mới;
5. tạo/duyệt proposal cần thiết và chốt DraftVersion;
6. sửa tiếp, save;
7. chốt DraftVersion tiếp theo;
8. chọn hai version thật;
9. thấy diff thật, gồm ít nhất modified và move/renumber hoặc fixture tương đương;
10. chọn một change;
11. thấy provenance thật tới proposal/decision/comment hoặc explicit missing-link đúng dữ liệu.

E2E phải kiểm tra reload browser vẫn đọc dữ liệu đã lưu, stale revision ở hai session không ghi đè, và không có localStorage business record trong core path.

Trước implementation E2E phải khảo sát tooling hiện có trong repository/runtime. Nếu không có runner đáp ứng scenario và assertions trên, nhóm được đề xuất một dependency E2E tối thiểu; việc phê duyệt/cài dependency là bước implementation riêng, không thực hiện khi cập nhật scope này.

## 12. M4 Acceptance Criteria

M4 chỉ CLOSED khi toàn bộ mục sau có evidence:

- [ ] Editor core không import/use `mock-data`, review/deliberation/Step 4 localStorage store.
- [ ] Workspace PostgreSQL là source of truth cho tree, selected node và structured editor content.
- [ ] `PARAGRAPH/LIST/TABLE/FIGURE`, IDs, marks, references và metadata round-trip không mất dữ liệu.
- [ ] `PARAGRAPH` và `LIST` editing đầy đủ theo contract; `TABLE` và `FIGURE` render/round-trip đầy đủ, cho sửa field an toàn; operation unsupported bảo toàn dữ liệu và báo rõ.
- [ ] Save/autosave dùng `expectedRevision`; stale không overwrite và có UX rõ.
- [ ] Autosave debounce 1.5 giây, tối đa một request đang bay, queue thay đổi mới; Manual Save tồn tại và navigation warning hoạt động ở dirty/saving/failed.
- [ ] Autosave không tạo `DraftVersion`.
- [ ] Hai DraftVersion thật trong cùng project/document có thể comparison.
- [ ] Diff trả tối thiểu `ADDED`, `DELETED`, `MODIFIED`, `MOVED`, `RENUMBERED`.
- [ ] Stable LegalNode identity là khóa match; move/renumber không thành delete/add khi ID giữ nguyên.
- [ ] Reorder cùng parent trả `MOVED/REORDERED`; đổi parent trả `MOVED/REPARENTED`.
- [ ] `ComparedNodeState` phía không tồn tại chỉ trả `{ exists: false }`, không chứa node/parent/order/display number giả.
- [ ] Comparison deterministic và không bị JSON property insertion order gây false positive.
- [ ] Hai version cùng project/document luôn snapshot-diff được; evolution/path/timeline chỉ có khi `draft_version_edge` chứng minh path và không có synthetic path.
- [ ] Trace/timeline panel đọc unified provenance thật.
- [ ] Link thiếu/mơ hồ hiển thị missing/unverified; nguồn tồn tại nhưng không đủ quyền hiển thị `REDACTED`, không lộ metadata nhạy cảm; không tạo provenance giả.
- [ ] Loading/saving/saved/stale/conflict/validation/auth/backend/empty/missing/unsupported states có hành vi kiểm thử được.
- [ ] Pagination server-side áp dụng cho version, change/provenance và danh sách review lớn trong scope.
- [ ] PostgreSQL integration suite M4 PASS.
- [ ] E2E scenario mục 11.3 PASS.
- [ ] Toàn bộ `npm.cmd test` PASS với số test mới được báo cáo rõ.
- [ ] `npm.cmd run lint` PASS.
- [ ] `npm.cmd run build` PASS.
- [ ] `git diff --check` PASS.

## 13. Out of Scope

M4 không bao gồm:

- general branch/fork/merge;
- three-way merge hoặc automatic conflict resolution;
- publishing worker, production PDF;
- NAS production deployment, backup/restore nghiệm thu;
- production identity provider;
- AI integration/policy/provider;
- release package;
- production object storage;
- realtime co-editing/soft-lock platform hoàn chỉnh;
- rewrite framework, microservice split hoặc ORM migration.

## 14. Implementation Phases

### Phase 1 — Persistent editor foundation

- **Mục tiêu:** workspace thật điều khiển tree/editor; structured state, validation, save queue và UX concurrency.
- **Module dự kiến:** workspace route/repository/validation/contracts; `editor-prototype`, `editor-workspace`, structure tree/inspector; client API/state hooks; Step 4 panel structured input.
- **Dependency:** baseline workspace reconciliation và permissions.
- **Test gate:** unit editor state/validation; PostgreSQL read/save, block round-trip, stale/rollback/auth.
- **DoD:** editor core không còn mock/localStorage và không flatten content; autosave không tạo version.

### Phase 2 — DraftVersion comparison backend

- **Mục tiêu:** list version và diff hai snapshots thật.
- **Module dự kiến:** contracts comparison DTO; validation; `draft-version-comparison-repository.ts`; project route handlers; comparison unit/integration tests.
- **Dependency:** stable node contract, canonical JSON, immutable node states.
- **Test gate:** đủ năm change kind, `REORDERED/REPARENTED`, missing-side union, arbitrary pair, path evidence, scope/auth và deterministic pagination.
- **DoD:** API trả diff structured thật; không match move bằng display number.

### Phase 3 — Unified provenance read model

- **Mục tiêu:** typed traversal hai chiều và explicit missing links.
- **Module dự kiến:** provenance contracts/repository/routes; reuse review/deliberation/Step 4 tables; migration chỉ nếu typed decision→proposal link được duyệt.
- **Dependency:** semantics `REDACTED` đã khóa; cần map quyền hiện có và xử lý typed-link gap không suy đoán.
- **Test gate:** traversal forward/reverse, supersede history, đủ bốn provenance status gồm `REDACTED`, auth và pagination.
- **DoD:** một change/version/comment có trace có bằng chứng; không có synthetic provenance.

### Phase 4 — Connect comparison/timeline/trace UI

- **Mục tiêu:** thay `mock-data` ở comparison, mapping, timeline và trace bằng APIs phase 2–3.
- **Module dự kiến:** `comparison-view`, `comparison-document`, `structure-mapping-view`, `version-timeline-panel`, `change-trace-panel`, client loaders.
- **Dependency:** stable DTO và endpoint phases 2–3.
- **Test gate:** component state/error tests; UI integration với fixture PostgreSQL.
- **DoD:** version selectors/diff/trace dùng dữ liệu thật; empty/missing/error states rõ.

### Phase 5 — E2E, prototype retirement, UX hardening

- **Mục tiêu:** chứng minh vertical slice; gỡ fallback core sau khi replacement an toàn.
- **Module dự kiến:** E2E fixture/harness, core import cleanup, navigation/dirty guard, pagination UX, docs/handoff.
- **Dependency:** phases 1–4.
- **Test gate:** scenario mục 11.3, full suite/lint/build/diff check.
- **DoD:** checklist acceptance hoàn tất; prototype retirement map cập nhật theo evidence; không mở scope ngoài M4.

## 15. Locked Product Decisions Before Implementation

Các quyết định sau đã được chủ dự án khóa và là constraint của implementation M4:

| ID | Quyết định đã khóa | Hệ quả bắt buộc |
| --- | --- | --- |
| M4-D01 | Autosave debounce 1.5 giây; một request đang bay; thay đổi mới queue cho save tiếp; Manual Save vẫn tồn tại | Navigation warning bắt buộc ở `dirty/saving/failed` |
| M4-D02 | `PARAGRAPH`/`LIST` editing đầy đủ trong contract M4; `TABLE`/`FIGURE` render và round-trip đầy đủ, cho sửa field an toàn | Không yêu cầu full table/figure authoring UI; operation unsupported phải preserve data và báo rõ |
| M4-D03 | Reorder cùng parent thuộc `MOVED` | Movement detail bắt buộc: `REORDERED` hoặc `REPARENTED` |
| M4-D04 | Không thêm stable top-level ID cho Paragraph/List trong M4 | Block-level move detection ngoài acceptance; node-level move/renumber vẫn bắt buộc chính xác |
| M4-D05 | Chưa tạo typed FK decision→proposal trước implementation | Phase 3 dùng provenance status rõ; chỉ đề xuất migration khi có evidence; không backfill suy đoán |
| M4-D06 | `ProvenanceLinkStatus` gồm `VERIFIED`, `MISSING`, `UNVERIFIED_REFERENCE`, `REDACTED` | `REDACTED` xác nhận nguồn tồn tại nhưng không lộ actor/content/source metadata và không hiển thị như missing |
| M4-D07 | Persistence thuyết minh comparison ngoài M4 | Loại localStorage khỏi comparison core; đưa persistence thuyết minh vào backlog riêng |
| M4-D08 | Khảo sát E2E tooling hiện có trước | Nếu không đáp ứng acceptance, được đề xuất dependency E2E tối thiểu; không cài trong task scope này |

Các quyết định này không cho phép mở branch merge, publishing, production IAM, NAS hoặc AI.

## 16. Scope Lock

M4 là milestone persistence/read-model, không phải production-readiness milestone. Mọi thay đổi implementation phải truy về một acceptance criterion trong tài liệu này. Một gap phát hiện trong code chỉ được đưa vào M4 nếu chặn Persistent Structured Editor, DraftVersion Comparison hoặc Unified Provenance; phần khác được ghi backlog, không tự mở rộng kiến trúc.

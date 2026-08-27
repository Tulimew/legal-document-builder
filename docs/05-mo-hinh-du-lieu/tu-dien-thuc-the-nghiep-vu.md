# Từ điển thực thể nghiệp vụ

## 1. Phạm vi và quy ước

Tài liệu mô tả khái niệm nghiệp vụ, chưa phải schema cơ sở dữ liệu hoặc mã nguồn. Các quan hệ phản ánh bốn lớp trong [Mô hình nghiệp vụ tổng thể](../03-phan-tich-nghiep-vu/mo-hinh-nghiep-vu-tong-the.md) và tuân theo [Nguyên tắc workflow](../04-thiet-ke-quy-trinh/nguyen-tac-workflow.md).

“Bất biến” là điều kiện phải luôn đúng trong mô hình nghiệp vụ. Danh mục trường chi tiết, kiểu dữ liệu, mã định danh và phân quyền sẽ được thiết kế sau khi cơ quan chuyên môn xác nhận.

## 2. Nhóm hồ sơ và workflow

### 2.1. LegalDocumentProject - Hồ sơ xây dựng văn bản

- **Mục đích:** Quản lý toàn bộ vòng đời một văn bản mới hoặc một nhiệm vụ sửa đổi, bổ sung.
- **Dữ liệu chính:** Mã hồ sơ, tên, loại văn bản, mục tiêu, cơ quan chủ trì, vai trò tham gia, trình tự áp dụng, trạng thái, văn bản nền, thời điểm mở/đóng.
- **Quan hệ:** Gắn một `WorkflowInstance`; chứa `ProjectMembership`, `WorkflowStageInstance`, `ReviewRound`, `DraftBranch`, `DraftVersion`, `ReleasePackage`, `LegalChange`, `LegalBasis` và `AuditEvent`.
- **Bất biến:** Không xóa lịch sử hồ sơ đã phát sinh bản phát hành; một hồ sơ chỉ có một định danh xuyên suốt các lần quay lại hoặc chỉnh lý.

### 2.2. WorkflowDefinition - Định nghĩa quy trình

- **Mục đích:** Đại diện cho một họ quy trình nghiệp vụ có cùng phạm vi áp dụng.
- **Dữ liệu chính:** Mã, tên, phạm vi loại văn bản/cơ quan, chủ sở hữu nghiệp vụ, mô tả.
- **Quan hệ:** Có nhiều `WorkflowVersion`.
- **Bất biến:** Không chứa trực tiếp cấu hình đang chạy; cấu hình thực thi luôn thuộc một phiên bản.

### 2.3. WorkflowVersion - Phiên bản quy trình

- **Mục đích:** Đóng gói cấu hình quy trình đã được kiểm tra và phê duyệt cho một khoảng hiệu lực.
- **Dữ liệu chính:** Số phiên bản, trạng thái, ngày hiệu lực/hết hiệu lực, căn cứ phê duyệt, điều kiện áp dụng, quy tắc chuyển đổi.
- **Quan hệ:** Thuộc `WorkflowDefinition`; gồm nhiều `WorkflowStage`; được `WorkflowInstance` tham chiếu; liên kết `LegalBasis`.
- **Bất biến:** Không sửa tại chỗ sau khi có hồ sơ sử dụng; khoảng hiệu lực không được mâu thuẫn trong cùng phạm vi áp dụng nếu không có quy tắc ưu tiên rõ.

### 2.4. WorkflowStage - Giai đoạn hoặc bước quy trình

- **Mục đích:** Mô tả nghĩa vụ, cổng kiểm soát và điều kiện chuyển tiếp.
- **Dữ liệu chính:** Mã bước, tên, loại bước, điều kiện áp dụng, đầu vào/đầu ra, vai trò chịu trách nhiệm, quy tắc lặp/song song/quay lại, cổng hoàn thành.
- **Quan hệ:** Thuộc `WorkflowVersion`; được kích hoạt thành nhiều `WorkflowStageInstance`; tham chiếu `LegalBasis`.
- **Bất biến:** Không chứa giới hạn số dự thảo; thay đổi cấu hình bước phải tạo phiên bản quy trình mới khi phiên bản đã được sử dụng.

### 2.5. WorkflowInstance - Phiên bản quy trình đang áp dụng cho hồ sơ

- **Mục đích:** Ghi việc một hồ sơ cụ thể thực hiện theo một `WorkflowVersion` và theo dõi tiến độ các bước.
- **Dữ liệu chính:** Phiên bản được gán, thời điểm gán, bước hiện hành, lịch sử chuyển bước, ngoại lệ, quyết định chuyển đổi.
- **Quan hệ:** Thuộc một `LegalDocumentProject`; tham chiếu một `WorkflowVersion`; chứa các `WorkflowStageInstance`.
- **Bất biến:** Không tự đổi sang phiên bản mới; chuyển đổi phải có quyết định, ánh xạ và nhật ký đầy đủ.

### 2.6. WorkflowStageInstance - Lần thực thi bước quy trình

- **Mục đích:** Đại diện cho một lần `WorkflowStage` được kích hoạt trong một hồ sơ cụ thể.
- **Dữ liệu chính:** Thời điểm bắt đầu/kết thúc, trạng thái, người phụ trách, kết quả cổng, nguyên nhân quay lại, quan hệ nối tiếp/song song.
- **Quan hệ:** Thuộc `WorkflowInstance`; tham chiếu một `WorkflowStage`; chứa không, một hoặc nhiều `ReviewRound`; liên kết người thực hiện qua `ProjectMembership` hoặc `Delegation`.
- **Bất biến:** Mỗi lần kích hoạt có định danh riêng; không ghi đè lần thực thi cũ khi bước lặp; instance song song giữ trạng thái độc lập; kết quả cổng đã chốt chỉ thay đổi qua sự kiện điều chỉnh có `AuditEvent`.

### 2.7. ReviewRound - Đợt xử lý

- **Mục đích:** Ghi một lần xử lý có ranh giới như góp ý, họp, chỉ đạo, chỉnh lý, trình hoặc thẩm định.
- **Dữ liệu chính:** Loại đợt, mục tiêu, bước liên quan, đầu vào, thời gian, người tham gia, kết quả, kết luận, trạng thái.
- **Quan hệ:** Thuộc một `WorkflowStageInstance`; có thể chứa/tham chiếu `Consultation`, `Meeting`, `Submission`, `Approval`, `DirectionTask`; liên kết nhiều `DraftCheckpoint` hoặc `DraftVersion`.
- **Bất biến:** Không thay thế `WorkflowStageInstance`; có thể không tạo phiên bản hoặc có thể tạo nhiều checkpoint/phiên bản; không được ép quan hệ một đợt-một dự thảo.

## 3. Nhóm chủ thể và phân quyền

Chi tiết quản lý định danh và truy cập (IAM), xác thực, cơ chế cấp quyền và tích hợp danh bạ sẽ được thiết kế trong tài liệu riêng ở giai đoạn sau. Nhóm này chỉ xác lập các khái niệm nghiệp vụ nền tảng.

### 3.1. User - Tài khoản người dùng

- **Mục đích:** Đại diện cho tài khoản có thể đăng nhập và thực hiện thao tác trong hệ thống.
- **Dữ liệu chính:** Định danh tài khoản, trạng thái, phương thức/nguồn định danh, thời gian kích hoạt/ngừng hoạt động, liên kết người sở hữu.
- **Quan hệ:** Có thể liên kết một `Person`; thực hiện `AuditEvent`; nhận quyền qua `RoleAssignment`, `ProjectMembership` hoặc `Delegation`.
- **Bất biến:** Tài khoản không đồng nhất với con người; ngừng tài khoản không xóa `Person` hoặc lịch sử; tài khoản đã xuất hiện trong lịch sử chỉ được chuyển trạng thái.

### 3.2. Person - Cá nhân

- **Mục đích:** Đại diện cho một con người tham gia hoặc được nhắc đến trong nghiệp vụ, dù có tài khoản hay chưa.
- **Dữ liệu chính:** Định danh nghiệp vụ, họ tên, thông tin chức danh/đơn vị theo thời gian, thông tin liên hệ cần thiết, trạng thái.
- **Quan hệ:** Có thể có hoặc chưa có `User`; có thể thuộc một hoặc nhiều `Organization` theo các khoảng thời gian; tham gia hồ sơ qua `ProjectMembership`; có thể là bên ủy quyền/được ủy quyền.
- **Bất biến:** Không xóa cá nhân đã xuất hiện trong lịch sử nghiệp vụ; thay đổi tên, chức danh hoặc đơn vị phải bảo toàn ngữ cảnh lịch sử.

### 3.3. Organization - Tổ chức

- **Mục đích:** Đại diện cho cơ quan, đơn vị, phòng ban hoặc tổ chức tham gia nghiệp vụ.
- **Dữ liệu chính:** Tên, loại, mã định danh, quan hệ cấp trên, khoảng hoạt động, trạng thái.
- **Quan hệ:** Có nhiều `Person` theo từng khoảng thời gian; tham gia `LegalDocumentProject`; là phạm vi của `RoleAssignment`, `ProjectMembership` hoặc `Delegation`.
- **Bất biến:** Không xóa tổ chức đã xuất hiện trong lịch sử; thay đổi cơ cấu phải được ghi theo thời gian, không viết lại quan hệ cũ.

### 3.4. Role - Vai trò

- **Mục đích:** Mô tả tập trách nhiệm và quyền nghiệp vụ có thể được gán trong một phạm vi.
- **Dữ liệu chính:** Mã, tên, mô tả trách nhiệm, phạm vi áp dụng, trạng thái, phiên bản quy tắc quyền.
- **Quan hệ:** Được gán bằng `RoleAssignment`; được dùng trong `ProjectMembership` và có thể chịu tác động của `Delegation`.
- **Bất biến:** Vai trò không tự chứng minh thẩm quyền pháp lý; thay đổi quyền của vai trò phải được phiên bản hóa và không làm sai lịch sử quyền tại thời điểm hành động.

### 3.5. RoleAssignment - Phân công vai trò

- **Mục đích:** Gán một vai trò cho tài khoản, cá nhân hoặc tổ chức trong phạm vi toàn hệ thống hoặc tổ chức.
- **Dữ liệu chính:** Chủ thể, vai trò, phạm vi, thời gian bắt đầu/kết thúc, căn cứ, người phê duyệt, trạng thái.
- **Quan hệ:** Liên kết `Role` với `User`, `Person` hoặc `Organization`; có thể là nền cho `ProjectMembership`.
- **Bất biến:** Quyền toàn hệ thống không mặc nhiên trở thành quyền trong mọi hồ sơ; gán quyền phải có phạm vi và thời gian; bản ghi đã được sử dụng không bị xóa.

### 3.6. ProjectMembership - Thành viên hồ sơ

- **Mục đích:** Xác định chủ thể tham gia và quyền cụ thể trong một hồ sơ.
- **Dữ liệu chính:** Hồ sơ, cá nhân/tổ chức, vai trò trong hồ sơ, thời gian, trách nhiệm pháp lý, quyền thao tác, trạng thái, căn cứ phân công.
- **Quan hệ:** Thuộc `LegalDocumentProject`; liên kết `Person`, `Organization`, `RoleAssignment`; có thể giao/nhận `Delegation` và phụ trách `WorkflowStageInstance`.
- **Bất biến:** Quyền trong hồ sơ có thể khác quyền toàn hệ thống; phải phân biệt người trực tiếp thực hiện với người chịu trách nhiệm pháp lý; thành viên có lịch sử nghiệp vụ chỉ được chuyển trạng thái.

### 3.7. Delegation - Ủy quyền

- **Mục đích:** Ghi việc một chủ thể giao quyền thực hiện cho chủ thể khác trong giới hạn xác định.
- **Dữ liệu chính:** Bên ủy quyền, bên được ủy quyền, phạm vi hành động/hồ sơ, thời gian bắt đầu/kết thúc, căn cứ, điều kiện, trạng thái thu hồi.
- **Quan hệ:** Liên kết `Person`, `User`, `Organization`, `RoleAssignment` hoặc `ProjectMembership`; được tham chiếu bởi hành động và `AuditEvent` phát sinh.
- **Bất biến:** Ủy quyền phải có phạm vi, thời gian và căn cứ; không chuyển giao trách nhiệm pháp lý nếu căn cứ không quy định; hành động phải lưu cả người thực hiện và chủ thể chịu trách nhiệm; thu hồi không xóa lịch sử.

## 4. Nhóm dự thảo, thay đổi và phát hành

### 4.1. DraftWorkspace - Không gian biên tập dự thảo

- **Mục đích:** Giữ trạng thái nội dung có thể thay đổi đang được biên tập trên một nhánh.
- **Dữ liệu chính:** Nội dung cấu trúc hiện hành, nhánh, người/nhóm đang phụ trách, thời điểm cập nhật, trạng thái hoạt động.
- **Quan hệ:** Thuộc một `DraftBranch`; tạo nhiều `DraftCheckpoint`; là nguồn tạo `DraftVersion` khi người dùng chốt mốc chính thức.
- **Bất biến:** Mỗi `DraftBranch` có tối đa một workspace đang hoạt động; tự động lưu không tạo `DraftVersion`; không được đưa trực tiếp vào `ReleasePackage`.

### 4.2. DraftCheckpoint - Mốc khôi phục dự thảo

- **Mục đích:** Lưu ảnh chụp tự động hoặc thủ công để có thể khôi phục trạng thái biên tập.
- **Dữ liệu chính:** Thời điểm, loại tự động/thủ công, nội dung chụp, người/yêu cầu tạo, lý do hoặc nhãn mốc.
- **Quan hệ:** Thuộc `DraftWorkspace`; có thể được chọn để khôi phục workspace; liên kết `AuditEvent`.
- **Bất biến:** Không phải `DraftVersion` và không được phát hành; checkpoint đã tạo không bị sửa; mọi thao tác khôi phục phải tạo `AuditEvent` và không xóa lịch sử sau mốc.

### 4.3. DraftVersion - Phiên bản dự thảo

- **Mục đích:** Lưu một mốc nội dung cấu trúc đã chốt để so sánh, xem xét hoặc phát hành.
- **Dữ liệu chính:** Mã phiên bản, nội dung cấu trúc, metadata, phiên bản cha/nguồn hợp nhất, người chốt, thời điểm, lý do, trạng thái khóa.
- **Quan hệ:** Thuộc đúng một `LegalDocumentProject` và một `DraftBranch`; được tạo từ `DraftWorkspace` hoặc hợp nhất nhiều `DraftVersion`; liên kết `LegalChange`, `ReviewRound`; được đưa vào gói qua `ReleasePackageItem`.
- **Bất biến:** Bất biến sau khi người dùng tạo mốc chính thức; không sửa nội dung tại chỗ; phiên bản hợp nhất phải truy nguyên mọi phiên bản nguồn; nội dung Structured Legal Editor là nguồn chính.

### 4.4. DraftBranch - Nhánh dự thảo

- **Mục đích:** Quản lý các phương án nội dung song song.
- **Dữ liệu chính:** Tên nhánh, mục đích, điểm tách, trạng thái, người phụ trách, lý do đóng/hợp nhất.
- **Quan hệ:** Thuộc `LegalDocumentProject`; có tối đa một `DraftWorkspace` hoạt động; chứa nhiều `DraftVersion`; có thể hợp nhất với nhánh khác vào một nhánh đích.
- **Bất biến:** Một `DraftVersion` chỉ thuộc một nhánh; hợp nhất tạo phiên bản mới ở nhánh đích và giữ liên kết nguồn; nhánh đã tham gia phát hành/quyết định không bị xóa.

### 4.5. LegalChange - Thay đổi pháp lý/nội dung dự thảo

- **Mục đích:** Biểu diễn một thay đổi có thể truy nguyên giữa các phiên bản.
- **Dữ liệu chính:** Vị trí cấu trúc, loại thay đổi, nội dung trước/sau hoặc phép biến đổi, lý do, người đề xuất, người quyết định, trạng thái.
- **Quan hệ:** Liên kết phiên bản nguồn/đích; tham chiếu `Comment`, `CommentResolution`, `Meeting`, `DirectionDocument`, `DirectionTask`, `Submission`, `Approval` hoặc `LegalBasis` làm căn cứ.
- **Bất biến:** Mọi thay đổi đã chốt phải có ít nhất một căn cứ phát sinh và người quyết định; không được mất liên kết khi sinh DOCX/PDF.

### 4.6. ReleasePackage - Gói phát hành

- **Mục đích:** Đóng gói bất biến hồ sơ đã gửi lấy ý kiến, trình, thẩm định, phê duyệt hoặc phát hành.
- **Dữ liệu chính:** Loại phát hành, vấn đề xin ý kiến/quyết định khi có nhiều phương án, đối tượng nhận, kênh, thời điểm, người phát hành, người có thẩm quyền lựa chọn, kết quả lựa chọn, mã kiểm tra/tính toàn vẹn.
- **Quan hệ:** Thuộc `LegalDocumentProject`; chứa nhiều `ReleasePackageItem`; có thể gắn `Consultation`, `Submission` hoặc `Approval`.
- **Bất biến:** Gói và toàn bộ mục trong gói bị khóa sau phát hành; thay đổi thành phần phải tạo gói mới; phải tái xác định được chính xác dữ liệu và mẫu dùng để sinh từng tài liệu.

### 4.7. ReleasePackageItem - Mục trong gói phát hành

- **Mục đích:** Quản lý từng phương án dự thảo hoặc tài liệu khác được đưa vào một gói phát hành.
- **Dữ liệu chính:** Vai trò `PRIMARY`, `ALTERNATIVE` hoặc `REFERENCE`; thứ tự; mô tả; đối tượng nội dung; lý do đưa vào gói.
- **Quan hệ:** Thuộc một `ReleasePackage`; có thể tham chiếu `DraftVersion`, `GeneratedDocument` hoặc `SupportingDocument` theo đúng loại.
- **Bất biến:** Một gói có tối đa một `PRIMARY`; có thể không có `PRIMARY` khi xin lựa chọn giữa các phương án; chỉ nhận `DraftVersion` nếu mục là dự thảo, không nhận `DraftWorkspace`; bất biến sau phát hành.

### 4.8. SupportingDocument - Tài liệu hỗ trợ

- **Mục đích:** Quản lý biểu mẫu, phụ lục, báo cáo hoặc tài liệu tham chiếu không phải nội dung dự thảo văn bản.
- **Dữ liệu chính:** Loại tài liệu, tên, nguồn, phiên bản/trạng thái, chủ thể cung cấp, thời điểm, mức độ bảo mật, tệp hoặc nội dung tham chiếu.
- **Quan hệ:** Thuộc `LegalDocumentProject`; được đưa vào gói qua `ReleasePackageItem`; có thể là nguồn cho `GeneratedDocument` hoặc căn cứ nghiệp vụ.
- **Bất biến:** Không bị ép thành `DraftVersion`; bản đã đưa vào gói phát hành không bị thay thế; phiên bản mới của tài liệu tạo mục tham chiếu mới.

### 4.9. GeneratedDocument - Tài liệu được sinh

- **Mục đích:** Quản lý DOCX, PDF hoặc bản trình bày truyền thống sinh từ dữ liệu cấu trúc.
- **Dữ liệu chính:** Loại/định dạng, mẫu và phiên bản mẫu, phiên bản dữ liệu nguồn, thời điểm sinh, người/yêu cầu sinh, mã kiểm tra, trạng thái.
- **Quan hệ:** Sinh từ `DraftVersion`, `SupportingDocument` hoặc dữ liệu hồ sơ; được đưa vào gói qua `ReleasePackageItem`.
- **Bất biến:** Không trở thành nguồn nội dung độc lập; bản trong gói đã phát hành không bị thay thế; phải truy được về dữ liệu cấu trúc và mẫu nguồn.

### 4.10. DraftVersionBasis - Căn cứ tạo phiên bản dự thảo

- **Mục đích:** Ghi một hoặc nhiều căn cứ nghiệp vụ giải thích vì sao `DraftVersion` được chốt.
- **Dữ liệu chính:** Loại căn cứ, nguồn tham chiếu, vai trò căn cứ, nội dung tóm tắt, người ghi nhận, thời điểm và ghi chú.
- **Quan hệ:** Thuộc một `DraftVersion`; có thể tham chiếu `Comment`, `DirectionDocument`, `Meeting`, `Consultation`, kết quả thẩm định, `DraftCheckpoint`, phiên bản nguồn hợp nhất hoặc `SourceDocument`.
- **Bất biến:** Liên kết đã chốt cùng phiên bản là bất biến; không dùng thực thể này thay thế `LegalBasis` về nguồn và hiệu lực pháp lý.

### 4.11. SourceDocument - Tài liệu nguồn hoặc tài liệu làm căn cứ

- **Mục đích:** Quản lý tệp/tài liệu được dùng làm nguồn nội dung hoặc chứng cứ nghiệp vụ trong hồ sơ.
- **Dữ liệu chính:** Loại tài liệu, tên, số/ký hiệu nếu có, ngày, nguồn thu thập, phiên bản tệp, checksum, trạng thái kiểm chứng, người nhập và người kiểm chứng.
- **Quan hệ:** Thuộc `LegalDocumentProject`; có thể được tham chiếu bởi `DraftVersionBasis`, `ChangeProposal`, `ResolutionOption`, `LegalChange` hoặc sự kiện nghiệp vụ; có thể liên hệ `SupportingDocument` khi đưa vào gói.
- **Bất biến:** Thay tệp hoặc nhập lại tạo phiên bản nguồn mới, không ghi đè; tệp chưa kiểm chứng không được dùng làm nguồn sửa đổi chính thức; dữ liệu nhạy cảm không đưa vào Git.

### 4.12. ChangeProposal - Đề xuất thay đổi

- **Mục đích:** Giữ nội dung đề xuất chỉnh lý trước khi được người có quyền phê duyệt.
- **Dữ liệu chính:** Nút đích, nội dung trước/sau đề xuất, người đề xuất, lý do, nguồn, trạng thái xem xét và ảnh hưởng dự kiến.
- **Quan hệ:** Phát sinh từ `Comment`, `CommentResolution`, chỉ đạo, họp hoặc rà soát; có thể trở thành `ResolutionOption`; sau phê duyệt có thể tạo `LegalChange`.
- **Bất biến:** Đề xuất chưa duyệt không được coi là thay đổi đang áp dụng và không tự sửa `DraftWorkspace`; mỗi lần sửa đề xuất phải giữ dấu vết.

### 4.13. LegalNodeVersionState - Trạng thái nút tại phiên bản

- **Mục đích:** Ghi trạng thái nội dung và vị trí hiển thị của một `LegalNode` tại một `DraftVersion` để so sánh đầu-cuối.
- **Dữ liệu chính:** ID nút ổn định, phiên bản, nội dung cấu trúc, số/tên hiển thị, quan hệ cha-con và trạng thái tồn tại.
- **Quan hệ:** Thuộc một `DraftVersion`; tham chiếu cùng `LegalNode`; là đầu hoặc cuối của `LegalChange`.
- **Bất biến:** Đổi số không đổi ID nút; trạng thái của phiên bản bất biến không bị ghi đè; không lưu HTML diff làm nguồn.

### 4.14. DraftVersionPath - Đường phiên bản dùng để so sánh

- **Mục đích:** Ghi chuỗi phiên bản và nhánh được chọn khi so sánh xa.
- **Dữ liệu chính:** Phiên bản đầu/cuối, các mốc trung gian, nhánh, quan hệ cha-con, điểm rẽ/hợp nhất và cách chọn đường.
- **Quan hệ:** Tham chiếu các `DraftVersion`, `DraftBranch` và nguồn hợp nhất.
- **Bất biến:** Chỉ gồm các quan hệ đã được chứng minh; không suy diễn tuyến tính; nếu có nhiều đường hợp lệ phải lưu lựa chọn hoặc yêu cầu người dùng chọn.

### 4.15. DraftLegalNodeChange - Thay đổi nút giữa các phiên bản dự thảo

- **Mục đích:** Ghi nhận biến động của cùng một `LegalNode` trong quá trình phát triển dự thảo, tách biệt với thao tác dự kiến tác động lên văn bản gốc.
- **Dữ liệu chính:** ID nút ổn định; vị trí, cha, thứ tự và số hiển thị trước/sau; loại `DRAFT_RENUMBER`, `DRAFT_MOVE`, `DRAFT_CONTENT_CHANGE` hoặc `DRAFT_MOVE_AND_CONTENT_CHANGE`; phiên bản phát sinh; lý do; căn cứ; người thực hiện và phê duyệt; chỉ báo nội dung có thay đổi.
- **Quan hệ:** Liên kết hai `LegalNodeVersionState`, `LegalChange`, `DraftVersionPath`, căn cứ và `AuditEvent`.
- **Bất biến:** Không ghép nút bằng số hiển thị; đổi số/di chuyển giữ nguyên ID và không được lưu như bãi bỏ cộng bổ sung; loại kết hợp giữ riêng dấu vết cấu trúc và nội dung; không dùng thực thể này thay cho `AmendmentOperation`.

## 5. Nhóm lấy ý kiến và tiếp thu

### 5.1. Consultation - Đợt lấy ý kiến

- **Mục đích:** Quản lý một hoạt động lấy ý kiến có đối tượng và thời hạn xác định.
- **Dữ liệu chính:** Phạm vi, đối tượng, kênh, ngày mở/đóng, phiên bản/gói phát hành, yêu cầu phản hồi, trạng thái.
- **Quan hệ:** Thuộc `ReviewRound`; tham chiếu `ReleasePackage`; nhận nhiều `Comment`.
- **Bất biến:** Phiên bản phát hành lấy ý kiến bị khóa; thay đổi phạm vi hoặc dự thảo sau phát hành phải tạo đợt/gói mới hoặc ghi phụ lục điều chỉnh có thẩm quyền.

### 5.2. Comment - Ý kiến góp ý

- **Mục đích:** Ghi một ý kiến từ cá nhân/cơ quan đối với nội dung hoặc hồ sơ.
- **Dữ liệu chính:** Chủ thể, thời điểm, nội dung, vị trí liên quan, tài liệu đính kèm, mức độ, nguồn/kênh, trạng thái hợp lệ.
- **Quan hệ:** Thuộc `Consultation` hoặc phát sinh từ `Meeting`; có một hoặc nhiều `CommentResolution`; có thể làm căn cứ cho `LegalChange`.
- **Bất biến:** Giữ nguyên nội dung gốc và nguồn nhận; chỉnh lỗi nhập liệu phải có nhật ký, không ghi đè làm mất bằng chứng.

### 5.3. CommentResolution - Kết quả xử lý ý kiến

- **Mục đích:** Ghi quyết định tiếp thu, tiếp thu một phần, không tiếp thu hoặc yêu cầu làm rõ.
- **Dữ liệu chính:** Phân loại, phân tích, giải trình, người đề xuất, người quyết định, thời điểm, trạng thái, phạm vi ảnh hưởng.
- **Quan hệ:** Thuộc `Comment`; liên kết `LegalChange`, `DraftVersion`, `DirectionTask` hoặc kết luận `Meeting`.
- **Bất biến:** Không do AI tự quyết định; phải có người chịu trách nhiệm và giải trình; trạng thái chốt không sửa tại chỗ mà phải có lần điều chỉnh có nhật ký.

### 5.4. Meeting - Cuộc họp

- **Mục đích:** Ghi hoạt động thảo luận và kết luận tập thể hoặc chỉ đạo tại cuộc họp.
- **Dữ liệu chính:** Chủ đề, thời gian, địa điểm/kênh, thành phần, tài liệu đầu vào, nội dung chính, kết luận, người xác nhận.
- **Quan hệ:** Thuộc `ReviewRound`; tạo `Comment`, `DirectionTask` hoặc căn cứ cho `LegalChange`; có thể gắn `DirectionDocument`.
- **Bất biến:** Kết luận chỉ có hiệu lực nghiệp vụ sau khi được người có thẩm quyền xác nhận theo quy định của cơ quan.

### 5.5. ResolutionCase - Vấn đề cần quyết định

- **Mục đích:** Quản lý một nội dung có các ý kiến hoặc đề xuất cạnh tranh cần người có thẩm quyền lựa chọn.
- **Dữ liệu chính:** Mã, vị trí nội dung, nội dung hiện tại, mô tả xung đột, người chủ trì, hạn xử lý và trạng thái.
- **Quan hệ:** Liên kết nhiều `Comment`, `ChangeProposal`, `ResolutionOption`; có lịch sử quyết định qua `ResolutionDecision`.
- **Bất biến:** Không hợp nhất hoặc loại bỏ ý kiến nguồn khi chưa có quyết định; vụ việc đã có lịch sử không bị xóa.

### 5.6. ResolutionOption - Phương án xử lý

- **Mục đích:** Giữ riêng từng phương án cạnh tranh hoặc phương án kết hợp cho một vấn đề.
- **Dữ liệu chính:** Mã phương án, nội dung đề xuất, bên ủng hộ, căn cứ, ý kiến Tổ soạn thảo, bản xem trước và ảnh hưởng dự kiến.
- **Quan hệ:** Thuộc `ResolutionCase`; liên kết `ChangeProposal`, `Comment`, `SourceDocument`; phương án kết hợp truy nguyên các phương án nguồn.
- **Bất biến:** Tạo phương án C không ghi đè A hoặc B; phương án đã được đưa ra quyết định không bị sửa tại chỗ.

### 5.7. ResolutionDecision - Quyết định xử lý vấn đề

- **Mục đích:** Ghi lựa chọn của người có thẩm quyền đối với các phương án cạnh tranh.
- **Dữ liệu chính:** Loại quyết định, phương án được chọn, người quyết định, lý do, căn cứ thẩm quyền, yêu cầu chỉnh lý, thời điểm và trạng thái.
- **Quan hệ:** Thuộc `ResolutionCase`; tham chiếu không, một hoặc nhiều `ResolutionOption`; có thể phê duyệt `ChangeProposal` để tạo `LegalChange` và liên kết `Approval` khi phù hợp.
- **Bất biến:** Không có quyết định hợp lệ nếu thiếu lý do hoặc căn cứ thẩm quyền; hệ thống/AI không tự quyết; sửa quyết định đã chốt phải tạo quyết định thay thế và giữ lịch sử.

## 6. Nhóm chỉ đạo, trình và phê duyệt

### 6.1. DirectionDocument - Văn bản chỉ đạo hoặc thông báo kết luận

- **Mục đích:** Lưu căn cứ chính thức hóa chỉ đạo, kết luận hoặc yêu cầu xử lý.
- **Dữ liệu chính:** Loại, số/ký hiệu, ngày, chủ thể ban hành, nội dung tóm tắt, phạm vi, tài liệu nguồn, trạng thái hiệu lực nội bộ.
- **Quan hệ:** Tạo nhiều `DirectionTask`; liên kết `Meeting`, `ReviewRound`, `LegalChange` và `LegalDocumentProject`.
- **Bất biến:** Không suy diễn thẩm quyền; metadata nguồn và bản phát hành phải giữ nguyên, mọi đính chính có liên kết riêng.

### 6.2. DirectionTask - Nhiệm vụ chỉ đạo

- **Mục đích:** Chuyển một chỉ đạo/kết luận thành nhiệm vụ có người chịu trách nhiệm và kết quả.
- **Dữ liệu chính:** Nội dung, người giao/nhận, hạn xử lý, ưu tiên, trạng thái, kết quả, lý do đóng hoặc gia hạn.
- **Quan hệ:** Phát sinh từ `DirectionDocument`, `Meeting` hoặc `Approval`; thực hiện trong `ReviewRound`; có thể tạo `LegalChange`.
- **Bất biến:** Mọi thay đổi người phụ trách, hạn hoặc trạng thái phải có lịch sử; đóng nhiệm vụ không đồng nghĩa tự động chấp nhận thay đổi dự thảo.

### 6.3. Submission - Lần trình hồ sơ

- **Mục đích:** Ghi một lần gửi gói hồ sơ tới cấp/cơ quan xem xét.
- **Dữ liệu chính:** Nơi trình, mục đích, người trình, thời điểm, gói hồ sơ, trạng thái tiếp nhận, kết quả, lý do trả lại.
- **Quan hệ:** Thuộc `ReviewRound`; tham chiếu `ReleasePackage`; có thể dẫn đến `Approval`, `DirectionDocument` hoặc đợt xử lý trả lại.
- **Bất biến:** Gói đã trình bị khóa; trình lại tạo `Submission` và thường là `ReleasePackage` mới; lần trình cũ không bị ghi đè.

### 6.4. Approval - Phê duyệt hoặc quyết định

- **Mục đích:** Ghi quyết định có thẩm quyền tại một cổng hoặc đối với một gói/phiên bản.
- **Dữ liệu chính:** Loại quyết định, chủ thể, thẩm quyền/căn cứ, đối tượng được phê duyệt, thời điểm, điều kiện, kết quả, tài liệu chứng minh.
- **Quan hệ:** Liên kết `Submission`, `ReleasePackage`, `DraftVersion`, `WorkflowInstance`; có thể tạo `DirectionTask`.
- **Bất biến:** AI không được tạo quyết định phê duyệt; quyết định phải gắn đúng chủ thể, phạm vi và đối tượng bất biến tại thời điểm phê duyệt.

## 7. Nhóm căn cứ và kiểm toán

### 7.1. LegalBasis - Căn cứ pháp lý

- **Mục đích:** Quản lý căn cứ được dùng để cấu hình quy trình, thể thức, mẫu biểu hoặc quyết định nghiệp vụ.
- **Dữ liệu chính:** Nguồn chính thức, số ký hiệu, ngày ban hành, cơ quan ban hành, ngày hiệu lực/hết hiệu lực, tình trạng kiểm chứng, điều khoản liên quan, phạm vi áp dụng.
- **Quan hệ:** Liên kết `WorkflowVersion`, `WorkflowStage`, `LegalDocumentProject`, `LegalChange`, mẫu hoặc quy tắc liên quan.
- **Bất biến:** Không được ghi là hiện hành khi chưa kiểm chứng; mỗi trích dẫn phải đủ nguồn, số ký hiệu, ngày ban hành, hiệu lực và điều khoản liên quan; thay đổi hiệu lực không xóa lịch sử áp dụng.

### 7.2. AuditEvent - Sự kiện kiểm toán

- **Mục đích:** Tạo dấu vết bất biến về hành động và thay đổi trạng thái quan trọng.
- **Dữ liệu chính:** Thời điểm, chủ thể, hành động, đối tượng, giá trị/trạng thái trước-sau, lý do, nguồn truy cập, mã tương quan.
- **Quan hệ:** Có thể tham chiếu mọi thực thể nghiệp vụ; thuộc phạm vi `LegalDocumentProject` khi hành động liên quan hồ sơ.
- **Bất biến:** Không được sửa hoặc xóa bởi người dùng thông thường; phải phân biệt hành động con người, hệ thống và AI; dữ liệu nhạy cảm trong log phải được giảm thiểu theo chính sách.

## 8. Quy tắc xuyên suốt

- `WorkflowStageInstance` biểu diễn lần thực thi bước; `ReviewRound` chỉ biểu diễn hoạt động nghiệp vụ bên trong và không thay thế stage instance.
- `WorkflowStage` và `DraftVersion` không có quan hệ một-một; một stage instance có thể chứa không, một hoặc nhiều đợt xử lý và liên kết nhiều phiên bản.
- `DraftWorkspace`, `DraftCheckpoint` và `DraftVersion` có vòng đời riêng; chỉ `DraftVersion` được đưa vào gói phát hành.
- Mỗi phiên bản thuộc một nhánh; phiên bản hợp nhất mới truy nguyên nhiều phiên bản nguồn nhưng không đồng thời thuộc các nhánh nguồn.
- `ReleasePackage` và `ReleasePackageItem` đã phát hành luôn bị khóa; biểu mẫu, phụ lục và tài liệu tham chiếu được quản lý đúng loại.
- Một `ReviewRound` có thể không tạo `DraftVersion`, và một đợt chỉnh lý có thể chốt nhiều phương án.
- `LegalChange` phải truy được về căn cứ phát sinh; AI chỉ có thể đề xuất liên kết hoặc thay đổi, không quyết định.
- DOCX/PDF và trình bày truyền thống là `GeneratedDocument`, luôn sinh từ dữ liệu cấu trúc và mẫu có phiên bản.
- Hệ thống chỉ khẳng định tự động loại bỏ lỗi cấu trúc, đánh số và phần lớn lỗi thể thức đã được mô hình hóa và xác nhận; không cam kết loại bỏ hoàn toàn lỗi con người.

## 9. Nội dung cần cơ quan chuyên môn xác nhận

- Bộ mã và cách gọi tiếng Việt chính thức của các loại hồ sơ, bước, đợt và trạng thái.
- Ma trận vai trò/quyền cho từng thực thể và hành động khóa, mở lại, hợp nhất, phê duyệt.
- Quy tắc định danh, lưu giữ, tiêu hủy và phân loại bảo mật.
- Nguồn chính thức và quy trình kiểm chứng hiệu lực của `LegalBasis`.
- Chính sách tạo, lưu giữ và dọn dẹp `DraftCheckpoint`; khi nào một thay đổi cần tách thành `LegalChange` riêng.
- Quy tắc lựa chọn phương án trong gói không có `PRIMARY` và thẩm quyền ghi nhận kết quả lựa chọn.
- Điều kiện hủy/thu hồi gói phát hành và cách xử lý văn bản đính chính.
- Cấu trúc nội dung chuẩn của Structured Legal Editor và bộ quy tắc thể thức sẽ áp dụng.

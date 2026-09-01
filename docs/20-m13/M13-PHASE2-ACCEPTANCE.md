# M13 Phase 2 — Vòng đời tài khoản và văn bản nguồn

## Đã hoàn thành

- Quản trị viên có thể khóa/mở khóa tài khoản với lý do bắt buộc và system audit.
- Không cho tự khóa tài khoản đang thao tác hoặc khóa quản trị viên hoạt động cuối cùng.
- Có thể phân công một tài khoản hoạt động vào hồ sơ theo lớp góp ý, thành viên tổ soạn thảo hoặc tổ trưởng.
- Quản trị viên xem được danh mục hồ sơ toàn hệ thống để phân công, không phụ thuộc membership cá nhân.
- Hồ sơ `AMEND_DOCUMENTS` có workbench đăng ký thông tin nhận dạng từng văn bản nguồn.
- Nguồn mới được lưu `UNVERIFIED` với `PENDING_STRUCTURED_SOURCE`; checksum canonical được lưu ngay từ phiên bản đầu.
- Nguồn chưa kiểm chứng bị từ chối khi tạo amendment target.

## Chưa giả lập

- Không tự sinh nội dung pháp lý cho văn bản nguồn.
- Không tự đánh dấu `VERIFIED` từ metadata nhận dạng.
- Không suy đoán số, ngày ban hành, cơ quan ban hành hoặc tình trạng hiệu lực.
- Nhập structured source và quy trình kiểm chứng là phase tiếp theo.

## Evidence

- Integration test PostgreSQL kiểm tra lock/unlock, self-lock rejection, source registration và unverified-target rejection.
- Toàn bộ 213/213 tests PASS trên PostgreSQL 18 sạch sau migrations `0001`–`0027` và development seed chuẩn.
- Lint, production build và diff-check PASS.

# P0-07 – Workflow và đợt xử lý

Module quản lý định nghĩa quy trình có phiên bản, phiên bản được gán cho hồ sơ và từng `WorkflowStageInstance`. Một bước có thể lặp hoặc chạy song song; mỗi lần kích hoạt có số thứ tự, trạng thái, người phụ trách và kết quả cổng riêng.

`WorkflowStageInstance` không phải `DraftVersion`. Phiên bản dự thảo chỉ được tham chiếu khi hoạt động cần chốt đầu vào hoặc đầu ra. `ReviewRound` có thể liên kết với một lần thực hiện bước nhưng không thay thế bước đó.

Migration `0008_workflow_foundation.sql` là schema nguồn. P0-07B bổ sung API gán phiên bản workflow, liệt kê/kích hoạt/cập nhật `WorkflowStageInstance`, quyền `WORKFLOW_READ`, `WORKFLOW_MANAGE`, `WORKFLOW_GATE_DECIDE` và audit cho mọi thao tác thay đổi.

Giao diện tự dùng PostgreSQL khi cấu hình `NEXT_PUBLIC_SAMPLE_PROJECT_ID`, `NEXT_PUBLIC_DEVELOPMENT_USER_ID`, `DATABASE_URL` và adapter danh tính phát triển. Nếu chưa cấu hình, giao diện ghi rõ đang ở chế độ nguyên mẫu và dùng localStorage; không được coi chế độ này là M2.

Việc chuyển chính thức sang M2 chỉ hoàn tất sau khi chạy migration trên PostgreSQL tương thích và smoke test thành công luồng gán workflow → kích hoạt bước → quyết định cổng → đọc lại dữ liệu sau khi khởi động lại ứng dụng.

Ngày 27/08/2026, môi trường development đã hoàn thành chuỗi kiểm tra trên với dữ liệu giả định: tạo một lần `CONSULT`, cập nhật `COMPLETED/PASSED`, khởi động lại ứng dụng và đọc lại thành công từ PostgreSQL. Kết quả này nghiệm thu M2 development cho module workflow, không phải nghiệm thu production/NAS.

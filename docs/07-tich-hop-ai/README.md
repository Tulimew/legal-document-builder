# Tích hợp AI

Lưu phạm vi hỗ trợ của AI, nguyên tắc giám sát của con người, yêu cầu bảo mật, phương án tích hợp, đánh giá chất lượng và cơ chế hoạt động khi không có AI.

## Baseline tích hợp API

Ứng dụng hỗ trợ cổng REST tùy chọn cho OpenAI, Google Gemini và Anthropic Claude. Khóa API và model chỉ được cấu hình bằng biến môi trường trên máy chủ; API trạng thái chỉ trả mã nhà cung cấp và model, không trả khóa. Người dùng phải chủ động chọn và xác nhận nội dung được phép gửi ra ngoài trước mỗi yêu cầu.

Kết quả AI luôn là đề xuất chưa áp dụng. AI không đọc ngầm toàn bộ hồ sơ, không tự ghi vào `DraftWorkspace`, không tự tiếp thu ý kiến, không phê duyệt và không tạo căn cứ pháp lý. Audit chỉ lưu nhà cung cấp, model, loại tác vụ và checksum đầu vào/đầu ra; không sao chép nội dung nhạy cảm vào metadata audit. Luồng thủ công tiếp tục hoạt động khi không có khóa hoặc nhà cung cấp lỗi.

# IAM và phân quyền

## 1. Phạm vi

- Mã công việc: `P0-06`.
- Phạm vi: mô hình người dùng/người/đơn vị, membership theo hồ sơ, role–permission có phiên bản, delegation có thời hạn và enforcement tại API.
- Chưa thuộc phạm vi: chọn LDAP/OIDC/SAML cụ thể, đồng bộ danh bạ, giao diện quản trị tài khoản, MFA và chính sách mật khẩu của nhà cung cấp.

Không lưu mật khẩu trong ứng dụng. `user_account` chỉ ánh xạ `external_provider_code` và `external_subject` của adapter định danh được phê duyệt sau này.

## 2. Mô hình quyền

Quyền không gắn trực tiếp toàn cục vào user. Quyền hiệu lực được tính từ:

1. tài khoản đang hoạt động;
2. membership đang hoạt động và còn thời hạn trong đúng hồ sơ;
3. role version đang hiệu lực và permission của role; hoặc
4. delegation đang hoạt động, đúng hồ sơ, đúng người nhận, còn thời hạn và cho phép đúng permission.

Backend trả `FORBIDDEN` nếu không tìm thấy grant. Frontend ẩn nút chỉ là hỗ trợ trải nghiệm, không thay thế kiểm tra server.

## 3. Permission baseline

| Mã | Ý nghĩa |
| --- | --- |
| `WORKSPACE_READ` | Đọc workspace |
| `WORKSPACE_EDIT` | Sửa workspace |
| `COMMENT_READ` | Đọc ý kiến và kết quả |
| `COMMENT_CREATE` | Nhập ý kiến |
| `COMMENT_RESOLVE` | Chốt tiếp thu/giải trình |

Role là cấu hình có `code` và `version_code`; migration không lập trình cứng tên vai trò nghiệp vụ. Permission baseline là năng lực kỹ thuật ổn định được API kiểm tra.

## 4. Chế độ phát triển

`AUTH_MODE=development` chỉ bật adapter header phát triển. Mặc định nó vẫn phải có user/membership/role trong database.

Biến `AUTH_DEVELOPMENT_BYPASS_AUTHORIZATION=true` cho phép bỏ qua authorization chỉ trên máy phát triển. Không cấu hình biến này trên môi trường dùng chung, thử nghiệm nghiệp vụ hoặc NAS.

## 5. Trạng thái nghiệm thu

- [x] Có schema IAM nền và delegation.
- [x] Role definition có phiên bản, không khóa cứng vai trò nghiệp vụ.
- [x] API workspace và góp ý thực thi permission ở backend.
- [x] Membership/delegation do server đưa vào actor audit, không nhận từ payload.
- [x] Mặc định từ chối nếu IAM chưa cấu hình hoặc không có quyền.
- [x] Có unit test cho grant và từ chối.
- [ ] Chọn và tích hợp adapter danh bạ thực tế — cần quyết định của người dùng/cơ quan.
- [ ] Chạy integration test PostgreSQL thật.

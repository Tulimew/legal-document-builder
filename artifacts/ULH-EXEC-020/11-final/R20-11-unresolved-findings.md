# R20-11 Unresolved Findings and Technical Observations

**Dự án:** Unified Legal Hub (ULH)  
**Mã nhiệm vụ:** `ULH-EXEC-020`  
**Giai đoạn:** R20-11 — Final Acceptance Package  
**Ngày lập báo cáo:** 2026-11-23  

---

## 1. Tình trạng tổng thể các phát hiện kiểm toán

Trải qua quá trình rà soát và kiểm định độc lập đa tầng từ ULH-EXEC-018, ULH-EXEC-019 và hoàn tất tại ULH-EXEC-020:
- **Phát hiện mức độ Nghiêm trọng (Critical):** **0** (Không còn tồn tại).
- **Phát hiện mức độ Cao (High):** **0** (Không còn tồn tại).
- **Phát hiện mức độ Trung bình (Medium):** **0** (Toàn bộ đã được khắc phục và kiểm chứng).
- **Quan sát kiến trúc mức Thấp / Thông tin (Low / Informational):** **2** (Ghi nhận để theo dõi trong kế hoạch vận hành dài hạn).

---

## 2. Bảng đối soát các phát hiện đã được đóng dứt điểm (Resolved Audit Findings)

| Mã phát hiện ban đầu | Nội dung phát hiện kiểm toán | Biện pháp khắc phục đã thực hiện | Bằng chứng kiểm chứng | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **F-01** | Lệch số lượng migration giữa dump phục hồi (31) và Staging (32) | Làm rõ quy tắc runner lọc bỏ `0002_p0_04_test_fixture.sql` và tính chất pre-0033 của bản dump drill | `01-migration/R20-01-migration-history-results.md` | **CLOSED** |
| **F-02** | Phân tầng môi trường phục hồi chưa rõ ràng (Level 1 vs 2 vs 3) | Thực hiện diễn tập phục hồi trên Cụm sạch độc lập hoàn toàn (Port 55433, Level 3 DR) | `02-dr-restore/R20-02-postgres-topology.md` | **CLOSED** |
| **F-03** | Khác biệt cấu trúc database sau phục hồi cụm sạch | Khôi phục đầy đủ quyền sở hữu, grant privileges; đối chiếu khớp 89 bảng, 121 triggers, 1396 ràng buộc | `02-dr-restore/R20-02-restore-validation-results.md` | **CLOSED** |
| **F-04** | Nguy cơ vòng lặp tham chiếu mã băm trong manifest (Circular hashing) | Thực thi quy tắc Non-Circular Manifest; tính toán mã băm loại trừ chính tệp manifest | `03-integrity/R20-03-manifest-validation.log` | **CLOSED** |
| **F-05** | Tuyên bố quá mức về khả năng trigger chặn được siêu người dùng | Kiểm định thực nghiệm 45 ca; ghi nhận chính xác ranh giới: Trigger chặn DML cho mọi user; app roles bị chặn DDL | `04-security/R20-04-c1-security-boundary.md` | **CLOSED** |
| **F-06** | Chưa chứng minh tính độc lập kỹ thuật của Verifier Engine | Kiểm thử 10/10 ca thực nghiệm: chặn trùng engine, chặn trùng runtime family, kiểm soát trôi dạt payload | `05-verification/R20-05-independent-verification-flow.md` | **CLOSED** |
| **F-07** | Khoảng trống rà soát toàn bộ các cột checksum trên codebase | Rà soát toàn bộ 37 cột schema và 13 điểm gọi nghiệp vụ; chứng minh không còn điểm gọi dùng thuật toán cũ | `06-checksum/R20-06-checksum-policy-review.md` | **CLOSED** |
| **F-08** | Kiểm tra quyền hạn vai trò qua siêu người dùng thay vì kết nối thực | Kết nối trực tiếp 4 vai trò qua TCP port 55432; ghi nhận chính xác ma trận quyền SELECT/INSERT/UPDATE | `07-privilege/R20-07-least-privilege-report.md` | **CLOSED** |
| **F-09** | Chưa đối soát tỷ lệ 12 ALLOWED / 18 DENIED trong ma trận quyết định | Kiểm thử thực tế 30 trường hợp; xác nhận tỷ lệ phân bổ chính xác 100% | `08-policy/R20-08-policy-decision-matrix.csv` | **CLOSED** |
| **F-10** | Nhầm lẫn danh mục bảng khóa PK (nhắc tới bảng giả định `contract_version_history`) | Chứng minh thực nghiệm 4 bảng PK thực tế; giải trình `contract_version_history` đã tích hợp vào `draft_version` | `08-policy/R20-08-pk-trigger-validation.csv` | **CLOSED** |
| **F-11** | Thiếu bằng chứng thực nghiệm về hàm kiểm tra cú pháp Locator | Kiểm thử 16 trường hợp cho RFC 6901 JSON Pointer và Deterministic JSONPath (16/16 PASS) | `08-policy/R20-08-locator-syntax-validation.csv` | **CLOSED** |
| **F-12** | Chưa đối soát tính bất biến của chuỗi migration 0001-0032 | Tính toán và đối chiếu mã băm SHA-256 trên đĩa và CSDL cho 33 migration (100% khớp mã băm) | `09-source/R20-09-migration-integrity.csv` | **CLOSED** |

---

## 3. Các quan sát kiến trúc còn lại (Residual Observations)

Hệ thống không còn bất kỳ lỗi kỹ thuật nào cản trở việc nghiệm thu. Tuy nhiên, hai điểm sau được ghi nhận để đưa vào kế hoạch vận hành dài hạn (Operational Roadmap):

### OBS-01: Phân tách môi trường vật lý cho Verifier Engine trong giai đoạn vận hành Production (Mức Thấp)
- **Mô tả:** Trong môi trường thử nghiệm hiện tại, cả Engine quét (Scanner) và Engine xác minh (Verifier) cùng chạy trên môi trường hạ tầng máy chủ cục bộ. Mặc dù các trigger CSDL đã kiểm tra sự khác biệt về engine ID và runtime family, nhưng về mặt hạ tầng, chúng vẫn chia sẻ chung tài nguyên phần cứng.
- **Khuyến nghị cho Production:** Khi triển khai vận hành chính thức, triển khai Engine quét và Engine xác minh trên hai container Docker hoặc máy chủ độc lập với mạng mạng riêng biệt và chứng chỉ khóa HMAC riêng.

### OBS-02: Tự động hóa quy trình xoay vòng khóa xác thực giao dịch HMAC (Mức Thông tin)
- **Mô tả:** Hiện tại hàm `legal_builder.set_tx_actor_context()` kiểm tra phương thức xác thực `LOCAL_HMAC_SESSION`. Khóa bí mật phục vụ tính toán HMAC được quản lý tĩnh trong cấu hình ứng dụng.
- **Khuyến nghị cho Production:** Thiết lập lịch xoay vòng khóa tự động (Automated key rotation) định kỳ 90 ngày thông qua Secret Manager để nâng cao khả năng phòng thủ chuyên sâu.

---

## 4. Kết luận nghiệm thu

Hệ thống hoàn toàn sạch các phát hiện kiểm toán mức độ Critical và High. Các quan sát còn lại thuộc phạm vi tối ưu hóa vận hành cho môi trường Production đa máy chủ trong tương lai và không ảnh hưởng đến điều kiện phê duyệt nghiệm thu Staging hiện tại.

# Thảo luận và kết luận phương án

## Nguyên tắc

Mô-đun phân biệt ba lớp:

1. `Comment`: ý kiến nguồn của đơn vị góp ý.
2. `MemberResolutionOpinion`: quan điểm riêng của từng thành viên Tổ soạn thảo; không phải kết luận.
3. `ResolutionDecision`: lựa chọn/kết luận của người có thẩm quyền; là căn cứ để chỉnh lý nhưng không tự ghi đè dự thảo.

Mỗi quan điểm thành viên giữ đề xuất xử lý, phân tích và nội dung dự thảo đề xuất. Các quan điểm không tương thích được giữ riêng thành `ResolutionOption`; phương án kết hợp là đối tượng mới và phải truy nguyên các quan điểm nguồn.

## Kết luận

Người có quyền `RESOLUTION_DECIDE` có thể chọn phương án, giữ nguyên, tạo phương án kết hợp, yêu cầu nghiên cứu thêm hoặc xin ý kiến cấp có thẩm quyền. Kết luận bắt buộc có lý do và căn cứ thẩm quyền. Mọi lần sửa kết luận tạo sequence mới, không sửa bản ghi cũ.

Sau kết luận, người soạn thảo thực hiện chỉnh lý trong Structured Legal Editor và liên kết thay đổi với decision. Chỉ sau khi có thay đổi/version phù hợp mới chốt `CommentResolution` tiếp thu toàn bộ hoặc một phần.

Quy trình người dùng gồm bốn bước: nhập ý kiến đơn vị; thành viên tự ghi quan điểm bằng tài khoản/membership; Tổ soạn thảo họp, đối chiếu khác biệt và kết luận; người soạn thảo hoàn thiện dự thảo, lập báo cáo hoàn thành và chuyển giai đoạn. `DraftingMeeting` quản lý chương trình họp, thành phần tham dự và các `ResolutionCase`; decision có thể liên kết đúng cuộc họp tạo ra nó.

## Giao diện nguyên mẫu

- Tổng hợp ý kiến: `/ho-so/du-thao-thong-tu-mau/gop-y/tong-hop`.
- Quan điểm và phương án: `/ho-so/du-thao-thong-tu-mau/gop-y/thao-luan?commentId=YK-001`.

Giao diện hiện minh họa luồng và chưa ghi API/CSDL thật. Migration `0006_resolution_deliberation.sql` là schema nguồn; API command và integration PostgreSQL cần hoàn thiện trước khi coi là chức năng đầy đủ.

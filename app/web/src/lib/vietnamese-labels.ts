const LABELS: Record<string,string> = {
  ACTIVE:"Đang hoạt động", PAUSED:"Tạm dừng", COMPLETED:"Đã hoàn thành", ARCHIVED:"Đã lưu trữ", LOCKED:"Đã khóa", DISABLED:"Đã vô hiệu hóa", RETIRED:"Đã ngừng sử dụng",
  VERIFIED:"Đã kiểm chứng", UNVERIFIED:"Chưa kiểm chứng", REJECTED:"Không được chấp nhận",
  REFERENCE_ONLY:"Chỉ tham chiếu lịch sử", DEVELOPMENT_ONLY:"Chỉ dùng phát triển",
  MEMBERSHIP:"Thành viên hồ sơ", DELEGATION:"Được ủy quyền",
  SYSTEM_ADMIN:"Quản trị hệ thống", ACCOUNT_ADMIN:"Quản trị tài khoản", PROJECT_CREATOR:"Người tạo hồ sơ",
  COMMENT_CONTRIBUTOR:"Người góp ý", DRAFTER:"Thành viên tổ soạn thảo", DRAFTING_TEAM_LEAD:"Tổ trưởng tổ soạn thảo",
  DOCUMENT_HEADER:"Phần đầu", DOCUMENT_BODY:"Phần nội dung", DOCUMENT_FOOTER:"Phần cuối",
  NATIONAL_HEADER:"Quốc hiệu", MOTTO:"Tiêu ngữ", ISSUING_AUTHORITY:"Cơ quan, tổ chức ban hành", DOCUMENT_NUMBER:"Số, ký hiệu", PLACE_AND_DATE:"Địa danh và thời gian ban hành",
  DOCUMENT_TYPE_NAME:"Tên loại văn bản", ABSTRACT:"Trích yếu nội dung", ENFORCEMENT_PROVISION:"Điều khoản thi hành", ANNEX:"Phụ lục",
  SIGNATORY_TITLE:"Chức vụ người ký", SIGNATORY_NAME:"Họ tên người ký", SIGNATURE:"Chữ ký", SEAL:"Dấu", RECIPIENTS:"Nơi nhận", TECHNICAL_INSTRUCTION:"Chỉ dẫn kỹ thuật",
  SECTION:"Mục", CHAPTER:"Chương", SUBSECTION:"Tiểu mục", ARTICLE:"Điều", CLAUSE:"Khoản", POINT:"Điểm", OTHER:"Nội dung khác",
  ROOT:"Cấp gốc", PARAGRAPH:"Đoạn văn", LIST:"Danh sách", TABLE:"Bảng", FIGURE:"Hình minh họa",
  BOLD:"Đậm", ITALIC:"Nghiêng", UNDERLINE:"Gạch chân", SUPERSCRIPT:"Chỉ số trên", SUBSCRIPT:"Chỉ số dưới",
  BULLET:"Dấu đầu dòng", NUMBERED:"Đánh số", INLINE:"Trong dòng", BLOCK:"Khối riêng",
  NONE:"Không có", INTERNAL_REFERENCE:"Tham chiếu nội bộ", EXTERNAL_REFERENCE:"Tham chiếu bên ngoài",
  NEW_DOCUMENT:"Xây dựng văn bản mới", AMEND_DOCUMENTS:"Sửa đổi, bổ sung văn bản",
  CIRCULAR:"Thông tư", DECREE:"Nghị định",
  ORIGINAL:"Văn bản mới", AMENDING:"Văn bản sửa đổi, bổ sung",
  SUCCEEDED:"Hoàn thành", FAILED:"Thất bại", QUEUED:"Đang chờ", RUNNING:"Đang xử lý", READY:"Sẵn sàng",
  DRAFT:"Dự thảo", SEALED:"Đã khóa", AVAILABLE:"Sẵn có", CANCELLED:"Đã hủy", PENDING:"Đang chờ",
  DRAFT_VERSION:"Phiên bản dự thảo", GENERATED_DOCUMENT:"Tài liệu được tạo", RELEASE_PACKAGE:"Gói hồ sơ",
  COMMENT:"Ý kiến góp ý", LEGAL_NODE:"Nội dung pháp lý", AUDIT_EVENT:"Hoạt động được ghi nhận",
};

export function viLabel(code:string|undefined|null):string {
  if(!code)return "—";
  return LABELS[code] ?? code.replaceAll("_"," ").toLocaleLowerCase("vi-VN");
}

export const legalNodeTypeOptions=["DOCUMENT_HEADER","DOCUMENT_BODY","DOCUMENT_FOOTER","NATIONAL_HEADER","MOTTO","ISSUING_AUTHORITY","DOCUMENT_NUMBER","PLACE_AND_DATE","DOCUMENT_TYPE_NAME","ABSTRACT","CHAPTER","SECTION","SUBSECTION","ARTICLE","CLAUSE","POINT","ENFORCEMENT_PROVISION","ANNEX","SIGNATORY_TITLE","SIGNATORY_NAME","SIGNATURE","SEAL","RECIPIENTS","TECHNICAL_INSTRUCTION","OTHER"].map(code=>({code,name:viLabel(code)}));

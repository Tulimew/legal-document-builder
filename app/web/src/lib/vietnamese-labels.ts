const LABELS: Record<string,string> = {
  ACTIVE:"Đang hoạt động", LOCKED:"Đã khóa", DISABLED:"Đã vô hiệu hóa", RETIRED:"Đã ngừng sử dụng",
  VERIFIED:"Đã kiểm chứng", UNVERIFIED:"Chưa kiểm chứng", REJECTED:"Không được chấp nhận",
  REFERENCE_ONLY:"Chỉ tham chiếu lịch sử", DEVELOPMENT_ONLY:"Chỉ dùng phát triển",
  MEMBERSHIP:"Thành viên hồ sơ", DELEGATION:"Được ủy quyền",
  SYSTEM_ADMIN:"Quản trị hệ thống", ACCOUNT_ADMIN:"Quản trị tài khoản", PROJECT_CREATOR:"Người tạo hồ sơ",
  COMMENT_CONTRIBUTOR:"Người góp ý", DRAFTER:"Thành viên tổ soạn thảo", DRAFTING_TEAM_LEAD:"Tổ trưởng tổ soạn thảo",
  SECTION:"Mục", CHAPTER:"Chương", PART:"Phần", SUBSECTION:"Tiểu mục", ARTICLE:"Điều", CLAUSE:"Khoản", POINT:"Điểm", OTHER:"Nội dung khác",
  NEW_DOCUMENT:"Xây dựng văn bản mới", AMEND_DOCUMENTS:"Sửa đổi, bổ sung văn bản",
  ORIGINAL:"Văn bản mới", AMENDING:"Văn bản sửa đổi, bổ sung",
  SUCCEEDED:"Hoàn thành", FAILED:"Thất bại", QUEUED:"Đang chờ", RUNNING:"Đang xử lý",
};

export function viLabel(code:string|undefined|null):string {
  if(!code)return "—";
  return LABELS[code] ?? code.replaceAll("_"," ").toLocaleLowerCase("vi-VN");
}

export const legalNodeTypeOptions=["PART","CHAPTER","SECTION","SUBSECTION","ARTICLE","CLAUSE","POINT","OTHER"].map(code=>({code,name:viLabel(code)}));

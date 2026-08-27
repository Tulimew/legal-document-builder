export const sampleFile = { id: "HS-2026-001", name: "Dự thảo Thông tư sửa đổi quy định về quản lý hoạt động mẫu", shortName: "Dự thảo Thông tư sửa đổi hoạt động mẫu", draft: "DT-006", branch: "Nhánh hợp nhất", ruleset: "Thông tư - bản thử nghiệm 0.1" };

export const dashboardStats = [
  { label: "Dự thảo hiện tại", value: "DT-006", detail: "Hợp nhất từ DT-005 và PA-002", icon: "▤" },
  { label: "Đợt xử lý đang mở", value: "02", detail: "Góp ý nội bộ · Chỉnh lý", icon: "◫" },
  { label: "Ý kiến chưa xử lý", value: "05", detail: "Trong tổng số 8 ý kiến", icon: "◌" },
  { label: "Nhiệm vụ chỉ đạo", value: "04", detail: "2 đang thực hiện", icon: "✓" },
  { label: "Tài liệu cần xử lý", value: "02", detail: "1 thiếu · 1 cần cập nhật", icon: "□" },
  { label: "Vấn đề cần quyết định", value: "01", detail: "Chủ trì: Tổ trưởng · 02/09", icon: "◇" },
];
export const timeline = [
  ["Khởi tạo hồ sơ và DT-001", "05/08/2026", "Chuyên viên A tạo hồ sơ mẫu", false], ["Rà soát ban đầu", "07/08/2026", "Phòng chuyên môn A ghi nhận 3 vấn đề", false],
  ["Lấy ý kiến nội bộ lần 1", "09/08/2026", "Nhận 8 ý kiến từ 3 đơn vị giả định", false], ["Tạo DT-002", "11/08/2026", "Tiếp thu nhóm ý kiến đầu tiên", false],
  ["Họp Tổ soạn thảo", "15/08/2026", "Thảo luận 4 nhóm vấn đề", false], ["Thông báo kết luận KL-01", "17/08/2026", "Giao 2 nhiệm vụ chỉnh lý", false],
  ["Tạo DT-003", "18/08/2026", "Chốt nội dung sau họp", false], ["Chỉ đạo CĐ-02", "22/08/2026", "Giao bổ sung và rà soát kỹ thuật", false],
  ["Tạo DT-004", "24/08/2026", "Ghi nhận 6 thay đổi so với DT-003", false], ["Tạo DT-005", "28/08/2026", "Chốt xử lý VĐ-001 và nhóm chỉnh lý liên quan", false],
  ["Hợp nhất thành DT-006", "30/08/2026", "Hợp nhất PA-002 vào Nhánh hợp nhất", false], ["Chuẩn bị lấy ý kiến lần 2", "Đang thực hiện", "Rà soát DT-006 và gói tài liệu mẫu", true],
] as const;
export const workItems = [
  { title:"Xử lý 3 ý kiến còn mở về Điều 1", detail:"Hoàn thành trước khi phát hành gói lấy ý kiến lần 2", assignee:"Chuyên viên A", due:"31/08/2026", level:"warn" as const },
  { title:"Hoàn thành nhiệm vụ KL-01/NV-02", detail:"Rà soát thuật ngữ trong Chương I của DT-006", assignee:"Chuyên viên B", due:"31/08/2026", level:"warn" as const },
  { title:"Cập nhật bản so sánh", detail:"Bổ sung căn cứ cho thay đổi TD-006", assignee:"Chuyên viên A", due:"01/09/2026", level:"info" as const },
  { title:"Kiểm tra cấu trúc phụ lục", detail:"Đối chiếu DT-006 với RuleSet thử nghiệm", assignee:"Tổ trưởng Tổ soạn thảo", due:"01/09/2026", level:"info" as const },
  { title:"Hoàn thiện tổng hợp giải trình", detail:"Còn 5 ý kiến chưa chốt", assignee:"Phòng chuyên môn A", due:"02/09/2026", level:"warn" as const },
  { title:"Quyết định phương án cho VĐ-002", detail:"Hai luồng ý kiến trái nhau tại khoản 2 Điều 2", assignee:"Tổ trưởng Tổ soạn thảo", due:"02/09/2026", level:"warn" as const },
];
export const recentVersions = [
  { id:"DT-006",status:"Hiện tại",reason:"Hợp nhất phương án PA-002 vào nhánh chính",date:"30/08/2026",current:true },
  { id:"DT-005",status:"Đã khóa",reason:"Xử lý nhóm ý kiến xung đột mẫu",date:"28/08/2026",current:false },
  { id:"DT-004",status:"Đã khóa",reason:"Thực hiện KL-01, CĐ-02 và kết quả họp mẫu",date:"24/08/2026",current:false },
  { id:"DT-003",status:"Đã khóa",reason:"Chốt nội dung sau họp Tổ soạn thảo",date:"18/08/2026",current:false },
  { id:"DT-002",status:"Đã khóa",reason:"Tiếp thu nhóm ý kiến nội bộ lần 1",date:"11/08/2026",current:false },
  { id:"DT-001",status:"Đã khóa",reason:"Khởi tạo dự thảo làm việc đầu tiên",date:"05/08/2026",current:false },
];
export const checklist = [
  {label:"Tờ trình dự kiến",detail:"Đã có bản làm việc",state:"Đầy đủ"}, {label:"Dự thảo văn bản",detail:"DT-006 đang được rà soát",state:"Đầy đủ"},
  {label:"Tổng hợp, giải trình ý kiến",detail:"Còn 5 ý kiến chưa xử lý",state:"Cần cập nhật"}, {label:"Bản so sánh, thuyết minh",detail:"Thiếu căn cứ của TD-006",state:"Cần cập nhật"},
  {label:"Phiếu kiểm tra thành phần hồ sơ",detail:"Chưa tạo tài liệu mẫu",state:"Thiếu"},
] as const;

export type TreeNode = { id:string; label:string; type:string; level:number; hasComment?:boolean; hasDirection?:boolean; hasWarning?:boolean; content:string; parent:string; displayNumber:string };
export const structureNodes: TreeNode[] = [
  {id:"opening",label:"Phần mở đầu",type:"Phần mở đầu",level:0,content:"THÔNG TƯ\nSửa đổi, bổ sung một số nội dung về quản lý hoạt động mẫu",parent:"Văn bản",displayNumber:"Không đánh số"},
  {id:"basis",label:"Căn cứ ban hành",type:"Căn cứ ban hành",level:1,hasWarning:true,content:"Căn cứ các tài liệu nguồn giả định đã được kiểm chứng trong hồ sơ mẫu;\nTheo đề nghị của đơn vị chủ trì giả định;",parent:"Phần mở đầu",displayNumber:"Không đánh số"},
  {id:"ch1",label:"Chương I · Quy định chung",type:"Chương",level:0,content:"QUY ĐỊNH CHUNG",parent:"Văn bản",displayNumber:"Chương I"},
  {id:"art1",label:"Điều 1 · Phạm vi điều chỉnh",type:"Điều",level:1,hasComment:true,content:"Văn bản mẫu này quy định nguyên tắc quản lý, phối hợp và theo dõi hoạt động giả định trong phạm vi hồ sơ thử nghiệm.",parent:"Chương I",displayNumber:"Điều 1"},
  {id:"a1c1",label:"Khoản 1 · Phạm vi áp dụng",type:"Khoản",level:2,hasComment:true,content:"Quy định áp dụng đối với các chủ thể giả định tham gia quy trình quản lý hoạt động mẫu.",parent:"Điều 1",displayNumber:"1"},
  {id:"a1c1a",label:"Điểm a · Chủ thể thực hiện",type:"Điểm",level:3,content:"Đơn vị chủ trì giả định và các đơn vị phối hợp;",parent:"Khoản 1",displayNumber:"a"},
  {id:"a1c1b",label:"Điểm b · Phạm vi công việc",type:"Điểm",level:3,hasWarning:true,content:"Các công việc mẫu được ghi nhận trong hồ sơ và có thể kiểm tra.",parent:"Khoản 1",displayNumber:"b"},
  {id:"a1c2",label:"Khoản 2 · Ngoại lệ mẫu",type:"Khoản",level:2,content:"Trường hợp giả định khác được xử lý theo quyết định nghiệp vụ đã ghi nhận.",parent:"Điều 1",displayNumber:"2"},
  {id:"art2",label:"Điều 2 · Đối tượng áp dụng",type:"Điều",level:1,hasDirection:true,content:"Đối tượng áp dụng gồm đơn vị chủ trì, đơn vị phối hợp và cá nhân được phân công trong hồ sơ mẫu.",parent:"Chương I",displayNumber:"Điều 2"},
  {id:"a2c1",label:"Khoản 1 · Đơn vị chủ trì",type:"Khoản",level:2,content:"Đơn vị chủ trì giả định tổ chức thực hiện và tổng hợp kết quả.",parent:"Điều 2",displayNumber:"1"},
  {id:"a2c2",label:"Khoản 2 · Đơn vị phối hợp",type:"Khoản",level:2,hasComment:true,content:"Đơn vị phối hợp giả định cung cấp thông tin và phản hồi đúng thời hạn mẫu.",parent:"Điều 2",displayNumber:"2"},
  {id:"art3",label:"Điều 3 · Nguyên tắc thực hiện",type:"Điều",level:1,hasComment:true,content:"Việc thực hiện bảo đảm rõ trách nhiệm, có dấu vết xử lý và được rà soát theo quy trình đã phê duyệt.",parent:"Chương I",displayNumber:"Điều 3"},
  {id:"a3c1",label:"Khoản 1 · Trách nhiệm",type:"Khoản",level:2,content:"Người thực hiện và người chịu trách nhiệm được xác định riêng trong từng nhiệm vụ.",parent:"Điều 3",displayNumber:"1"},
  {id:"a3c2",label:"Khoản 2 · Dấu vết",type:"Khoản",level:2,hasDirection:true,content:"Mọi thay đổi nội dung phải liên kết với nguồn phát sinh và người phê duyệt.",parent:"Điều 3",displayNumber:"2"},
  {id:"ch2",label:"Chương II · Tổ chức thực hiện",type:"Chương",level:0,content:"TỔ CHỨC THỰC HIỆN",parent:"Văn bản",displayNumber:"Chương II"},
  {id:"art4",label:"Điều 4 · Trách nhiệm phối hợp",type:"Điều",level:1,hasComment:true,content:"Các đơn vị giả định phối hợp theo nhiệm vụ, thời hạn và kết quả đầu ra được giao.",parent:"Chương II",displayNumber:"Điều 4"},
  {id:"a4c1",label:"Khoản 1 · Phân công",type:"Khoản",level:2,content:"Đầu mối soạn thảo phân công nhiệm vụ và theo dõi tiến độ thực hiện.",parent:"Điều 4",displayNumber:"1"},
  {id:"a4c2",label:"Khoản 2 · Báo cáo",type:"Khoản",level:2,hasWarning:true,content:"Kết quả được tổng hợp trong báo cáo mẫu trước thời điểm kết thúc đợt xử lý.",parent:"Điều 4",displayNumber:"2"},
  {id:"art5",label:"Điều 5 · Điều khoản thi hành",type:"Điều khoản thi hành",level:1,hasDirection:true,content:"Văn bản mẫu này dự kiến áp dụng từ thời điểm được ghi trong bản phát hành giả định.",parent:"Chương II",displayNumber:"Điều 5"},
  {id:"a5c1",label:"Khoản 1 · Thời điểm áp dụng",type:"Khoản",level:2,content:"Thời điểm áp dụng chỉ là dữ liệu minh họa và chưa có giá trị pháp lý.",parent:"Điều 5",displayNumber:"1"},
  {id:"appendix",label:"Phụ lục · Bảng theo dõi mẫu",type:"Phụ lục",level:0,content:"Bảng thông tin minh họa gồm mã nhiệm vụ, người phụ trách, thời hạn và trạng thái.",parent:"Văn bản",displayNumber:"Phụ lục"},
  {id:"sign",label:"Phần ký",type:"Phần ký",level:0,content:"CHỨC DANH NGƯỜI KÝ MẪU\nNgười phê duyệt giả định",parent:"Văn bản",displayNumber:"Không đánh số"},
  {id:"recipients",label:"Nơi nhận",type:"Nơi nhận",level:0,content:"- Các đơn vị giả định;\n- Tổ soạn thảo giả định;\n- Lưu: Hồ sơ mẫu.",parent:"Văn bản",displayNumber:"Không đánh số"},
];

export type MockComment={id:string;nodeId:string;org:string;author:string;text:string;status:string};
export const comments:MockComment[]=[
  {id:"YK-001",nodeId:"art1",org:"Đơn vị góp ý A",author:"Chuyên viên góp ý A",text:"Đề nghị làm rõ phạm vi hoạt động mẫu.",status:"Đã tiếp thu"},
  {id:"YK-002",nodeId:"art1",org:"Đơn vị góp ý B",author:"Chuyên viên góp ý B",text:"Đề nghị thu hẹp một phần đối tượng áp dụng.",status:"Tiếp thu một phần"},
  {id:"YK-003",nodeId:"a2c2",org:"Đơn vị góp ý C",author:"Chuyên viên góp ý C",text:"Đề nghị bổ sung thời hạn phản hồi mẫu.",status:"Chưa xử lý"},
  {id:"YK-004",nodeId:"art3",org:"Đơn vị góp ý A",author:"Chuyên viên góp ý A",text:"Đề nghị rà soát cách diễn đạt nguyên tắc.",status:"Chỉnh lý kỹ thuật"},
  {id:"YK-005",nodeId:"a3c2",org:"Đơn vị góp ý B",author:"Chuyên viên góp ý D",text:"Đề nghị làm rõ dấu vết phê duyệt.",status:"Chưa xử lý"},
  {id:"YK-006",nodeId:"art4",org:"Đơn vị góp ý C",author:"Chuyên viên góp ý C",text:"Đề nghị bổ sung trách nhiệm phối hợp.",status:"Chưa xử lý"},
  {id:"YK-007",nodeId:"a4c2",org:"Đơn vị góp ý A",author:"Chuyên viên góp ý E",text:"Đề nghị thống nhất thời điểm báo cáo.",status:"Chưa xử lý"},
  {id:"YK-008",nodeId:"art5",org:"Đơn vị góp ý B",author:"Chuyên viên góp ý B",text:"Đề nghị kiểm tra lại điều khoản thi hành mẫu.",status:"Chưa xử lý"},
];
export const directions=[
  {id:"KL-01",type:"Thông báo kết luận",title:"Kết luận cuộc họp Tổ soạn thảo mẫu",date:"17/08/2026",nodes:["art2","a3c2"],tasks:["NV-01 · Chuyên viên A rà soát Điều 2","NV-02 · Chuyên viên B chuẩn hóa thuật ngữ"]},
  {id:"CĐ-02",type:"Chỉ đạo",title:"Chỉ đạo hoàn thiện dự thảo mẫu",date:"22/08/2026",nodes:["art5"],tasks:["NV-03 · Chuyên viên A bổ sung điều khoản thi hành","NV-04 · Tổ trưởng kiểm tra bản so sánh"]},
];
export const warnings=[
  {level:"Lỗi chặn",icon:"×",title:"Thiếu dữ liệu bắt buộc",text:"Thời điểm dự kiến áp dụng chưa được xác nhận trong dữ liệu mẫu."},
  {level:"Cần xác nhận",icon:"!",title:"Tham chiếu cần rà soát",text:"Một tham chiếu nội bộ có thể bị ảnh hưởng khi đánh lại số."},
  {level:"Gợi ý",icon:"i",title:"Gợi ý biên tập",text:"Có thể rút gọn một câu để nội dung rõ hơn."},
];

export type ChangeType="Bổ sung"|"Sửa đổi"|"Bãi bỏ"|"Thay đổi cấu trúc";
export type ApprovalStatus="Đã phê duyệt"|"Chờ phê duyệt"|"Thiếu căn cứ";
export type DraftChange={id:string;nodeId:string;location:string;type:ChangeType;before:string;removed:string;added:string;after:string;editor:string;proposer:string;organization:string;editedAt:string;reason:string;sourceType:string;sourceName?:string;sourceContent:string;resolution:string;approver?:string;approvedAt?:string;status:ApprovalStatus;effectiveVersion:string};
export const draftChanges:DraftChange[]=[
  {id:"TD-001",nodeId:"art1",location:"Điều 1",type:"Sửa đổi",before:"quản lý hoạt động mẫu",removed:"quản lý",added:"quản lý, phối hợp và theo dõi",after:"quản lý, phối hợp và theo dõi hoạt động mẫu",editor:"Chuyên viên A",proposer:"Chuyên viên góp ý A",organization:"Phòng chuyên môn A",editedAt:"24/08/2026 09:15",reason:"Tiếp thu toàn bộ đề nghị làm rõ phạm vi.",sourceType:"Ý kiến góp ý",sourceName:"YK-001 · Đơn vị góp ý A",sourceContent:"Đề nghị làm rõ phạm vi hoạt động mẫu.",resolution:"Tiếp thu toàn bộ; bổ sung nội dung phối hợp và theo dõi.",approver:"Tổ trưởng Tổ soạn thảo",approvedAt:"24/08/2026 15:10",status:"Đã phê duyệt",effectiveVersion:"DT-004"},
  {id:"TD-002",nodeId:"a1c2",location:"Điều 1, khoản 2",type:"Sửa đổi",before:"Mọi trường hợp khác đều áp dụng tương tự.",removed:"Mọi trường hợp khác đều áp dụng tương tự",added:"Trường hợp giả định khác được xử lý theo quyết định nghiệp vụ",after:"Trường hợp giả định khác được xử lý theo quyết định nghiệp vụ đã ghi nhận.",editor:"Chuyên viên B",proposer:"Chuyên viên góp ý B",organization:"Phòng chuyên môn A",editedAt:"24/08/2026 09:40",reason:"Tiếp thu một phần; giữ phạm vi ngoại lệ nhưng bổ sung điều kiện kiểm soát.",sourceType:"Ý kiến góp ý",sourceName:"YK-002 · Đơn vị góp ý B",sourceContent:"Đề nghị thu hẹp một phần đối tượng áp dụng.",resolution:"Tiếp thu một phần và bổ sung điều kiện kiểm soát.",approver:"Tổ trưởng Tổ soạn thảo",approvedAt:"24/08/2026 15:20",status:"Đã phê duyệt",effectiveVersion:"DT-004"},
  {id:"TD-003",nodeId:"art3",location:"Điều 3",type:"Sửa đổi",before:"Việc thực hiện phải rõ trách nhiệm và được rà soát.",removed:"phải",added:"bảo đảm",after:"Việc thực hiện bảo đảm rõ trách nhiệm và được rà soát.",editor:"Chuyên viên B",proposer:"Chuyên viên B",organization:"Phòng chuyên môn A",editedAt:"24/08/2026 10:05",reason:"Không tiếp thu nội dung đề nghị nhưng bỏ từ cũ và chỉnh lý kỹ thuật cách diễn đạt.",sourceType:"Ý kiến góp ý",sourceName:"YK-004 · Đơn vị góp ý A",sourceContent:"Đề nghị rà soát cách diễn đạt nguyên tắc.",resolution:"Không tiếp thu nội dung đề nghị; chỉnh lý kỹ thuật bằng cách bỏ từ cũ.",approver:"Tổ trưởng Tổ soạn thảo",approvedAt:"24/08/2026 15:25",status:"Đã phê duyệt",effectiveVersion:"DT-004"},
  {id:"TD-004",nodeId:"art2",location:"Điều 2",type:"Sửa đổi",before:"Đối tượng gồm các đơn vị tham gia.",removed:"các đơn vị tham gia",added:"đơn vị chủ trì, đơn vị phối hợp và cá nhân được phân công",after:"Đối tượng áp dụng gồm đơn vị chủ trì, đơn vị phối hợp và cá nhân được phân công.",editor:"Chuyên viên A",proposer:"Tổ trưởng Tổ soạn thảo",organization:"Phòng chuyên môn A",editedAt:"24/08/2026 10:30",reason:"Thực hiện yêu cầu phân định nhóm đối tượng.",sourceType:"Thông báo kết luận",sourceName:"KL-01 · Kết luận cuộc họp Tổ soạn thảo mẫu",sourceContent:"Phân định rõ nhóm đối tượng trong Điều 2.",resolution:"Thực hiện đầy đủ kết luận mẫu.",approver:"Tổ trưởng Tổ soạn thảo",approvedAt:"24/08/2026 15:35",status:"Đã phê duyệt",effectiveVersion:"DT-004"},
  {id:"TD-005",nodeId:"a3c2",location:"Điều 3, khoản 2",type:"Bổ sung",before:"Chưa có khoản này.",removed:"",added:"Mọi thay đổi nội dung phải liên kết với nguồn phát sinh và người phê duyệt.",after:"Mọi thay đổi nội dung phải liên kết với nguồn phát sinh và người phê duyệt.",editor:"Chuyên viên A",proposer:"Tổ trưởng Tổ soạn thảo",organization:"Phòng chuyên môn A",editedAt:"24/08/2026 11:10",reason:"Bổ sung theo nội dung thống nhất tại cuộc họp mẫu.",sourceType:"Kết quả họp",sourceName:"BBH-03 · Biên bản họp Tổ soạn thảo mẫu",sourceContent:"Thống nhất bổ sung yêu cầu truy nguyên thay đổi.",resolution:"Đề xuất bổ sung khoản mới; đang chờ phê duyệt.",status:"Chờ phê duyệt",effectiveVersion:"DT-004"},
  {id:"TD-006",nodeId:"a4c2",location:"Điều 4, khoản 2",type:"Thay đổi cấu trúc",before:"Nội dung báo cáo nằm trong khoản 1.",removed:"Nội dung báo cáo tại khoản 1",added:"Tách thành khoản 2 về báo cáo",after:"Kết quả được tổng hợp trong báo cáo mẫu trước thời điểm kết thúc đợt xử lý.",editor:"Chuyên viên B",proposer:"Chuyên viên B",organization:"Phòng chuyên môn A",editedAt:"24/08/2026 13:20",reason:"Chủ động tách nội dung để dễ theo dõi; lý do chi tiết đang bổ sung.",sourceType:"Chủ động rà soát của Tổ soạn thảo",sourceContent:"Chưa khai báo nội dung nguồn cụ thể.",resolution:"Chưa có phương án giải trình được phê duyệt.",status:"Thiếu căn cứ",effectiveVersion:"DT-004"},
];

export type ChangeSegment={kind:"unchanged"|"added"|"deleted";text:string;changeId?:string};
export type ComparedBlock={id:string;kind:"opening"|"basis"|"chapter"|"article"|"clause"|"point"|"signature";label?:string;segments:ChangeSegment[]};
export const comparisonDocument:ComparedBlock[]=[
  {id:"cmp-opening",kind:"opening",segments:[{kind:"unchanged",text:"THÔNG TƯ\nSửa đổi, bổ sung một số nội dung về quản lý hoạt động mẫu"}]},
  {id:"cmp-basis",kind:"basis",segments:[{kind:"unchanged",text:"Căn cứ các tài liệu nguồn giả định đã được kiểm chứng trong hồ sơ mẫu;\nTheo đề nghị của đơn vị chủ trì giả định;"}]},
  {id:"cmp-ch1",kind:"chapter",label:"Chương I\nQUY ĐỊNH CHUNG",segments:[]},
  {id:"cmp-art1",kind:"article",label:"Điều 1. Phạm vi điều chỉnh",segments:[{kind:"unchanged",text:"Văn bản mẫu này quy định nguyên tắc "},{kind:"deleted",text:"quản lý",changeId:"TD-001"},{kind:"added",text:"quản lý, phối hợp và theo dõi",changeId:"TD-001"},{kind:"unchanged",text:" hoạt động giả định trong phạm vi hồ sơ thử nghiệm."}]},
  {id:"cmp-a1c1",kind:"clause",label:"1.",segments:[{kind:"unchanged",text:"Quy định áp dụng đối với các chủ thể giả định tham gia quy trình quản lý hoạt động mẫu."}]},
  {id:"cmp-a1c1a",kind:"point",label:"a)",segments:[{kind:"unchanged",text:"Đơn vị chủ trì giả định và các đơn vị phối hợp;"}]},
  {id:"cmp-a1c1b",kind:"point",label:"b)",segments:[{kind:"unchanged",text:"Các công việc mẫu được ghi nhận trong hồ sơ và có thể kiểm tra."}]},
  {id:"cmp-a1c2",kind:"clause",label:"2.",segments:[{kind:"deleted",text:"Mọi trường hợp khác đều áp dụng tương tự.",changeId:"TD-002"},{kind:"added",text:"Trường hợp giả định khác được xử lý theo quyết định nghiệp vụ đã ghi nhận.",changeId:"TD-002"}]},
  {id:"cmp-art2",kind:"article",label:"Điều 2. Đối tượng áp dụng",segments:[{kind:"unchanged",text:"Đối tượng áp dụng gồm "},{kind:"deleted",text:"các đơn vị tham gia",changeId:"TD-004"},{kind:"added",text:"đơn vị chủ trì, đơn vị phối hợp và cá nhân được phân công",changeId:"TD-004"},{kind:"unchanged",text:" trong hồ sơ mẫu."}]},
  {id:"cmp-a2c1",kind:"clause",label:"1.",segments:[{kind:"unchanged",text:"Đơn vị chủ trì giả định tổ chức thực hiện và tổng hợp kết quả."}]},
  {id:"cmp-a2c2",kind:"clause",label:"2.",segments:[{kind:"unchanged",text:"Đơn vị phối hợp giả định cung cấp thông tin và phản hồi đúng thời hạn mẫu."}]},
  {id:"cmp-art3",kind:"article",label:"Điều 3. Nguyên tắc thực hiện",segments:[{kind:"unchanged",text:"Việc thực hiện "},{kind:"deleted",text:"phải",changeId:"TD-003"},{kind:"added",text:"bảo đảm",changeId:"TD-003"},{kind:"unchanged",text:" rõ trách nhiệm, có dấu vết xử lý và được rà soát theo quy trình đã phê duyệt."}]},
  {id:"cmp-a3c1",kind:"clause",label:"1.",segments:[{kind:"unchanged",text:"Người thực hiện và người chịu trách nhiệm được xác định riêng trong từng nhiệm vụ."}]},
  {id:"cmp-a3c2",kind:"clause",label:"2.",segments:[{kind:"added",text:"Mọi thay đổi nội dung phải liên kết với nguồn phát sinh và người phê duyệt.",changeId:"TD-005"}]},
  {id:"cmp-ch2",kind:"chapter",label:"Chương II\nTỔ CHỨC THỰC HIỆN",segments:[]},
  {id:"cmp-art4",kind:"article",label:"Điều 4. Trách nhiệm phối hợp",segments:[{kind:"unchanged",text:"Các đơn vị giả định phối hợp theo nhiệm vụ, thời hạn và kết quả đầu ra được giao."}]},
  {id:"cmp-a4c1",kind:"clause",label:"1.",segments:[{kind:"unchanged",text:"Đầu mối soạn thảo phân công nhiệm vụ và theo dõi tiến độ thực hiện."}]},
  {id:"cmp-a4c2",kind:"clause",label:"2.",segments:[{kind:"deleted",text:"Nội dung báo cáo tại khoản 1.",changeId:"TD-006"},{kind:"added",text:"Kết quả được tổng hợp trong báo cáo mẫu trước thời điểm kết thúc đợt xử lý.",changeId:"TD-006"}]},
  {id:"cmp-art5",kind:"article",label:"Điều 5. Điều khoản thi hành",segments:[{kind:"unchanged",text:"Văn bản mẫu này dự kiến áp dụng từ thời điểm được ghi trong bản phát hành giả định."}]},
  {id:"cmp-sign",kind:"signature",segments:[{kind:"unchanged",text:"CHỨC DANH NGƯỜI KÝ MẪU\nNgười phê duyệt giả định"}]},
];

export type AmendmentOperation={id:string;nodeId:string;type:string;target:string;before:string;after:string;reason:string;source:string;proposer:string;status:string};
export const amendmentOperations:AmendmentOperation[]=[
  {id:"TTSD-001",nodeId:"art1",type:"Thay thế",target:"Điều 1",before:"Nội dung phạm vi cũ giả định.",after:"Nội dung phạm vi mới trong dự thảo mẫu.",reason:"Làm rõ phạm vi điều chỉnh.",source:"YK-001",proposer:"Chuyên viên A",status:"Đã duyệt nghiệp vụ"},
  {id:"TTSD-002",nodeId:"a3c2",type:"Bổ sung",target:"Sau khoản 1 Điều 3",before:"Chưa có nội dung.",after:"Bổ sung khoản về dấu vết thay đổi.",reason:"Thực hiện kết quả họp mẫu.",source:"BBH-03",proposer:"Chuyên viên A",status:"Chờ duyệt"},
  {id:"TTSD-003",nodeId:"a4c2",type:"Tách cấu trúc",target:"Khoản 1 Điều 4",before:"Nội dung báo cáo nằm chung trong khoản 1.",after:"Tách thành khoản 2 riêng.",reason:"Thuận tiện theo dõi nghĩa vụ báo cáo.",source:"Chưa xác định đầy đủ",proposer:"Chuyên viên B",status:"Thiếu căn cứ"},
];

export const versionHistory=[
  {code:"DT-001",name:"Dự thảo khởi tạo",parent:"—",branch:"Phương án chính",basis:"Khởi tạo hồ sơ",creator:"Chuyên viên A",createdAt:"05/08/2026 09:00",changes:0,status:"Đã khóa"},
  {code:"DT-002",name:"Sau góp ý nội bộ lần 1",parent:"DT-001",branch:"Phương án chính",basis:"Đợt lấy ý kiến YK-01",creator:"Chuyên viên A",createdAt:"11/08/2026 16:20",changes:3,status:"Đã khóa"},
  {code:"DT-003",name:"Sau họp Tổ soạn thảo",parent:"DT-002",branch:"Phương án chính",basis:"Kết quả họp BBH-03",creator:"Chuyên viên B",createdAt:"18/08/2026 10:15",changes:4,status:"Đã khóa"},
  {code:"DT-004",name:"Sau thông báo kết luận mẫu",parent:"DT-003",branch:"Phương án chính",basis:"KL-01 và CĐ-02",creator:"Chuyên viên A",createdAt:"24/08/2026 14:30",changes:6,status:"Đã khóa"},
  {code:"DT-005",name:"Sau xử lý ý kiến xung đột mẫu",parent:"DT-004",branch:"Phương án chính",basis:"Quyết định xử lý VĐ-001",creator:"Chuyên viên B",createdAt:"28/08/2026 10:20",changes:2,status:"Đã khóa"},
  {code:"DT-006",name:"Phiên bản hợp nhất phương án",parent:"DT-005",branch:"Nhánh hợp nhất",basis:"Hợp nhất PA-002 vào nhánh chính",creator:"Tổ trưởng Tổ soạn thảo",createdAt:"30/08/2026 16:00",changes:3,status:"Hiện tại"},
];
export const versionBasisTypes=["Ý kiến chỉ đạo của Lãnh đạo Bộ","Ý kiến chỉ đạo của Lãnh đạo Cục","Ý kiến của cấp có thẩm quyền khác","Thông báo kết luận","Kết quả họp Tổ soạn thảo","Đợt lấy ý kiến","Ý kiến thẩm định","Rà soát của Tổ soạn thảo","Hợp nhất phương án","Khôi phục checkpoint","Căn cứ khác"];

export type ResolutionOption={id:string;content:string;supporters:string;basis:string;teamOpinion:string;preview:string;impact:string};
export type ResolutionCase={id:string;nodeId:string;location:string;currentContent:string;conflictReason:string;chair:string;due:string;status:string;comments:{id:string;source:string;content:string}[];options:ResolutionOption[]};
export const resolutionCases:ResolutionCase[]=[{id:"VĐ-002",nodeId:"a2c2",location:"Điều 2, khoản 2",currentContent:"Đơn vị phối hợp giả định cung cấp thông tin và phản hồi đúng thời hạn mẫu.",conflictReason:"Một luồng đề nghị quy định thời hạn cố định; luồng còn lại đề nghị để thời hạn theo từng đợt xử lý.",chair:"Tổ trưởng Tổ soạn thảo",due:"02/09/2026",status:"Chờ quyết định",comments:[{id:"YK-010",source:"Đơn vị góp ý C",content:"Đề nghị quy định thời hạn phản hồi cố định trong nội dung."},{id:"YK-011",source:"Đơn vị góp ý B",content:"Đề nghị thời hạn được xác định theo từng đợt xử lý để bảo đảm linh hoạt."}],options:[{id:"A",content:"Phản hồi trong thời hạn cố định được ghi trong văn bản mẫu.",supporters:"YK-010 · Đơn vị góp ý C",basis:"Ý kiến góp ý YK-010",teamOpinion:"Dễ theo dõi nhưng có thể thiếu linh hoạt.",preview:"Đơn vị phối hợp phản hồi trong thời hạn cố định được quy định.",impact:"Cần kiểm chứng tính phù hợp của thời hạn trước khi chốt."},{id:"B",content:"Thời hạn phản hồi được xác định trong từng đợt xử lý.",supporters:"YK-011 · Đơn vị góp ý B",basis:"Ý kiến góp ý YK-011",teamOpinion:"Linh hoạt hơn nhưng cần cơ chế kiểm soát từng đợt.",preview:"Đơn vị phối hợp phản hồi theo thời hạn của từng đợt xử lý.",impact:"Cần bổ sung trường thời hạn bắt buộc trong cấu hình đợt."}]}];

export type VersionGraphNode={code:string;parent?:string;mergeSources?:string[];branch:string};
export const versionGraph:VersionGraphNode[]=[
  {code:"DT-001",branch:"Phương án chính"},{code:"DT-002",parent:"DT-001",branch:"Phương án chính"},{code:"DT-003",parent:"DT-002",branch:"Phương án chính"},{code:"DT-004",parent:"DT-003",branch:"Phương án chính"},{code:"DT-005",parent:"DT-004",branch:"Phương án chính"},{code:"DT-006",parent:"DT-005",mergeSources:["DT-005","PA-002"],branch:"Nhánh hợp nhất"},
];
export type NodeEvolution={version:string;nodeId:string;stableNodeId:string;displayNumber:string;before:string;after:string;changeType:string;editor:string;organization:string;changedAt:string;reason:string;source:string;approver:string;status:string;intermediateOnly?:boolean};
export const nodeEvolutions:NodeEvolution[]=[
  {version:"DT-001",nodeId:"art1",stableNodeId:"LN-ART-001",displayNumber:"Điều 1",before:"—",after:"Quy định về quản lý hoạt động mẫu.",changeType:"Khởi tạo",editor:"Chuyên viên A",organization:"Phòng chuyên môn A",changedAt:"05/08/2026 09:00",reason:"Khởi tạo nội dung mẫu.",source:"Khởi tạo hồ sơ",approver:"Tổ trưởng Tổ soạn thảo",status:"Đã phê duyệt"},
  {version:"DT-002",nodeId:"art1",stableNodeId:"LN-ART-001",displayNumber:"Điều 1",before:"Quy định về quản lý hoạt động mẫu.",after:"Quy định nguyên tắc quản lý hoạt động mẫu.",changeType:"Sửa đổi lần 1",editor:"Chuyên viên B",organization:"Phòng chuyên môn A",changedAt:"11/08/2026 14:10",reason:"Tiếp thu ý kiến nội bộ mẫu.",source:"YK-001",approver:"Tổ trưởng Tổ soạn thảo",status:"Đã phê duyệt"},
  {version:"DT-003",nodeId:"art1",stableNodeId:"LN-ART-001",displayNumber:"Điều 1",before:"Quy định nguyên tắc quản lý hoạt động mẫu.",after:"Quy định nguyên tắc quản lý hoạt động mẫu.",changeType:"Không thay đổi",editor:"—",organization:"—",changedAt:"18/08/2026",reason:"Không phát sinh chỉnh lý tại nút này.",source:"—",approver:"—",status:"Không thay đổi"},
  {version:"DT-004",nodeId:"art1",stableNodeId:"LN-ART-001",displayNumber:"Điều 1",before:"Quy định nguyên tắc quản lý hoạt động mẫu.",after:"Quy định nguyên tắc quản lý, phối hợp và theo dõi hoạt động mẫu.",changeType:"Sửa đổi tiếp",editor:"Chuyên viên A",organization:"Phòng chuyên môn A",changedAt:"24/08/2026 09:15",reason:"Thực hiện KL-01.",source:"KL-01",approver:"Tổ trưởng Tổ soạn thảo",status:"Đã phê duyệt"},
  {version:"DT-005",nodeId:"art1",stableNodeId:"LN-ART-001",displayNumber:"Điều 1",before:"Quy định nguyên tắc quản lý, phối hợp và theo dõi hoạt động mẫu.",after:"Quy định nguyên tắc quản lý, phối hợp và theo dõi hoạt động mẫu.",changeType:"Không thay đổi",editor:"—",organization:"—",changedAt:"28/08/2026",reason:"Phiên bản không thay đổi nút đang xem.",source:"—",approver:"—",status:"Không thay đổi"},
  {version:"DT-006",nodeId:"art1",stableNodeId:"LN-ART-001",displayNumber:"Điều 1",before:"Quy định nguyên tắc quản lý, phối hợp và theo dõi hoạt động mẫu.",after:"Quy định nguyên tắc quản lý, phối hợp và theo dõi hoạt động mẫu.",changeType:"Giữ nguyên khi hợp nhất",editor:"Chuyên viên B",organization:"Phòng chuyên môn A",changedAt:"30/08/2026 15:20",reason:"Hợp nhất PA-002, không đổi nội dung nút.",source:"Hợp nhất PA-002",approver:"Tổ trưởng Tổ soạn thảo",status:"Đã phê duyệt"},
  {version:"DT-002",nodeId:"a2c2",stableNodeId:"LN-CLAUSE-002-02",displayNumber:"Khoản 2 Điều 2",before:"—",after:"Bổ sung thời hạn phản hồi cố định mẫu.",changeType:"Bổ sung",editor:"Chuyên viên B",organization:"Phòng chuyên môn A",changedAt:"11/08/2026 15:00",reason:"Theo YK-003.",source:"YK-003",approver:"Tổ trưởng Tổ soạn thảo",status:"Đã phê duyệt",intermediateOnly:true},
  {version:"DT-005",nodeId:"a2c2",stableNodeId:"LN-CLAUSE-002-02",displayNumber:"Khoản 2 Điều 2",before:"Bổ sung thời hạn phản hồi cố định mẫu.",after:"—",changeType:"Bãi bỏ nội dung trung gian",editor:"Chuyên viên A",organization:"Phòng chuyên môn A",changedAt:"28/08/2026 09:30",reason:"Quyết định giữ cơ chế thời hạn theo từng đợt.",source:"VĐ-001",approver:"Tổ trưởng Tổ soạn thảo",status:"Đã phê duyệt",intermediateOnly:true},
  {version:"DT-003",nodeId:"art3",stableNodeId:"LN-ART-003",displayNumber:"Điều 3",before:"Bảo đảm rõ trách nhiệm.",after:"Bảo đảm trách nhiệm và phối hợp.",changeType:"Sửa đổi",editor:"Chuyên viên B",organization:"Phòng chuyên môn A",changedAt:"18/08/2026 11:00",reason:"Kết quả họp mẫu.",source:"BBH-03",approver:"Tổ trưởng Tổ soạn thảo",status:"Đã phê duyệt"},
  {version:"DT-006",nodeId:"art3",stableNodeId:"LN-ART-003",displayNumber:"Điều 3",before:"Bảo đảm trách nhiệm và phối hợp.",after:"Bảo đảm rõ trách nhiệm.",changeType:"Khôi phục gần nội dung cũ",editor:"Chuyên viên A",organization:"Phòng chuyên môn A",changedAt:"30/08/2026 14:40",reason:"Rà soát khi hợp nhất.",source:"Hợp nhất PA-002",approver:"Tổ trưởng Tổ soạn thảo",status:"Đã phê duyệt"},
  {version:"DT-004",nodeId:"art4",stableNodeId:"LN-ART-004",displayNumber:"Điều 4",before:"Điều 4",after:"Điều 4",changeType:"Không thay đổi",editor:"—",organization:"—",changedAt:"24/08/2026",reason:"Không thay đổi nội dung.",source:"—",approver:"—",status:"Không thay đổi"},
  {version:"DT-005",nodeId:"art4",stableNodeId:"LN-ART-004",displayNumber:"Điều 5",before:"Điều 4",after:"Điều 5",changeType:"Đổi số",editor:"Hệ thống theo RuleSet mẫu",organization:"—",changedAt:"28/08/2026 10:00",reason:"Chèn Điều trước nút này.",source:"RuleSet thử nghiệm",approver:"Tổ trưởng Tổ soạn thảo",status:"Đã phê duyệt"},
  {version:"DT-006",nodeId:"art4",stableNodeId:"LN-ART-004",displayNumber:"Điều 5",before:"Điều 5",after:"Điều 5",changeType:"Không thay đổi",editor:"—",organization:"—",changedAt:"30/08/2026",reason:"Giữ ID LN-ART-004 sau hợp nhất.",source:"—",approver:"—",status:"Không thay đổi"},
];

export type DraftNodeChangeType="DRAFT_RENUMBER"|"DRAFT_MOVE"|"DRAFT_CONTENT_CHANGE"|"DRAFT_MOVE_AND_CONTENT_CHANGE"|"NO_CHANGE";
export type DraftNodeHistory={version:string;displayNumber:string;parent:string;type:DraftNodeChangeType;contentChanged:boolean;editor:string;reason:string;basis:string;approver:string;before:string;after:string};
export type StructureMapping={
  id:string;legalNodeId:string;oldPosition:string;newPosition:string;oldParent:string;newParent:string;
  type:DraftNodeChangeType;contentChanged:boolean;effectiveVersion:string;reason:string;basis:string;
  before:string;after:string;removed?:string;added?:string;editor:string;approver:string;history:DraftNodeHistory[];
};
export const structureMappings:StructureMapping[]=[
  {id:"DSC-001",legalNodeId:"ARTICLE-DRAFT-0003",oldPosition:"Điều 3",newPosition:"Điều 10",oldParent:"Chương I",newParent:"Chương II",type:"DRAFT_MOVE_AND_CONTENT_CHANGE",contentChanged:true,effectiveVersion:"DT-004",reason:"Sắp xếp lại bố cục dự thảo và chỉnh lý nội dung theo kết luận mẫu.",basis:"KL-01 mẫu",before:"Đơn vị thực hiện báo cáo kết quả.",after:"Đơn vị chủ trì thực hiện báo cáo và lưu dấu vết kết quả.",removed:"Đơn vị thực hiện",added:"Đơn vị chủ trì thực hiện",editor:"Chuyên viên B",approver:"Tổ trưởng Tổ soạn thảo",history:[
    {version:"DT-001",displayNumber:"Điều 3",parent:"Chương I",type:"NO_CHANGE",contentChanged:false,editor:"Chuyên viên A",reason:"Khởi tạo nút dự thảo.",basis:"Khởi tạo hồ sơ",approver:"Tổ trưởng Tổ soạn thảo",before:"—",after:"Đơn vị thực hiện báo cáo kết quả."},
    {version:"DT-002",displayNumber:"Điều 3",parent:"Chương I",type:"NO_CHANGE",contentChanged:false,editor:"—",reason:"Không thay đổi nút đang xem.",basis:"—",approver:"—",before:"Đơn vị thực hiện báo cáo kết quả.",after:"Đơn vị thực hiện báo cáo kết quả."},
    {version:"DT-003",displayNumber:"Điều 5",parent:"Chương I",type:"DRAFT_RENUMBER",contentChanged:false,editor:"Hệ thống theo RuleSet mẫu",reason:"Đánh lại số tự động do chèn các Điều phía trước.",basis:"RuleSet thử nghiệm 0.1",approver:"Tổ trưởng Tổ soạn thảo",before:"Đơn vị thực hiện báo cáo kết quả.",after:"Đơn vị thực hiện báo cáo kết quả."},
    {version:"DT-004",displayNumber:"Điều 7",parent:"Chương II",type:"DRAFT_MOVE_AND_CONTENT_CHANGE",contentChanged:true,editor:"Chuyên viên B",reason:"Chuyển sang Chương II và chỉnh lý nội dung.",basis:"KL-01 mẫu",approver:"Tổ trưởng Tổ soạn thảo",before:"Đơn vị thực hiện báo cáo kết quả.",after:"Đơn vị chủ trì thực hiện báo cáo và lưu dấu vết kết quả."},
    {version:"DT-005",displayNumber:"Điều 7",parent:"Chương II",type:"NO_CHANGE",contentChanged:false,editor:"—",reason:"Không thay đổi nút đang xem.",basis:"—",approver:"—",before:"Đơn vị chủ trì thực hiện báo cáo và lưu dấu vết kết quả.",after:"Đơn vị chủ trì thực hiện báo cáo và lưu dấu vết kết quả."},
    {version:"DT-006",displayNumber:"Điều 10",parent:"Chương II",type:"DRAFT_RENUMBER",contentChanged:false,editor:"Hệ thống theo RuleSet mẫu",reason:"Đánh lại số tự động khi hợp nhất và chèn các Điều phía trước.",basis:"RuleSet thử nghiệm 0.1 · Hợp nhất PA-002",approver:"Tổ trưởng Tổ soạn thảo",before:"Đơn vị chủ trì thực hiện báo cáo và lưu dấu vết kết quả.",after:"Đơn vị chủ trì thực hiện báo cáo và lưu dấu vết kết quả."},
  ]},
  {id:"DSC-002",legalNodeId:"ARTICLE-DRAFT-0008",oldPosition:"Điều 8",newPosition:"Điều 11",oldParent:"Chương I",newParent:"Chương II",type:"DRAFT_MOVE",contentChanged:false,effectiveVersion:"DT-004",reason:"Tổ soạn thảo chuyển nhóm nội dung sang Chương II.",basis:"BBH-03 mẫu",before:"Quy định trách nhiệm phối hợp mẫu.",after:"Quy định trách nhiệm phối hợp mẫu.",editor:"Chuyên viên A",approver:"Tổ trưởng Tổ soạn thảo",history:[
    {version:"DT-001",displayNumber:"Điều 8",parent:"Chương I",type:"NO_CHANGE",contentChanged:false,editor:"Chuyên viên A",reason:"Khởi tạo nút dự thảo.",basis:"Khởi tạo hồ sơ",approver:"Tổ trưởng Tổ soạn thảo",before:"—",after:"Quy định trách nhiệm phối hợp mẫu."},
    {version:"DT-002",displayNumber:"Điều 8",parent:"Chương I",type:"NO_CHANGE",contentChanged:false,editor:"—",reason:"Không thay đổi.",basis:"—",approver:"—",before:"Quy định trách nhiệm phối hợp mẫu.",after:"Quy định trách nhiệm phối hợp mẫu."},
    {version:"DT-003",displayNumber:"Điều 8",parent:"Chương I",type:"NO_CHANGE",contentChanged:false,editor:"—",reason:"Không thay đổi.",basis:"—",approver:"—",before:"Quy định trách nhiệm phối hợp mẫu.",after:"Quy định trách nhiệm phối hợp mẫu."},
    {version:"DT-004",displayNumber:"Điều 9",parent:"Chương II",type:"DRAFT_MOVE",contentChanged:false,editor:"Chuyên viên A",reason:"Chuyển sang Chương II theo bố cục được thống nhất.",basis:"BBH-03 mẫu",approver:"Tổ trưởng Tổ soạn thảo",before:"Quy định trách nhiệm phối hợp mẫu.",after:"Quy định trách nhiệm phối hợp mẫu."},
    {version:"DT-005",displayNumber:"Điều 9",parent:"Chương II",type:"NO_CHANGE",contentChanged:false,editor:"—",reason:"Không thay đổi.",basis:"—",approver:"—",before:"Quy định trách nhiệm phối hợp mẫu.",after:"Quy định trách nhiệm phối hợp mẫu."},
    {version:"DT-006",displayNumber:"Điều 11",parent:"Chương II",type:"DRAFT_RENUMBER",contentChanged:false,editor:"Hệ thống theo RuleSet mẫu",reason:"Đánh lại số tự động khi hợp nhất.",basis:"RuleSet thử nghiệm 0.1",approver:"Tổ trưởng Tổ soạn thảo",before:"Quy định trách nhiệm phối hợp mẫu.",after:"Quy định trách nhiệm phối hợp mẫu."},
  ]},
];

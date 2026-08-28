import assert from "node:assert/strict";
import test from "node:test";
import {validateStep4Change,type Step4ChangeInput} from "@/lib/step4-change-store";
const valid:Step4ChangeInput={nodeId:"art1",location:"Điều 1",before:"Nội dung cũ",after:"Nội dung mới",sourceType:"TECHNICAL_EDIT",reason:"Chuẩn hóa kỹ thuật",changesMeetingConclusion:false};
test("chấp nhận chỉnh lý kỹ thuật có lý do",()=>assert.deepEqual(validateStep4Change(valid),[]));
test("thay đổi khác kết luận bắt buộc có căn cứ thẩm quyền",()=>assert.match(validateStep4Change({...valid,changesMeetingConclusion:true})[0],/căn cứ thẩm quyền/));
test("chỉ đạo mới bắt buộc có mã nguồn và căn cứ",()=>assert.equal(validateStep4Change({...valid,sourceType:"NEW_DIRECTION",reason:"Theo chỉ đạo mới"}).length,2));

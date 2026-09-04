import assert from "node:assert/strict";
import test from "node:test";
import {parseCreateAmendmentOperation,parseSetAmendmentLayout} from "./amendment";

test("chấp nhận hai phương án bố cục sửa nhiều văn bản",()=>{
  for(const layoutMode of ["ARTICLE_PER_DOCUMENT","CHAPTER_PER_DOCUMENT"] as const){
    assert.equal(parseSetAmendmentLayout({contractVersion:"1.1",layoutMode,rulesetVersionCode:"1.1",decisionBasis:"Người dùng xác nhận",correlationId:"test"}).layoutMode,layoutMode);
  }
});

test("từ chối phương án bố cục không xác định",()=>{
  assert.throws(()=>parseSetAmendmentLayout({contractVersion:"1.1",layoutMode:"SECTION_PER_DOCUMENT",rulesetVersionCode:"1.1",decisionBasis:"Người dùng xác nhận",correlationId:"test"}),/layoutMode không được hỗ trợ/);
});

test("ánh xạ sửa đổi bắt buộc LegalNode nguồn và lý do",()=>{
  const id="10000000-0000-4000-8000-000000000001";
  assert.equal(parseCreateAmendmentOperation({draftLegalNodeId:id,amendmentTargetId:id,sourceVersionId:id,sourceLegalNodeId:id,operationType:"REPLACE",reason:"Thay thế theo căn cứ đã chọn"}).operationType,"REPLACE");
  assert.throws(()=>parseCreateAmendmentOperation({draftLegalNodeId:id,amendmentTargetId:id,sourceVersionId:id,sourceLegalNodeId:id,operationType:"REPLACE",reason:"ngắn"}),/ít nhất 10/);
});

import assert from "node:assert/strict";
import test from "node:test";
import {parseSetAmendmentLayout} from "./amendment";

test("chấp nhận hai phương án bố cục sửa nhiều văn bản",()=>{
  for(const layoutMode of ["ARTICLE_PER_DOCUMENT","CHAPTER_PER_DOCUMENT"] as const){
    assert.equal(parseSetAmendmentLayout({contractVersion:"1.1",layoutMode,rulesetVersionCode:"1.1",decisionBasis:"Người dùng xác nhận",correlationId:"test"}).layoutMode,layoutMode);
  }
});

test("từ chối phương án bố cục không xác định",()=>{
  assert.throws(()=>parseSetAmendmentLayout({contractVersion:"1.1",layoutMode:"SECTION_PER_DOCUMENT",rulesetVersionCode:"1.1",decisionBasis:"Người dùng xác nhận",correlationId:"test"}),/layoutMode không được hỗ trợ/);
});

import assert from"node:assert/strict";import test from"node:test";import{parseCreateStage,parseUpdateStage}from"./workflow";
test("parse create stage",()=>assert.equal(parseCreateStage({contractVersion:"1.1",stageCode:"CONSULT",correlationId:"c"}).stageCode,"CONSULT"));
test("completed stage requires passed gate",()=>assert.throws(()=>parseUpdateStage({contractVersion:"1.1",status:"COMPLETED",gateResult:"PENDING",correlationId:"c"}),/đạt hoặc được miễn/));
test("cancelled stage is accepted as audited soft delete",()=>assert.equal(parseUpdateStage({contractVersion:"1.1",status:"CANCELLED",gateResult:"PENDING",returnReason:"Người dùng hủy",correlationId:"c"}).status,"CANCELLED"));

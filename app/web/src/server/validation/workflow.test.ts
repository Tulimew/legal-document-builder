import assert from"node:assert/strict";import test from"node:test";import{parseCreateStage,parseUpdateStage}from"./workflow";
test("parse create stage",()=>assert.equal(parseCreateStage({contractVersion:"1.1",stageCode:"CONSULT",correlationId:"c"}).stageCode,"CONSULT"));
test("completed stage requires passed gate",()=>assert.throws(()=>parseUpdateStage({contractVersion:"1.1",status:"COMPLETED",gateResult:"PENDING",correlationId:"c"}),/đạt hoặc được miễn/));

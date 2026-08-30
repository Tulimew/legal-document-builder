import assert from "node:assert/strict";import test from "node:test";import {parseFinalizeAuthoring}from"./authoring-finalization";import{AppError}from"../errors";
const valid={contractVersion:"1.1",expectedRevision:2,versionCode:"DT-M6-01",versionName:"Dự thảo M6",reason:"Hoàn thiện biên tập cấu trúc",authorityBasis:"Phê duyệt của trưởng nhóm",correlationId:"m6-test"};
test("parse authoring finalization có reason và authority",()=>assert.equal(parseFinalizeAuthoring(valid).versionCode,"DT-M6-01"));
test("authoring finalization từ chối revision/code/reason sai",()=>{for(const value of[{...valid,expectedRevision:-1},{...valid,versionCode:"?"},{...valid,reason:""}])assert.throws(()=>parseFinalizeAuthoring(value),(error:unknown)=>error instanceof AppError&&error.code==="INVALID_REQUEST")});

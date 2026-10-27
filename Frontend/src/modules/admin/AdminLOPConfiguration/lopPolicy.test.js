import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultPolicy, policyDeduction, validatePolicy } from "./lopPolicy.js";
const policy={...defaultPolicy,enabled:true,effectiveFrom:"2026-10",basis:"fixed30"};
test("common policy respects grace, monthly allowance, and complete penalty groups",()=>{
 const logins=["09:10","09:11","09:20","09:25","09:30","09:40"];
 const result=policyDeduction(policy,logins,30000,"2026-10");
 assert.equal(result.lateCount,5);assert.equal(result.lopDays,.5);assert.equal(result.deduction,500);assert.equal(result.salaryAfterLOP,29500);
 assert.equal(policyDeduction(policy,logins,45000,"2026-10").deduction,750);
 assert.equal(policyDeduction({...policy,enabled:false},logins,30000,"2026-10").deduction,0);
 assert.equal(policyDeduction(policy,logins,30000,"2026-09").deduction,0);
 assert.equal(policyDeduction(policy,["09:11","09:12","09:13"],30000,"2026-10").deduction,0);
});
test("invalid policy settings are rejected",()=>{
 assert.throws(()=>validatePolicy({...policy,lateLoginsPerPenalty:0}));
 assert.throws(()=>validatePolicy({...policy,graceMinutes:-1}));
 assert.throws(()=>validatePolicy({...policy,shiftStart:"25:00"}));
 assert.throws(()=>validatePolicy({...policy,penaltyDays:3}));
});

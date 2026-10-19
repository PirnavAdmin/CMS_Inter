import { useState } from "react";
import DataTable from "@/components/common/DataTable.jsx";
import { money } from "@/components/pages/InventoryManagement/inventoryModel.js";
import { mockStaff, payrollMonth } from "./lopModel.js";
import { defaultPolicy, POLICY_KEY, validatePolicy, policyDeduction, sampleLogins } from "./lopPolicy.js";
function loadPolicy(){try {const stored=JSON.parse(localStorage.getItem(POLICY_KEY)||"null");return stored?validatePolicy(stored):{...defaultPolicy,effectiveFrom:payrollMonth()};}catch{return {...defaultPolicy,effectiveFrom:payrollMonth()};}}
export default function CommonLOPPolicy(){
 const [saved,setSaved]=useState(loadPolicy),[draft,setDraft]=useState(saved),[error,setError]=useState(""),[notice,setNotice]=useState(""),[month,setMonth]=useState(payrollMonth());
 const change=(key,value)=>{setDraft((p)=>({...p,[key]:value}));setError("");setNotice("");};
 const rows=mockStaff.map((staff)=>({...staff,...policyDeduction(saved,sampleLogins[staff.id]||[],staff.salary,month)}));
 return <section className="lop-common-policy cms-card"><h2>Common LOP Policy — All Staff</h2><p>Configure once for all teaching and non-teaching staff. The same late-login rule applies across every department.</p>
 <form className="lop-form" onSubmit={(e)=>{e.preventDefault();try{const next=validatePolicy(draft);localStorage.setItem(POLICY_KEY,JSON.stringify(next));setSaved(next);setError("");setNotice("Common mock policy saved for all staff. Preview updated below.");}catch(failure){setError(failure.message);}}}>
  <label className="lop-policy-enable">Enable common late-login LOP<input type="checkbox" checked={draft.enabled} onChange={(e)=>change("enabled",e.target.checked)}/></label>
  <label>Applies To<input value="All college staff — all departments" readOnly/></label>
  <label>Expected Login Time<input type="time" required value={draft.shiftStart} onChange={(e)=>change("shiftStart",e.target.value)}/></label>
  <label>Grace Period (Minutes)<input type="number" required min="0" max="120" value={draft.graceMinutes} onChange={(e)=>change("graceMinutes",e.target.value)}/></label>
  <label>Allowed Late Logins Per Month<input type="number" required min="0" max="31" value={draft.allowedLateLogins} onChange={(e)=>change("allowedLateLogins",e.target.value)}/></label>
  <label>Additional Late Logins Per Deduction<input type="number" required min="1" max="31" value={draft.lateLoginsPerPenalty} onChange={(e)=>change("lateLoginsPerPenalty",e.target.value)}/></label>
  <label>LOP Days Per Deduction<select value={draft.penaltyDays} onChange={(e)=>change("penaltyDays",Number(e.target.value))}><option value="0.5">Half Day (0.5)</option><option value="1">One Day (1)</option></select></label>
  <label>Salary Deduction Basis<select value={draft.basis} onChange={(e)=>change("basis",e.target.value)}><option value="calendar">Calendar days in month</option><option value="fixed30">Fixed 30-day month</option></select></label>
  <label>Effective From<input type="month" required value={draft.effectiveFrom} onChange={(e)=>change("effectiveFrom",e.target.value)}/></label>
  <div className="lop-policy-summary">After the monthly allowance, each complete group of additional late logins triggers the selected LOP days. Incomplete groups do not carry into the next month. The grace-period boundary itself is not counted as late.</div>
  {error&&<p className="lop-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <div className="lop-form-actions"><button type="button" className="cms-btn cms-btn-ghost" onClick={()=>{setDraft(saved);setError("");setNotice("");}}>Discard Changes</button><button className="cms-btn cms-btn-primary">Save Policy for All Staff</button></div>
 </form>
 <h3>All Staff — Mock Deduction Preview</h3><p>Uses sample daily check-ins and the saved policy. These deductions are separate from manual LOP entries and do not update live payroll.</p>
 <DataTable title="Common LOP Preview" rows={rows} enablePdfExport enableTablePrint={false} toolbarExtra={<label className="lop-month-filter">Preview Month<input type="month" required value={month} onChange={(e)=>{if(e.target.value)setMonth(e.target.value);}}/></label>} columns={[{key:"employeeId",label:"Employee ID"},{key:"name",label:"Staff Name"},{key:"department",label:"Department"},{key:"lateCount",label:"Late Logins"},{key:"lopDays",label:"LOP Days"},{key:"deduction",label:"Deduction",render:(r)=>money(r.deduction)},{key:"salaryAfterLOP",label:"Salary After LOP",render:(r)=>money(r.salaryAfterLOP)}]}/>
 </section>;
}

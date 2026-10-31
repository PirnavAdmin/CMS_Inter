export const POLICY_KEY = "cms-settings-common-lop-policy-v1";
export const defaultPolicy = { enabled: false, shiftStart: "09:00", graceMinutes: 10, allowedLateLogins: 2, lateLoginsPerPenalty: 3, penaltyDays: .5, basis: "calendar", effectiveFrom: "" };
const minutes = (value) => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || "")) throw new Error("Enter a valid staff login time.");
  const [h,m]=value.split(":").map(Number);return h*60+m;
};
export function validatePolicy(policy) {
  const start=minutes(policy.shiftStart);
  for(const [key,label,min,max] of [["graceMinutes","Grace minutes",0,120],["allowedLateLogins","Allowed late logins",0,31],["lateLoginsPerPenalty","Late logins per deduction",1,31]]) {
    if(!Number.isInteger(Number(policy[key]))||Number(policy[key])<min||Number(policy[key])>max)throw new Error(`${label} must be a whole number from ${min} to ${max}.`);
  }
  if(start+Number(policy.graceMinutes)>=1440)throw new Error("Grace period must end on the same day as the login time.");
  if(![.5,1].includes(Number(policy.penaltyDays)))throw new Error("Choose a half-day or one-day deduction.");
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(policy.effectiveFrom||""))throw new Error("Choose the policy effective month.");
  return {...policy,graceMinutes:Number(policy.graceMinutes),allowedLateLogins:Number(policy.allowedLateLogins),lateLoginsPerPenalty:Number(policy.lateLoginsPerPenalty),penaltyDays:Number(policy.penaltyDays)};
}
// Example first check-ins on distinct working days, used only for the mock preview.
export const sampleLogins = { "lop-staff-1":["09:05","09:11","09:20","09:25","09:30","09:15","09:18"], "lop-staff-2":["08:55","09:08","09:09","09:12"], "lop-staff-3":["09:15","09:21","09:30","09:35","09:12","09:20","09:25","09:40"] };
export function policyDeduction(policy,logins,salary,month) {
  const p=validatePolicy(policy);const lateCount=logins.filter((login)=>minutes(login)>minutes(p.shiftStart)+p.graceMinutes).length;
  const excess=Math.max(0,lateCount-p.allowedLateLogins);
  const periodDays=p.basis==="fixed30"?30:new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
  const days=p.enabled && month>=p.effectiveFrom?Math.min(periodDays,Math.floor(excess/p.lateLoginsPerPenalty)*p.penaltyDays):0;
  const deduction=Math.round(salary/periodDays*days*100)/100;
  return {lateCount,lopDays:days,deduction,salaryAfterLOP:Math.round((salary-deduction)*100)/100};
}

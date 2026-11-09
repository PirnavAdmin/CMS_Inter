// Platform module catalog and calculations derived from live API records.
export const MODULES = ["Students", "Staff", "Attendance", "Fees", "Examinations", "Timetable", "Transport", "Hostel", "Library", "Reports"];

export const renewalDaysRemaining = (date) => {
  if (!date) return null;
  const target = new Date(`${date.slice(0, 10)}T00:00:00`);
  if (!Number.isFinite(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
};

export function subscriptionState(college) {
  if (college.subscriptionStatus === "Cancelled") return "Cancelled";
  if (college.plan === "Free") return "Free";
  const days = renewalDaysRemaining(college.renewal);
  return days != null && days < 0 ? "Expired" : days != null && days <= 30 ? "Expiring Soon" : "Active";
}

export const activeAccountCount = (users, collegeId) => new Set(
  users.filter((user) => user.collegeId === collegeId && user.active && user.loginEnabled && user.role !== "SuperAdmin").map((user) => user.id),
).size;

export const collegeAdmins = (data, id) => data.users.filter((user) => user.role === "CollegeAdmin" && user.collegeId === id);

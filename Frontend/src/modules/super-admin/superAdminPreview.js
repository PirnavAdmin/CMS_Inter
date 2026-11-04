// Fixtures belong exclusively to the explicitly labelled local preview.
export const MODULES = ["Students", "Staff", "Attendance", "Fees", "Examinations", "Timetable", "Transport", "Hostel", "Library", "Reports"];
export const renewalDaysRemaining = (date) => {
  if (!date) return null;
  const target = new Date(`${date.slice(0, 10)}T00:00:00`);
  if (!Number.isFinite(target.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
};
export function subscriptionState(college) {
  if (college.subscriptionStatus === "Cancelled") return "Cancelled";
  if (college.plan === "Free") return "Free";
  const days = renewalDaysRemaining(college.renewal);
  return days != null && days < 0 ? "Expired" : days != null && days <= 30 ? "Expiring Soon" : "Active";
}
export const activeAccountCount = (users, collegeId) => new Set(users.filter((user) => user.collegeId === collegeId && user.active && user.loginEnabled && user.role !== "SuperAdmin").map((user) => user.id)).size;
export function assertAccountActivation(data, collegeId) {
  const college = data.colleges.find((item) => item.id === collegeId);
  const plan = data.plans.find((item) => item.name === college?.plan);
  if (!college || college.status !== "Active") throw new Error("Activate the college before activating its login accounts.");
  if (!plan) throw new Error("Select a college with a subscription plan.");
  if (activeAccountCount(data.users, college.id) >= plan.limit) throw new Error(plan.name === "Free"
    ? "Your free account limit has been reached. Upgrade your subscription to activate additional accounts."
    : "Your account limit has been reached. Upgrade your subscription to activate additional accounts.");
}
export function createPreviewData() {
  return {
    colleges: [
      { id: "COL-001", name: "Pirnav Junior College", code: "PJC", email: "office@example.test", phone: "9000000001", address: "Hyderabad, Telangana", logo: "", admin: "Ananya Rao", plan: "Premium", status: "Active", registered: "2026-08-12", renewal: "2026-12-12" },
      { id: "COL-002", name: "Greenfield Academy", code: "GFA", email: "hello@example.test", phone: "9000000002", address: "Vijayawada, Andhra Pradesh", logo: "", admin: "Ravi Kumar", plan: "Standard", status: "Active", registered: "2026-09-05", renewal: "2026-11-20" },
      { id: "COL-003", name: "Horizon College", code: "HZC", email: "horizon@example.test", phone: "9000000003", address: "Warangal, Telangana", logo: "", admin: "Meera Shah", plan: "Free", status: "Active", registered: "2026-10-14", renewal: "" },
      { id: "COL-004", name: "Oakridge Institute", code: "OKI", email: "oakridge@example.test", phone: "9000000004", address: "Guntur, Andhra Pradesh", logo: "", admin: "", plan: "Free", status: "Pending", registered: "2026-11-01", renewal: "" },
    ],
    plans: [
      { name: "Free", price: 0, limit: 25, modules: MODULES.slice(0, 4) },
      { name: "Basic", price: 1499, limit: 100, modules: MODULES.slice(0, 6) },
      { name: "Standard", price: 2999, limit: 300, modules: MODULES.slice(0, 8) },
      { name: "Premium", price: 5999, limit: 1000, modules: [...MODULES] },
      { name: "Enterprise", price: 12999, limit: 5000, modules: [...MODULES] },
    ],
    users: [
      { id: "U-1", name: "Ananya Rao", email: "ananya@example.test", collegeId: "COL-001", role: "CollegeAdmin", active: true, loginEnabled: true },
      { id: "U-2", name: "Ravi Kumar", email: "ravi@example.test", collegeId: "COL-002", role: "CollegeAdmin", active: true, loginEnabled: true },
      { id: "U-3", name: "Meera Shah", email: "meera@example.test", collegeId: "COL-003", role: "CollegeAdmin", active: true, loginEnabled: true },
      { id: "U-4", name: "Sana Ali", email: "sana@example.test", collegeId: "COL-001", role: "Faculty", active: true, loginEnabled: true },
      { id: "U-5", name: "Arjun Reddy", email: "arjun@example.test", collegeId: "COL-001", role: "Student", active: true, loginEnabled: true },
      { id: "U-6", name: "Priya Das", email: "priya@example.test", collegeId: "COL-002", role: "Accountant", active: false, loginEnabled: true },
      { id: "U-7", name: "Nikhil Rao", email: "nikhil@example.test", collegeId: "COL-003", role: "Faculty", active: false, loginEnabled: true },
    ],
    payments: [{ id: "PAY-001", collegeId: "COL-001", invoice: "INV-2026-001", amount: 5999, date: "2026-11-01", status: "Paid" }, { id: "PAY-002", collegeId: "COL-002", invoice: "INV-2026-002", amount: 2999, date: "2026-11-02", status: "Paid" }],
    activities: [{ id: "A-1", message: "Preview workspace initialized", at: "2026-11-04T09:00:00+05:30" }],
    settings: { platformName: "PIRNAV CMS", supportEmail: "support@example.test", renewalDays: 30 },
  };
}

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

// One versioned preview model. Legacy aliases stay synchronized for subscriptions/dashboard.
export const MOCK_DATA_KEY = "pirnav-super-admin-preview-data-v2";
export const LEGACY_DATA_KEY = "pirnav-super-admin-preview-data-v1";
const clean = (value) => String(value ?? "").trim();
const identity = (value) => clean(value).toLowerCase();
export const collegeAdmins = (data, id) => data.users.filter((user) => user.role === "CollegeAdmin" && user.collegeId === id);
export const mockAdminEligible = (data, user) => Boolean(user && user.role === "CollegeAdmin" && user.active && user.loginEnabled && data.colleges.some((college) => college.id === user.collegeId && college.collegeStatus === "Active"));
export function normalizeMockData(input) {
  const data = { ...input, schemaVersion: 2 };
  data.plans = (input.plans ?? []).map((plan) => ({ ...plan, id: plan.id || plan.name }));
  data.users = (input.users ?? []).map((user) => ({ ...user, name: user.name ?? user.fullName ?? "", fullName: user.name ?? user.fullName ?? "", phone: user.phone ?? "", active: user.active ?? user.accountStatus === "Active", accountStatus: (user.active ?? user.accountStatus === "Active") ? "Active" : "Inactive" }));
  data.registrations = [...(input.registrations ?? [])];
  data.colleges = [];
  for (const college of input.colleges ?? []) {
    // Only known application states migrate to applications; Active never implies approval.
    const status = college.registrationStatus || (["Pending", "Rejected"].includes(college.status) ? college.status : null);
    if (input.schemaVersion !== 2 && status && !data.registrations.some((row) => row.legacyCollegeId === college.id || row.collegeId === college.id)) {
      data.registrations.push({ id: `REG-${college.id}`, legacyCollegeId: college.id, collegeId: status === "Approved" ? college.id : null,
        name: college.name, code: college.code, email: college.email, contact: college.phone || "", address: college.address || "", logoUrl: college.logo || "", applicantName: college.admin || "", applicantEmail: college.adminEmail || college.email, plan: college.plan, registrationStatus: status, submittedAt: college.registered || null, reviewedAt: null });
    }
    if (["Pending", "Rejected"].includes(status) && input.schemaVersion !== 2) continue;
    const plan = data.plans.find((row) => row.name === college.plan) || data.plans.find((row) => row.id === college.subscriptionPlanId);
    const statusValue = college.status ?? college.collegeStatus ?? "Inactive";
    const admins = data.users.filter((user) => user.role === "CollegeAdmin" && user.collegeId === college.id);
    data.colleges.push({ ...college, source: college.source || "Legacy preview", collegeStatus: statusValue, status: statusValue,
      contact: college.phone ?? college.contact ?? "", phone: college.phone ?? college.contact ?? "", logoUrl: college.logo ?? college.logoUrl ?? "", logo: college.logo ?? college.logoUrl ?? "",
      plan: plan?.name || college.plan || "Free", subscriptionPlanId: plan?.id || college.subscriptionPlanId || "Free", createdAt: college.createdAt || college.registered || null,
      initialAdminName: college.initialAdminName || college.admin || "", initialAdminEmail: college.initialAdminEmail || college.adminEmail || "", admin: admins.map((user) => user.name).join(", ") });
  }
  return data;
}
export function validateCollegeIdentity(data, values, exceptId) {
  if (!clean(values.name) || !clean(values.code) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(values.email))) throw new Error("Enter college name, unique code and a valid email.");
  if (data.colleges.some((row) => row.id !== exceptId && identity(row.code) === identity(values.code))) throw new Error("A college with this code already exists.");
  if (data.colleges.some((row) => row.id !== exceptId && (identity(row.email) === identity(values.email) || (identity(row.name) === identity(values.name) && identity(row.address) === identity(values.address))))) throw new Error("This college identity already exists.");
}
export function saveMockCollege(data, values) {
  validateCollegeIdentity(data, values, values.id);
  if (values.adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(values.adminEmail))) throw new Error("Enter a valid initial admin contact email.");
  const existing = data.colleges.find((row) => row.id === values.id);
  const college = { ...existing, ...values, id: existing?.id || crypto.randomUUID(), name: clean(values.name), code: clean(values.code).toUpperCase(), email: identity(values.email), phone: clean(values.phone), logo: clean(values.logo),
    initialAdminName: clean(values.initialAdminName), initialAdminEmail: identity(values.adminEmail || values.initialAdminEmail),
    source: existing?.source || "Direct add", status: existing?.status || "Active", plan: existing?.plan || "Free", createdAt: existing?.createdAt || new Date().toISOString(), registered: existing?.registered || new Date().toISOString().slice(0, 10), renewal: existing?.renewal || "" };
  // Contact details are never converted into an account.
  return { ...data, colleges: existing ? data.colleges.map((row) => row.id === college.id ? college : row) : [...data.colleges, college] };
}
export function saveMockApplication(data, values) {
  const existing = data.registrations.find((row) => row.id === values.id);
  if (existing && existing.registrationStatus !== "Pending") throw new Error("Only pending applications can be edited.");
  validateCollegeIdentity(data, values);
  if (!clean(values.applicantName) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(values.applicantEmail))) throw new Error("Enter applicant name and valid applicant email.");
  if (data.registrations.some((row) => row.id !== values.id && row.registrationStatus !== "Rejected" && (identity(row.code) === identity(values.code) || identity(row.email) === identity(values.email) || (identity(row.name) === identity(values.name) && identity(row.address) === identity(values.address))))) throw new Error("An application with this college code or identity already exists.");
  const registration = { ...existing, ...values, id: existing?.id || crypto.randomUUID(), name: clean(values.name), code: clean(values.code).toUpperCase(), email: identity(values.email), applicantEmail: identity(values.applicantEmail), collegeId: null, registrationStatus: "Pending", submittedAt: existing?.submittedAt || new Date().toISOString(), reviewedAt: null };
  return { ...data, registrations: existing ? data.registrations.map((row) => row.id === registration.id ? registration : row) : [...data.registrations, registration] };
}
export function reviewMockApplication(data, id, status) {
  const registration = data.registrations.find((row) => row.id === id);
  if (!registration || registration.registrationStatus !== "Pending" || !["Approved", "Rejected"].includes(status)) throw new Error("This application is no longer pending.");
  let colleges = data.colleges; let collegeId = null;
  if (status === "Approved") {
    const existing = colleges.find((row) => identity(row.code) === identity(registration.code));
    if (existing && (identity(existing.name) !== identity(registration.name) || identity(existing.email) !== identity(registration.email))) throw new Error("This code belongs to a different college. Review the application details.");
    if (existing) collegeId = existing.id;
    else {
      validateCollegeIdentity(data, registration);
      collegeId = registration.legacyCollegeId || crypto.randomUUID();
      colleges = [...colleges, { id: collegeId, name: registration.name, code: registration.code, email: registration.email, phone: registration.contact || "", address: registration.address || "", logo: registration.logoUrl || "", source: "Registration", status: "Active", collegeStatus: "Active", plan: registration.plan || "Free", createdAt: new Date().toISOString(), registered: new Date().toISOString().slice(0, 10), renewal: "" }];
    }
  }
  return { ...data, colleges, registrations: data.registrations.map((row) => row.id === id ? { ...row, collegeId, registrationStatus: status, reviewedAt: new Date().toISOString() } : row) };
}
export function saveMockAdmin(data, values, existingId) {
  const college = data.colleges.find((row) => row.id === values.collegeId);
  if (!college || college.collegeStatus !== "Active") throw new Error("Select an active, approved college.");
  const email = identity(values.email); const name = clean(values.name);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter full name and a valid email.");
  const existing = data.users.find((row) => row.id === existingId);
  if (existingId && (!existing || existing.role !== "CollegeAdmin")) throw new Error("Select a compatible CollegeAdmin account.");
  if (existing?.collegeId && existing.collegeId !== college.id) throw new Error("This admin is already assigned to another college. Select an unassigned or same-college account.");
  const match = data.users.find((row) => identity(row.email) === email && row.id !== existingId);
  if (match) throw new Error("An account with this email exists. Use Assign Existing Admin if it is compatible.");
  const user = { ...existing, id: existing?.id || crypto.randomUUID(), name, fullName: name, email, phone: clean(values.phone), collegeId: college.id, role: "CollegeAdmin", active: values.active, accountStatus: values.active ? "Active" : "Inactive", loginEnabled: values.loginEnabled };
  if (user.active && user.loginEnabled && !(existing?.active && existing?.loginEnabled && existing.collegeId === college.id)) assertAccountActivation(data, college.id);
  return { ...data, users: existing ? data.users.map((row) => row.id === user.id ? user : row) : [...data.users, user] };
}

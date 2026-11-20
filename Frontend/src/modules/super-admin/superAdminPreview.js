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
      { id: "COL-001", collegeId: 1, name: "ABC Junior College", code: "ABCJC01", trustSociety: "ABC Education Trust", campuses: 2, students: 4560, modules: "Acad, Exam", email: "office@abcjc.test", phone: "9000000001", address: "Hyderabad, Telangana", logo: "", admin: "Ananya Rao", plan: "Standard", status: "Active", collegeStatus: "Active", registered: "2026-08-12", renewal: "2026-12-12" },
      { id: "COL-002", collegeId: 2, name: "Sunrise Degree College", code: "SDC02", trustSociety: "Sunrise Society", campuses: 3, students: 5240, modules: "Acad, Exam, Hostel", email: "contact@sunrise.test", phone: "9000000002", address: "Vijayawada, Andhra Pradesh", logo: "", admin: "Ravi Kumar", plan: "Premium", status: "Active", collegeStatus: "Active", registered: "2026-09-05", renewal: "2026-11-20" },
      { id: "COL-003", collegeId: 3, name: "XYZ Engineering College", code: "XYZENG03", trustSociety: "XYZ Group", campuses: 4, students: 8120, modules: "All Modules", email: "info@xyzeng.test", phone: "9000000003", address: "Warangal, Telangana", logo: "", admin: "Meera Shah", plan: "Enterprise", status: "Active", collegeStatus: "Active", registered: "2026-10-14", renewal: "" },
      { id: "COL-004", collegeId: 4, name: "Green Valley College", code: "GVC04", trustSociety: "Green Valley Trust", campuses: 1, students: 1900, modules: "Acad, Exam", email: "help@greenvalley.test", phone: "9000000004", address: "Guntur, Andhra Pradesh", logo: "", admin: "Kiran Varma", plan: "Basic", status: "Inactive", collegeStatus: "Inactive", registered: "2026-07-10", renewal: "" },
      { id: "COL-005", collegeId: 5, name: "National B.Pharmacy", code: "NBP05", trustSociety: "National Education Society", campuses: 2, students: 2760, modules: "Acad, Exam, Transport", email: "contact@nbpharmacy.test", phone: "9000000005", address: "Tirupati, Andhra Pradesh", logo: "", admin: "Deepa Reddy", plan: "Standard", status: "Active", collegeStatus: "Active", registered: "2026-08-01", renewal: "" },
      { id: "COL-006", collegeId: 6, name: "Pirnav Junior College", code: "PJC", trustSociety: "Pirnav Educational Trust", campuses: 2, students: 4560, modules: "All Modules", email: "office@pirnav.test", phone: "9000000006", address: "Hyderabad, Telangana", logo: "", admin: "Vikram Sen", plan: "Enterprise", status: "Active", collegeStatus: "Active", registered: "2026-06-15", renewal: "" },
      { id: "COL-007", collegeId: 7, name: "narayana", code: "NAR_1", trustSociety: "Narayana Educational Society", campuses: 1, students: 1200, modules: "Acad, Exam", email: "info@narayana.test", phone: "9000000007", address: "Nellore, Andhra Pradesh", logo: "", admin: "Prasad Rao", plan: "Basic", status: "Active", collegeStatus: "Active", registered: "2026-08-20", renewal: "" },
      { id: "COL-008", collegeId: 8, name: "Global Polytechnic College", code: "GPC08", trustSociety: "Global Educational Foundation", campuses: 2, students: 1850, modules: "Acad, Exam, Transport", email: "admin@globalpoly.test", phone: "9000000008", address: "Visakhapatnam, Andhra Pradesh", logo: "", admin: "Sunita Roy", plan: "Standard", status: "Active", collegeStatus: "Active", registered: "2026-09-12", renewal: "" },
      { id: "COL-009", collegeId: 9, name: "St. Mary's Women's College", code: "SMWC09", trustSociety: "St. Mary's Christian Society", campuses: 1, students: 2150, modules: "Acad, Exam", email: "contact@stmarys.test", phone: "9000000009", address: "Secunderabad, Telangana", logo: "", admin: "Sister Clara", plan: "Standard", status: "Active", collegeStatus: "Active", registered: "2026-05-18", renewal: "" },
      { id: "COL-010", collegeId: 10, name: "Heritage Arts & Science", code: "HAS10", trustSociety: "Heritage Vidya Trust", campuses: 2, students: 3200, modules: "Acad, Exam, Hostel", email: "heritage@heritage.test", phone: "9000000010", address: "Kurnool, Andhra Pradesh", logo: "", admin: "Rajesh Iyer", plan: "Premium", status: "Active", collegeStatus: "Active", registered: "2026-07-22", renewal: "" },
      { id: "COL-011", collegeId: 11, name: "City Vocational Institute", code: "CVI11", trustSociety: "City Skills Foundation", campuses: 1, students: 980, modules: "Acad, Exam", email: "info@cityvocational.test", phone: "9000000011", address: "Kadapa, Andhra Pradesh", logo: "", admin: "Arun Nair", plan: "Basic", status: "Inactive", collegeStatus: "Inactive", registered: "2026-06-30", renewal: "" },
      { id: "COL-012", collegeId: 12, name: "Apex Technology Campus", code: "ATC12", trustSociety: "Apex Educational Consortium", campuses: 3, students: 4320, modules: "All Modules", email: "contact@apextech.test", phone: "9000000012", address: "Hyderabad, Telangana", logo: "", admin: "Pooja Hegde", plan: "Enterprise", status: "Active", collegeStatus: "Active", registered: "2026-09-01", renewal: "" },
    ],
    plans: [
      { name: "Free", price: 0, limit: 25, modules: MODULES.slice(0, 4) },
      { name: "Basic", price: 1499, limit: 100, modules: MODULES.slice(0, 6) },
      { name: "Standard", price: 2999, limit: 300, modules: MODULES.slice(0, 8) },
      { name: "Premium", price: 5999, limit: 1000, modules: [...MODULES] },
      { name: "Enterprise", price: 12999, limit: 5000, modules: [...MODULES] },
    ],
    users: [
      { id: "U-1", name: "Ramesh Kumar", username: "ramesh.abc", email: "ramesh@abcdegree.ac.in", phone: "+91 98765 43210", collegeId: "COL-001", role: "CollegeAdmin", active: true, loginEnabled: true, lastLogin: "07-Nov-2026, 10:24 AM" },
      { id: "U-2", name: "Lakshmi Priya", username: "lakshmi.priya", email: "lakshmi@srichaitanya.ac.in", phone: "+91 98765 67890", collegeId: "COL-002", role: "CollegeAdmin", active: true, loginEnabled: true, lastLogin: "06-Nov-2026, 05:40 PM" },
      { id: "U-3", name: "Venkatesh R", username: "venkatesh.r", email: "venkatesh@narayana.ac.in", phone: "+91 91234 56780", collegeId: "COL-003", role: "CollegeAdmin", active: false, loginEnabled: true, lastLogin: "05-Nov-2026, 11:12 AM" },
      { id: "U-4", name: "Anitha S", username: "anitha.s", email: "anitha@gvcollege.ac.in", phone: "+91 99887 66550", collegeId: "COL-004", role: "CollegeAdmin", active: true, loginEnabled: true, lastLogin: "04-Nov-2026, 04:18 PM" },
      { id: "U-5", name: "Srinivas P", username: "srinivas.p", email: "srinivas@kakatiya.ac.in", phone: "+91 93939 22110", collegeId: "COL-005", role: "CollegeAdmin", active: true, loginEnabled: true, lastLogin: "31-Oct-2026, 09:30 AM" },
      { id: "U-6", name: "Dr. K. V. Sharma", username: "kv.sharma", email: "sharma@pirnav.edu.in", phone: "+91 98480 12345", collegeId: "COL-006", role: "CollegeAdmin", active: true, loginEnabled: true, lastLogin: "06-Nov-2026, 02:15 PM" },
      { id: "U-7", name: "Pooja Hegde", username: "pooja.hegde", email: "pooja@apextech.ac.in", phone: "+91 90000 00012", collegeId: "COL-012", role: "CollegeAdmin", active: true, loginEnabled: true, lastLogin: "05-Nov-2026, 09:45 AM" },
      { id: "U-8", name: "Sunita Roy", username: "sunita.roy", email: "sunita@globalpoly.ac.in", phone: "+91 98490 55443", collegeId: "COL-008", role: "CollegeAdmin", active: true, loginEnabled: true, lastLogin: "03-Nov-2026, 11:30 AM" },
      { id: "U-9", name: "Sister Clara", username: "sister.clara", email: "clara@stmarys.ac.in", phone: "+91 98660 77889", collegeId: "COL-009", role: "CollegeAdmin", active: true, loginEnabled: true, lastLogin: "02-Nov-2026, 04:00 PM" },
      { id: "U-10", name: "Rajesh Iyer", username: "rajesh.iyer", email: "iyer@heritage.ac.in", phone: "+91 98220 99887", collegeId: "COL-010", role: "CollegeAdmin", active: true, loginEnabled: true, lastLogin: "01-Nov-2026, 10:15 AM" },
      { id: "U-11", name: "Vikram Sen", username: "vikram.sen", email: "vikram@pirnav.ac.in", phone: "+91 98110 33221", collegeId: "COL-006", role: "CollegeAdmin", active: true, loginEnabled: true, lastLogin: "28-Oct-2026, 03:45 PM" },
      { id: "U-12", name: "Deepa Reddy", username: "deepa.reddy", email: "deepa@nbpharmacy.ac.in", phone: "+91 98770 44556", collegeId: "COL-005", role: "CollegeAdmin", active: true, loginEnabled: true, lastLogin: "27-Oct-2026, 01:20 PM" },
      { id: "U-13", name: "Kiran Varma", username: "kiran.varma", email: "kiran@gvcollege.ac.in", phone: "+91 98440 22334", collegeId: "COL-004", role: "CollegeAdmin", active: true, loginEnabled: true, lastLogin: "26-Oct-2026, 05:10 PM" },
      { id: "U-14", name: "Prasad Rao", username: "prasad.rao", email: "prasad@narayana.ac.in", phone: "+91 98550 66778", collegeId: "COL-007", role: "CollegeAdmin", active: true, loginEnabled: true, lastLogin: "25-Oct-2026, 12:00 PM" },
      { id: "U-15", name: "Arun Nair", username: "arun.nair", email: "arun@cityvocational.ac.in", phone: "+91 98330 11223", collegeId: "COL-011", role: "CollegeAdmin", active: false, loginEnabled: true, lastLogin: "20-Oct-2026, 09:10 AM" },
      { id: "U-16", name: "Meera Shah", username: "meera.shah", email: "meera@xyzeng.ac.in", phone: "+91 98990 88776", collegeId: "COL-003", role: "CollegeAdmin", active: true, loginEnabled: true, lastLogin: "22-Oct-2026, 02:40 PM" },
      { id: "U-17", name: "Ravi Kumar", username: "ravi.kumar", email: "ravi@sunrise.ac.in", phone: "+91 98660 33445", collegeId: "COL-002", role: "CollegeAdmin", active: true, loginEnabled: true, lastLogin: "19-Oct-2026, 04:30 PM" },
      { id: "U-18", name: "Ananya Rao", username: "ananya.rao", email: "ananya@abcjc.ac.in", phone: "+91 98440 88990", collegeId: "COL-001", role: "CollegeAdmin", active: true, loginEnabled: true, lastLogin: "18-Oct-2026, 11:20 AM" },
      { id: "U-19", name: "Sana Ali", email: "sana@example.test", collegeId: "COL-001", role: "Faculty", active: true, loginEnabled: true },
      { id: "U-20", name: "Arjun Reddy", email: "arjun@example.test", collegeId: "COL-001", role: "Student", active: true, loginEnabled: true },
      { id: "U-21", name: "Priya Das", email: "priya@example.test", collegeId: "COL-002", role: "Accountant", active: false, loginEnabled: true },
      { id: "U-22", name: "Nikhil Rao", email: "nikhil@example.test", collegeId: "COL-003", role: "Faculty", active: false, loginEnabled: true },
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
  data.users = (input.users ?? []).map((user) => ({
    ...user,
    name: user.name ?? user.fullName ?? "",
    fullName: user.name ?? user.fullName ?? "",
    username: user.username || (user.email ? user.email.split("@")[0] : ""),
    phone: user.phone ?? "",
    active: user.active ?? user.accountStatus === "Active",
    accountStatus: (user.active ?? user.accountStatus === "Active") ? "Active" : "Inactive",
    lastLogin: user.lastLogin || "07-Nov-2026, 10:24 AM",
  }));
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
  const username = values.username || email.split("@")[0];
  const user = {
    ...existing,
    id: existing?.id || crypto.randomUUID(),
    name,
    fullName: name,
    username,
    email,
    phone: clean(values.phone),
    collegeId: college.id,
    role: "CollegeAdmin",
    active: values.active !== false,
    accountStatus: values.active !== false ? "Active" : "Inactive",
    loginEnabled: values.loginEnabled !== false,
    lastLogin: existing?.lastLogin || "Just now",
  };
  if (user.active && user.loginEnabled && !(existing?.active && existing?.loginEnabled && existing.collegeId === college.id)) assertAccountActivation(data, college.id);
  return { ...data, users: existing ? data.users.map((row) => row.id === user.id ? user : row) : [...data.users, user] };
}

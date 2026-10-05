export const principalDashboardData = {
  principal: {
    name: "Dr. S. K. Rao",
    title: "Principal",
    college: "Pirnav Junior College",
    academicYear: "2026-2027",
  },
  summary: [
    { id: "students", label: "Total Students", value: "1,248", detail: "642 male  /  606 female", trend: "+5.6%", tone: "green", icon: "users", to: "/dashboard/students" },
    { id: "staff", label: "Total Staff", value: "96", detail: "72 teaching  /  24 support", trend: "+3.2%", tone: "violet", icon: "staff", to: "/dashboard/staff" },
    { id: "attendance", label: "Student Attendance", value: "88.4%", detail: "1,103 present today", trend: "+2.8%", tone: "blue", icon: "attendance", to: "/dashboard/attendance/student" },
    { id: "staffAttendance", label: "Staff Attendance", value: "94.8%", detail: "91 staff present today", trend: "+1.4%", tone: "teal", icon: "staffAttendance", to: "/dashboard/attendance/staff" },
    { id: "classes", label: "Active Classes", value: "32", detail: "16 sections per year", trend: "On track", tone: "indigo", icon: "classes", to: "/dashboard/sections" },
    { id: "fees", label: "Pending Fees", value: "INR 7.45L", detail: "184 students pending", trend: "-4.6%", tone: "amber", icon: "fees", to: "/dashboard/fee-structure" },
    { id: "exams", label: "Upcoming Exams", value: "6", detail: "Next: Unit Test - I", trend: "This month", tone: "rose", icon: "exams", to: "/dashboard/examinations" },
    { id: "admissions", label: "New Admissions", value: "84", detail: "17 applications pending", trend: "+12.5%", tone: "mint", icon: "admissions", to: "/dashboard/admission" },
  ],
  attendance: {
    total: 1248,
    present: 1103,
    absent: 109,
    leave: 36,
    classes: [
      { name: "1st MPC", value: 93 },
      { name: "1st BiPC", value: 90 },
      { name: "1st MEC", value: 87 },
      { name: "2nd MPC", value: 91 },
      { name: "2nd BiPC", value: 86 },
      { name: "2nd CEC", value: 82 },
    ],
  },
  staffAttendance: { total: 96, present: 91, absent: 3, leave: 2 },
  performance: [
    { label: "MPC", current: 86, previous: 81 },
    { label: "BiPC", current: 89, previous: 84 },
    { label: "MEC", current: 82, previous: 78 },
    { label: "CEC", current: 84, previous: 80 },
    { label: "HEC", current: 79, previous: 75 },
  ],
  classOverview: [
    { className: "1st Year MPC", students: 120, present: 113, absent: 7, tone: "green" },
    { className: "1st Year BiPC", students: 110, present: 104, absent: 6, tone: "blue" },
    { className: "1st Year MEC", students: 95, present: 83, absent: 12, tone: "violet" },
    { className: "2nd Year MPC", students: 125, present: 119, absent: 6, tone: "amber" },
    { className: "2nd Year BiPC", students: 115, present: 99, absent: 16, tone: "teal" },
  ],
  exams: [
    { subject: "Physics", date: "12 Oct 2026", time: "9:30 AM", classes: "2nd MPC / BiPC", room: "Block A - 204", students: 228 },
    { subject: "Mathematics", date: "14 Oct 2026", time: "9:30 AM", classes: "1st MPC / MEC", room: "Block B - 101", students: 215 },
    { subject: "Chemistry", date: "16 Oct 2026", time: "9:30 AM", classes: "2nd MPC / BiPC", room: "Block A - 204", students: 228 },
  ],
  notices: [
    { id: 1, title: "Parent-Teacher Meeting", description: "Term 1 progress review for all sections.", date: "08 Oct 2026", priority: "High", tone: "rose" },
    { id: 2, title: "Examination Notification", description: "Unit Test - I timetable is ready to publish.", date: "06 Oct 2026", priority: "Medium", tone: "amber" },
    { id: 3, title: "Staff Meeting", description: "Monthly academic review in the seminar hall.", date: "05 Oct 2026", priority: "Normal", tone: "green" },
  ],
  activities: [
    { id: 1, title: "New student admission", description: "Ravi Kumar joined 1st Year MPC.", time: "Today, 10:30 AM", icon: "user", tone: "green", to: "/dashboard/students" },
    { id: 2, title: "Fee payment received", description: "Ananya Rao paid INR 25,000 toward tuition.", time: "Today, 09:45 AM", icon: "fees", tone: "violet", to: "/dashboard/fee-structure" },
    { id: 3, title: "Examination schedule published", description: "Unit Test - I schedule is ready for review.", time: "Yesterday, 04:15 PM", icon: "exam", tone: "amber", to: "/dashboard/examinations" },
    { id: 4, title: "Leave request submitted", description: "Dr. Siva Geddam requested casual leave.", time: "Yesterday, 11:20 AM", icon: "leave", tone: "blue", to: "/dashboard/leave-management" },
  ],
  feeCollection: [
    { label: "May", value: 12.8 },
    { label: "Jun", value: 15.4 },
    { label: "Jul", value: 14.6 },
    { label: "Aug", value: 17.2 },
    { label: "Sep", value: 18.75 },
  ],
};

// The Principal dashboard is currently mock-data backed. These snapshots keep
// period filtering isolated so the data can be replaced with API responses later.
export const principalPeriodSnapshots = {
  Today: {
    attendance: principalDashboardData.attendance,
    staffAttendance: principalDashboardData.staffAttendance,
    feeCollection: principalDashboardData.feeCollection,
    feeTotal: 1875000,
    collectionRate: 71.5,
    admissions: { value: "84", detail: "17 applications pending", trend: "+12.5%" },
    activities: principalDashboardData.activities,
    notices: principalDashboardData.notices,
  },
  Yesterday: {
    attendance: {
      ...principalDashboardData.attendance,
      present: 1088,
      absent: 124,
      leave: 36,
      classes: [
        { name: "1st MPC", value: 91 }, { name: "1st BiPC", value: 89 }, { name: "1st MEC", value: 85 },
        { name: "2nd MPC", value: 89 }, { name: "2nd BiPC", value: 84 }, { name: "2nd CEC", value: 81 },
      ],
    },
    staffAttendance: { total: 96, present: 90, absent: 4, leave: 2 },
    feeCollection: [{ label: "Mon", value: 3.2 }, { label: "Tue", value: 3.8 }, { label: "Wed", value: 4.1 }, { label: "Thu", value: 3.6 }, { label: "Fri", value: 4.0 }],
    feeTotal: 1670000,
    collectionRate: 68.2,
    admissions: { value: "82", detail: "19 applications pending", trend: "+9.8%" },
    activities: principalDashboardData.activities.map((item, index) => ({ ...item, time: index === 0 ? "Yesterday, 10:30 AM" : index === 1 ? "Yesterday, 09:45 AM" : item.time.replace("Yesterday", "Monday") })),
    notices: principalDashboardData.notices.map((item, index) => ({ ...item, date: index === 0 ? "07 Oct 2026" : item.date })),
  },
  "This Week": {
    attendance: { ...principalDashboardData.attendance, present: 1096, absent: 116, leave: 36 },
    staffAttendance: { total: 96, present: 92, absent: 2, leave: 2 },
    feeCollection: [{ label: "Mon", value: 13.2 }, { label: "Tue", value: 14.5 }, { label: "Wed", value: 16.1 }, { label: "Thu", value: 15.8 }, { label: "Fri", value: 18.75 }],
    feeTotal: 1875000,
    collectionRate: 71.5,
    admissions: { value: "84", detail: "17 applications pending", trend: "+12.5%" },
    activities: principalDashboardData.activities.map((item, index) => ({ ...item, time: index < 2 ? "This week" : item.time })),
    notices: principalDashboardData.notices,
  },
  "This Month": {
    attendance: { ...principalDashboardData.attendance, present: 1112, absent: 100, leave: 36 },
    staffAttendance: { total: 96, present: 93, absent: 1, leave: 2 },
    feeCollection: [{ label: "Week 1", value: 12.8 }, { label: "Week 2", value: 15.4 }, { label: "Week 3", value: 14.6 }, { label: "Week 4", value: 17.2 }, { label: "Current", value: 18.75 }],
    feeTotal: 7875000,
    collectionRate: 71.5,
    admissions: { value: "84", detail: "17 applications pending", trend: "+12.5%" },
    activities: principalDashboardData.activities.map((item) => ({ ...item, time: "This month" })),
    notices: principalDashboardData.notices,
  },
};

export const principalQuickActions = [
  { label: "Add Student", to: "/dashboard/admission", icon: "student", tone: "green" },
  { label: "Add Staff", to: "/dashboard/staff/add", icon: "staff", tone: "blue" },
  { label: "Mark Attendance", to: "/dashboard/attendance/student", icon: "attendance", tone: "violet" },
  { label: "Create Exam", to: "/dashboard/examinations/add", icon: "exam", tone: "amber" },
  { label: "Publish Result", to: "/dashboard/results", icon: "result", tone: "teal" },
  { label: "Generate Report", to: "/dashboard/reports", icon: "report", tone: "rose" },
];

export const principalReports = [
  { label: "Student Attendance", meta: "Daily overview", to: "/dashboard/attendance/student", icon: "attendance", tone: "green" },
  { label: "Academic Performance", meta: "Term comparison", to: "/dashboard/reports", icon: "performance", tone: "violet" },
  { label: "Fee Collection", meta: "Monthly summary", to: "/dashboard/fee-structure", icon: "fees", tone: "amber" },
  { label: "Student Strength", meta: "Class distribution", to: "/dashboard/reports", icon: "students", tone: "blue" },
];

const ROUTE_MODULES = [
  ["/dashboard/settings/roles-permissions", "roles-permissions"],
  ["/dashboard/board-academic-year", "settings"],
  ["/dashboard/academic-years", "settings"],
  ["/dashboard/boards", "settings"],
  ["/dashboard/courses", "group-management"],
  ["/dashboard/subjects", "subject-management"],
  ["/dashboard/sections", "section-room"],
  ["/dashboard/staff", "staff-management"],
  ["/dashboard/departments", "department-designation"],
  ["/dashboard/designations", "department-designation"],
  ["/dashboard/admission", "student-admission"],
  ["/dashboard/section-allocation", "section-allocation"],
  ["/dashboard/students", "student-management"],
  ["/dashboard/timetable", "timetable"],
  ["/dashboard/holidays", "holiday-management"],
  ["/dashboard/attendance/staff", "staff-attendance"],
  ["/dashboard/attendance", "attendance"],
  ["/dashboard/leave-management", "staff-leave-management"],
  ["/dashboard/examinations", "examination"],
  ["/dashboard/marks-entry", "marks-evaluation"],
  ["/dashboard/results", "results"],
  ["/dashboard/promotion", "promotion"],
  ["/dashboard/promotions", "promotion"],
  ["/dashboard/transport", "transport"],
  ["/dashboard/fee-structure", "fee-management"],
  ["/dashboard/payroll", "payroll"],
  ["/dashboard/certificates", "certificates"],
  ["/dashboard/reports", "reports-analytics"],
  ["/dashboard/hostel", "hostel-management"],
  ["/hostel", "hostel-management"],
  ["/dashboard/settings", "settings"],
  ["/principal-dashboard", "dashboard"],
  ["/student-dashboard/timetable", "timetable"],
  ["/student-dashboard/attendance", "attendance"],
  ["/student-dashboard/examinations", "examination"],
  ["/student-dashboard/results", "results"],
  ["/student-dashboard/fees", "fee-management"],
  ["/student-dashboard/transport", "transport"],
  ["/student-dashboard/hostel", "hostel-management"],
  ["/student-dashboard/certificates", "certificates"],
  ["/student-dashboard/holidays", "holiday-management"],
  ["/student-dashboard", "dashboard"],
  ["/faculty-dashboard/timetable", "timetable"],
  ["/faculty-dashboard/classes", "section-room"],
  ["/faculty-dashboard/attendance", "attendance"],
  ["/faculty-dashboard/marks", "marks-evaluation"],
  ["/faculty-dashboard/exam-duties", "examination"],
  ["/faculty-dashboard/leave", "staff-leave-management"],
  ["/faculty-dashboard/holidays", "holiday-management"],
  ["/faculty-dashboard", "dashboard"],
  ["/parent-dashboard/timetable", "timetable"],
  ["/parent-dashboard/attendance", "attendance"],
  ["/parent-dashboard/academics", "results"],
  ["/parent-dashboard/examinations", "examination"],
  ["/parent-dashboard/fees", "fee-management"],
  ["/parent-dashboard/documents", "certificates"],
  ["/parent-dashboard", "dashboard"],
  ["/dashboard", "dashboard"],
];

export function getModuleKeyForPath(pathname = "") {
  const normalizedPath = String(pathname).split("?")[0].replace(/\/+$/, "") || "/";
  const match = ROUTE_MODULES.find(([route]) => normalizedPath === route || normalizedPath.startsWith(`${route}/`));
  return match?.[1] || null;
}

export function filterMenuByPermissions(menu = [], canAccess, status) {
  if (status === "loading") return [];

  return menu.flatMap((group) => {
    const items = group.items.flatMap((item) => {
      const children = item.children?.filter((child) => {
        const moduleKey = getModuleKeyForPath(child.to);
        return !moduleKey || canAccess(moduleKey);
      });
      const moduleKey = getModuleKeyForPath(item.to);
      const isVisible = !moduleKey || canAccess(moduleKey);
      if (!isVisible && !children?.length) return [];
      return [{ ...item, ...(item.children ? { children } : {}) }];
    });
    return items.length ? [{ ...group, items }] : [];
  });
}

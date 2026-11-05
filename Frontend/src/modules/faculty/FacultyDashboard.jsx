import React from "react";
import { useOutlet } from "react-router-dom";
import FacultyLayout from "./layout/FacultyLayout.jsx";
import { FacultyProvider, useFacultySafe, useFaculty } from "./FacultyContext.jsx";
import { getAuthUser } from "@/modules/auth/authStorage.js";

import FacultyDashboardHome from "./pages/FacultyDashboardHome.jsx";
import FacultyProfile from "./pages/FacultyProfile.jsx";
import FacultyTimetable from "./pages/FacultyTimetable.jsx";
import FacultyClasses from "./pages/FacultyClasses.jsx";
import FacultyStudentAttendance from "./pages/FacultyStudentAttendance.jsx";
import FacultyMarks from "./pages/FacultyMarks.jsx";
import FacultyExamDuties from "./pages/FacultyExamDuties.jsx";
import FacultyMyAttendance from "./pages/FacultyMyAttendance.jsx";
import FacultyLeave from "./pages/FacultyLeave.jsx";
import FacultyPayslips from "./pages/FacultyPayslips.jsx";
import FacultyHolidays from "./pages/FacultyHolidays.jsx";
import FacultySettings from "./pages/FacultySettings.jsx";
import FacultyReimbursement from "./pages/FacultyReimbursement.jsx";

const modulePageMap = {
  dashboard: FacultyDashboardHome,
  profile: FacultyProfile,
  timetable: FacultyTimetable,
  classes: FacultyClasses,
  attendance: FacultyStudentAttendance,
  marks: FacultyMarks,
  examduties: FacultyExamDuties,
  myattendance: FacultyMyAttendance,
  leave: FacultyLeave,
  salary: FacultyPayslips,
  holidays: FacultyHolidays,
  settings: FacultySettings,
  reimbursements: FacultyReimbursement,
};

function FacultyDashboardInner() {
  const { activeModule, profileData } = useFaculty();
  const outlet = useOutlet();
  const authUser = getAuthUser();
  const profileStatus = profileData?.profileStatus || authUser?.profileStatus;
  const statusClean = String(profileStatus || "").toLowerCase();
  const isCompleted =
    statusClean === "completed" ||
    statusClean === "approved" ||
    (authUser?.isOnboarded === true && statusClean !== "pendinglink" && statusClean !== "inprogress" && statusClean !== "draft");
  const roleLower = String(authUser?.role || "").toLowerCase();
  const staffTypeLower = String(authUser?.staffType || "").toLowerCase();
  const isFaculty =
    roleLower.includes("teach") ||
    roleLower.includes("faculty") ||
    roleLower.includes("professor") ||
    roleLower.includes("lecturer") ||
    roleLower.includes("staff") ||
    staffTypeLower.includes("teach") ||
    Boolean(authUser?.staffId) ||
    Boolean(authUser?.employeeId) ||
    Boolean(profileData?.employeeId);
  const isPendingOnboarding = isFaculty && !isCompleted;

  if (isPendingOnboarding && activeModule !== "profile") {
    return (
      <FacultyLayout>
        <FacultyProfile />
      </FacultyLayout>
    );
  }

  const ActivePage = modulePageMap[activeModule] || FacultyDashboardHome;

  return (
    <FacultyLayout>
      {isPendingOnboarding && (
        <div style={{
          margin: "16px 24px 0",
          padding: "14px 20px",
          background: "#fffdf0",
          border: "1px solid #fde68a",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: "#92400e",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
        }}>
          <span style={{ fontSize: 24, lineHeight: 1 }}>⏳</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span>Faculty Induction &amp; Profile Verification</span>
              <span style={{
                fontSize: "11px",
                fontWeight: "700",
                padding: "2px 8px",
                borderRadius: "12px",
                background: "#fef3c7",
                border: "1px solid #fde68a",
                color: "#92400e"
              }}>
                Awaiting Submission
              </span>
            </div>
            <div style={{ fontSize: 13, color: "#b45309", marginTop: 4, lineHeight: 1.5 }}>
              Please complete all 6 profile tabs (Personal, Bank, Address, Experience, Documents, Review). Minimum 50% completion is required to submit and release your official Offer Letter. Other portal features will unlock upon submission and HR approval.
            </div>
          </div>
        </div>
      )}
      {outlet || <ActivePage />}
    </FacultyLayout>
  );
}

export default function FacultyDashboard() {
  const context = useFacultySafe();

  if (!context) {
    return (
      <FacultyProvider>
        <FacultyDashboardInner />
      </FacultyProvider>
    );
  }

  return <FacultyDashboardInner />;
}

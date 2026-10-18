import React from "react";
import { useOutlet } from "react-router-dom";
import FacultyLayout from "./layout/FacultyLayout.jsx";
import { FacultyProvider, useFacultySafe, useFaculty } from "./FacultyContext.jsx";

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
  const { activeModule } = useFaculty();
  const outlet = useOutlet();
  const ActivePage = modulePageMap[activeModule] || FacultyDashboardHome;

  return (
    <FacultyLayout>
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

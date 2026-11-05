import React from "react";
import FacultyMyAttendance from "@/modules/faculty/pages/FacultyMyAttendance.jsx";
import "@/modules/faculty/styles/FacultyMyAttendance.css";
import "./DriverAttendancePage.css";

export default function DriverAttendancePage() {
  return (
    <div className="dp-page-container dp-attendance-page-unified">
      <FacultyMyAttendance adminRouting={false} />
    </div>
  );
}

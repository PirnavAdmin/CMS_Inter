import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Clock } from "lucide-react";
import DashboardLayout from "../layout/ExamCellPageLayout.jsx";
import FacultyMyAttendance from "@/modules/faculty/pages/FacultyMyAttendance.jsx";
import ErrorBoundary from "@/shared/components/ErrorBoundary.jsx";
import "@/modules/admin/AdminAttendance/AttendancePage.css";
import "@/modules/admin/AdminAttendance/AttendanceTimingConfigPage.css";

export default function CheckInOut(props) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Normalize any staff-attendance tab param to my-attendance
  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab && currentTab !== "my-attendance") {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", "my-attendance");
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams]);

  return (
    <DashboardLayout
      title="My Attendance"
      subtitle="Track your daily biometric check-ins, campus shifts, and attendance history"
      breadcrumb={["Student Operations", "Attendance", "My Attendance"]}
    >
      <main className="attendance-module">
        <div className="cms-room-tabs att-staff-tabs" role="tablist" aria-label="Staff Attendance Modules">
          <button
            type="button"
            role="tab"
            aria-selected={true}
            className="cms-room-tab att-staff-tab cms-room-tab-active att-staff-tab-active"
          >
            <Clock size={15} /> My Attendance
          </button>
        </div>

        <ErrorBoundary
          fallback={
            <div className="att-empty-state" style={{ padding: "48px 20px", textAlign: "center" }}>
              <p style={{ color: "var(--cms-muted, #64748b)" }}>
                Attendance records are currently unavailable for this account.
              </p>
            </div>
          }
        >
          <FacultyMyAttendance adminRouting />
        </ErrorBoundary>
      </main>
    </DashboardLayout>
  );
}

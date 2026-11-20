import React from "react";
import AdminAttendancePage from "@/modules/admin/AdminAttendance/AttendancePage.jsx";

export default function CheckInOut(props) {
  return <AdminAttendancePage area="staff" hideStaffTab {...props} />;
}

import { useEffect, useState } from "react";
import { AlertCircle, LogIn, LogOut } from "lucide-react";
import { getAuthUser } from "@/features/authStorage.js";
import StudentCard from "@/Dashboard/StudentDashboard/components/StudentCard.jsx";
import StudentDataTable from "@/Dashboard/StudentDashboard/components/StudentDataTable.jsx";
import StudentPageHeader from "@/Dashboard/StudentDashboard/components/StudentPageHeader.jsx";
import { AccountantPagination } from "./AccountantFeeManagement.jsx";
import { pageOf } from "../feeViewData.js";

export default function AccountantMyAttendance() {
  const user = getAuthUser() || {};
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setToday(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  // No authenticated self-service staff attendance endpoint exists in the current API.
  // Do not use the administrative staff register or student attendance as a substitute.
  const page = pageOf([], 1);
  const unavailable = "Self-service staff attendance is not available in the current API. Today's attendance and history require an authorized endpoint scoped to your staff identity. Check-in and check-out remain unavailable until staff self-service endpoints are provided.";
  return <>
    <StudentPageHeader title="My Attendance" subtitle={user.fullName || user.name || "Accountant"} />
    <div className="sp-api-state" role="status" id="accountant-attendance-dependency"><AlertCircle size={16} /> {unavailable}</div>
    <StudentCard title="Today's Attendance" subtitle={today.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}>
      <dl className="accountant-attendance-facts">{["Attendance Status", "Check-In", "Check-Out", "Working Hours"].map((label) => <div key={label}><dt>{label}</dt><dd>Not available</dd></div>)}</dl>
      <div className="accountant-attendance-actions" aria-describedby="accountant-attendance-dependency">
        <button type="button" className="sp-btn primary" disabled title="Staff self-service check-in API required"><LogIn size={15} /> Check In</button>
        <button type="button" className="sp-btn" disabled title="Staff self-service check-out API required"><LogOut size={15} /> Check Out</button>
      </div>
    </StudentCard>
    <StudentCard title="My Attendance Records">
      <StudentDataTable columns={["Date", "Check-In", "Check-Out", "Working Hours", "Attendance Status"]} rows={page.rows} empty="Attendance history is unavailable until an authorized personal staff attendance API is connected." />
      <AccountantPagination page={page} onPage={() => {}} />
    </StudentCard>
  </>;
}

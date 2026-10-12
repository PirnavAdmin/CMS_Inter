import { NavLink } from "react-router-dom";
import logo from "@/assets/pirnav-colleges-logo.png";
import dashboardIcon from "@/assets/sidebar-3d/dashboard.png";
import profileIcon from "@/assets/dashboard-3d/total-students.png";
import timetableIcon from "@/assets/sidebar-3d/timetable.png";
import attendanceIcon from "@/assets/dashboard-3d/mark-attendance.png";
import examinationIcon from "@/assets/dashboard-3d/create-exam.png";
import resultsIcon from "@/assets/sidebar-3d/results.png";
import feeIcon from "@/assets/sidebar-3d/fee-management.png";
import certificateIcon from "@/assets/sidebar-3d/certificates.png";
import holidayIcon from "@/assets/sidebar-3d/holiday-management.svg";
import transportIcon from "../assets/transport-3d.svg";
import hostelIcon from "../assets/hostel-3d.svg";

const groups = [
  ["STUDENT PORTAL", [["Dashboard", "", dashboardIcon]]],
  ["ACADEMICS", [
    ["My Profile", "profile", profileIcon],
    ["My Timetable", "timetable", timetableIcon],
    ["My Attendance", "attendance", attendanceIcon],
    ["Examinations", "examinations", examinationIcon],
    ["Results", "results", resultsIcon],
  ]],
  ["FINANCE", [["Fees", "fees", feeIcon]]],
  ["STUDENT SERVICES", [
    ["Transport", "transport", transportIcon],
    ["Hostel", "hostel", hostelIcon],
    ["Certificates", "certificates", certificateIcon],
  ]],
  ["INFORMATION", [
    ["Holidays", "holidays", holidayIcon],
  ]],
];

export default function StudentSidebar({ open, onClose }) {
  return (
    <aside className={`sp-sidebar ${open ? "is-open" : ""}`}>
      <div className="sp-brand">
        <img src={logo} alt="Pirnav Colleges" />
      </div>
      <nav>
        {groups.map(([heading, links]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            {links.map(([label, path, icon]) => (
              <NavLink
                key={label}
                end={!path}
                to={`/student-dashboard${path ? `/${path}` : ""}`}
                onClick={onClose}
                className={({ isActive }) => isActive ? "is-active" : ""}
              >
                <img className="sp-nav-3d-icon" src={icon} alt="" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </section>
        ))}
      </nav>
    </aside>
  );
}

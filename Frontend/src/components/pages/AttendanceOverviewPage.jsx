import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, ChevronDown, Download } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Loader } from "@/components/common/Ui.jsx";
import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import "./AttendancePage.css";

function Metric({ label, value }) {
  return <article className="att-overview-metric"><span>{label}</span><strong>{value}</strong></article>;
}

function AttendanceMetric({ percentage, present, total }) {
  return <article className="att-overview-metric att-overview-attendance-metric">
    <span className="att-overview-ring" style={{ "--attendance-progress": `${percentage}%` }}><b>{percentage}%</b></span>
    <div><span>Attendance %</span><strong>{percentage >= 90 ? '★ Excellent' : percentage >= 75 ? 'Good' : 'Needs Improvement'}</strong><small>{present} of {total} days</small></div>
  </article>;
}

function ExportMenu() {
  const [open, setOpen] = useState(false);
  return <div className="att-overview-export">
    <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setOpen((current) => !current)}>
      <Download size={16} /> Export <ChevronDown size={14} />
    </button>
    {open && <div role="menu"><button type="button">Export Excel</button><button type="button">Export PDF</button></div>}
  </div>;
}

export default function AttendanceOverviewPage() {
  const { area, staffId, studentId } = useParams();
  const staff = area === "staff" || Boolean(staffId);
  const id = staff ? staffId : studentId;
  const { selectedAcademicYearId, selectedAcademicYear } = useAcademicContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [overview, setOverview] = useState(null);
  const [month, setMonth] = useState("All Months");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const profilePromise = staff 
        ? apiClient.get(apiEndpoints.faculty.getById(id)) 
        : apiClient.get(apiEndpoints.students.getProfile(id));

      const profileRes = await profilePromise;
      const profileData = profileRes.data.data || profileRes.data;
      setProfile(profileData);

      const targetYearId = Number(selectedAcademicYearId) || Number(profileData?.academicYearId) || 0;

      const overviewRes = await (staff 
        ? apiClient.get(apiEndpoints.staffAttendance.yearlyOverview(id, targetYearId)) 
        : apiClient.get(apiEndpoints.attendance.yearlyOverview(id, targetYearId)));

      setOverview(overviewRes.data.data || overviewRes.data);
    } catch (err) {
      console.error("Failed to load overview data:", err);
      setError("Failed to load attendance overview data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [staff, id, selectedAcademicYearId]);

  const title = staff ? "Staff Attendance Overview" : "Student Attendance Overview";
  const backPath = staff ? "/dashboard/attendance/staff" : "/dashboard/attendance/student";
  const yearLabel = selectedAcademicYear?.name || selectedAcademicYear?.label || profile?.academicYearName || '';
  const subtitle = yearLabel ? `Academic Year: ${yearLabel}` : '';
  
  if (loading) {
    return <DashboardLayout title={title} subtitle={subtitle} breadcrumb={["Operations", "Attendance", title]}><main className="attendance-module"><Loader label="Loading overview..." /></main></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout title={title} subtitle={subtitle} breadcrumb={["Operations", "Attendance", title]}>
      <main className="attendance-module att-overview-page">
        <Link className="cms-back-link" to={backPath}>← Back to {staff ? "Staff" : "Student"} Attendance</Link>
        <section className="att-card" style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "var(--cms-danger, #ef4444)", marginBottom: "1rem" }}>{error}</p>
          <button type="button" className="cms-btn cms-btn-primary" onClick={loadData}>Retry</button>
        </section>
      </main>
    </DashboardLayout>;
  }

  const months = overview?.monthlyRecords || [];
  const visibleMonths = month === "All Months" ? months : months.filter(m => `${m.monthName} ${m.year}` === month);

  return <DashboardLayout title={title} subtitle={subtitle} breadcrumb={["Operations", "Attendance", title]}>
    <main className="attendance-module att-overview-page" data-overview-id={id}>
      <Link className="cms-back-link" to={backPath}>← Back to {staff ? "Staff" : "Student"} Attendance</Link>
      <section className="att-card att-overview-card">
        <header className="att-overview-head"><h3>{staff ? "Staff Information" : "Student Information"}</h3></header>
        {staff ? <div className="att-overview-info-grid">
          <div><span>Staff ID</span><strong>{profile?.employeeId || profile?.staffId || "N/A"}</strong></div><div><span>Staff Name</span><strong>{profile?.fullName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || profile?.staffName || "N/A"}</strong></div>
          <div><span>Department</span><strong>{profile?.departmentName || "N/A"}</strong></div><div><span>Designation</span><strong>{profile?.designation || profile?.designationName || "N/A"}</strong></div><div><span>Staff Type</span><strong>{profile?.staffType || profile?.staffTypeName || "N/A"}</strong></div>
        </div> : <><div className="att-overview-student"><span className="att-overview-photo">{(profile?.studentName || profile?.name || profile?.firstName || "S").charAt(0).toUpperCase()}</span><div><span>Student Name</span><strong>{profile?.studentName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || profile?.name || "N/A"}</strong></div><div><span>Roll No</span><strong>{profile?.rollNo || profile?.rollNumber || "N/A"}</strong></div><div><span>Admission No</span><strong>{profile?.admissionNo || profile?.admissionNumber || "N/A"}</strong></div></div>
          <div className="att-overview-info-grid"><div><span>Academic Level</span><strong>{profile?.academicLevelName || "N/A"}</strong></div><div><span>Group</span><strong>{profile?.groupName || "N/A"}</strong></div><div><span>Program</span><strong>{profile?.programName || "N/A"}</strong></div><div><span>Section</span><strong>{profile?.sectionName || "N/A"}</strong></div></div></>}
      </section>

      <section className="att-overview-section"><h3>{staff ? "Yearly Summary" : "Yearly Attendance Summary"}</h3><div className="att-overview-metrics">
        {staff ? <>
            <Metric label="Working Days" value={overview?.totalWorkingDays || 0} />
            <Metric label="Present" value={overview?.totalPresent || 0} />
            <Metric label="Absent" value={overview?.totalAbsent || 0} />
            <Metric label="Late" value={overview?.totalLate || 0} />
            <Metric label="Leave" value={overview?.totalLeave || 0} />
            <AttendanceMetric percentage={overview?.overallAttendancePercentage || 0} present={overview?.totalPresent || 0} total={overview?.totalWorkingDays || 0} />
        </> : <>
            <Metric label="Total Working Days" value={overview?.totalWorkingDays || 0} />
            <Metric label="Present" value={overview?.totalPresent || 0} />
            <Metric label="Absent" value={overview?.totalAbsent || 0} />
            <Metric label="Half-Day" value={overview?.totalHalfDays || 0} />
            <AttendanceMetric percentage={overview?.overallAttendancePercentage || 0} present={overview?.totalPresent || 0} total={overview?.totalWorkingDays || 0} />
        </>}
      </div></section>

      <section className="att-card att-overview-records-card">
        <header className="att-overview-record-head"><h3>Attendance Records</h3><ExportMenu /></header>
        <label className="att-overview-month-selector"><CalendarDays size={17} /><select value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Attendance month"><option>All Months</option>{months.map((m) => <option key={`${m.monthName}-${m.year}`}>{m.monthName} {m.year}</option>)}</select></label>
        <div className="att-scroll"><table className="cms-table"><thead><tr><th>Month</th><th>Working Days</th><th>Present</th><th>Absent</th><th>{staff ? "Leave" : "Half-Day"}</th><th>Attendance %</th></tr></thead><tbody>{visibleMonths.map((m) => <tr key={m.month}>
            <td>{m.monthName} {m.year}</td>
            <td>{m.workingDays}</td>
            <td>{m.present}</td>
            <td>{m.absent}</td>
            <td>{staff ? m.leave : m.halfDays}</td>
            <td>{m.attendancePercentage}%</td>
        </tr>)}</tbody></table></div>
      </section>
    </main>
  </DashboardLayout>;
}

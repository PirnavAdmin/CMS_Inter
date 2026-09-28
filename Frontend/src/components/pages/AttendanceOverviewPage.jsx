import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { CalendarCheck2, CalendarClock, CalendarDays, ChevronDown, Clock3, Coffee, Download, UserCheck, UserRound, UserX } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { SkeletonDashboard } from "@/components/common/Ui.jsx";
import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import "./AttendancePage.css";

function Metric({ label, value, icon: Icon }) {
  const tone = /present/i.test(label) ? "present" : /absent/i.test(label) ? "absent" : /half|leave/i.test(label) ? "leave" : /late/i.test(label) ? "late" : "working";
  return <article className={`att-overview-metric is-${tone}`}><span className="att-overview-metric-icon"><Icon size={22} /></span><div><span>{label}</span><strong>{value}</strong></div></article>;
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
  const location = useLocation();
  const staff = area === "staff" || Boolean(staffId);
  const id = staff ? staffId : studentId;
  const { selectedAcademicYearId, selectedAcademicYear } = useAcademicContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [overview, setOverview] = useState(null);
  const [month, setMonth] = useState("All Months");

  const loadData = useCallback(async () => {
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
  }, [id, selectedAcademicYearId, staff]);

  useEffect(() => {
    if (id) loadData();
  }, [id, loadData]);

  const title = staff ? "Staff Attendance Overview" : "Student Attendance Overview";
  const backPath = staff ? "/dashboard/attendance/staff" : "/dashboard/attendance/student";
  const backState = !staff && location.state?.attendanceState ? { attendanceState: location.state.attendanceState } : undefined;
  const yearLabel = selectedAcademicYear?.name || selectedAcademicYear?.label || profile?.academicYearName || '';
  const subtitle = yearLabel ? `Academic Year: ${yearLabel}` : '';
  
  if (loading) {
    return <DashboardLayout title={title} subtitle={subtitle} breadcrumb={["Operations", "Attendance", title]}><main className="attendance-module"><SkeletonDashboard cards={4} tableColumns={5} /></main></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout title={title} subtitle={subtitle} breadcrumb={["Operations", "Attendance", title]}>
      <main className="attendance-module att-overview-page">
        <Link className="cms-back-link" to={backPath} state={backState}>← Back to {staff ? "Staff" : "Student"} Attendance</Link>
        <section className="att-card" style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "var(--cms-danger, #ef4444)", marginBottom: "1rem" }}>{error}</p>
          <button type="button" className="cms-btn cms-btn-primary" onClick={loadData}>Retry</button>
        </section>
      </main>
    </DashboardLayout>;
  }

  const months = overview?.monthlyRecords || [];
  const visibleMonths = month === "All Months" ? months : months.filter(m => `${m.monthName} ${m.year}` === month);
  const profileName = staff
    ? profile?.fullName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || profile?.staffName || "N/A"
    : profile?.studentName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || profile?.name || "N/A";

  return <DashboardLayout title={title} subtitle={subtitle} breadcrumb={["Operations", "Attendance", title]}>
    <main className={`attendance-module att-overview-page ${staff ? "att-overview-page-staff" : "att-overview-page-student"}`} data-overview-id={id}>
      <Link className="cms-back-link" to={backPath} state={backState}>← Back to {staff ? "Staff" : "Student"} Attendance</Link>
      {staff ? <section className="att-card att-overview-card att-overview-staff-card">
        <div className="att-overview-staff-summary">
          <div className="att-overview-staff-identity"><span className="att-overview-photo">{profileName.charAt(0).toUpperCase()}</span><div><strong>{profileName}</strong><span>Staff</span></div></div>
          <div className="att-overview-staff-detail"><span>Staff ID</span><strong>{profile?.employeeId || profile?.staffId || "N/A"}</strong></div>
          <div className="att-overview-staff-detail"><span>Department</span><strong>{profile?.departmentName || "N/A"}</strong></div>
          <div className="att-overview-staff-role"><strong>{profile?.designation || profile?.designationName || "N/A"}</strong><span>{profile?.staffType || profile?.staffTypeName || "N/A"}</span></div>
        </div>
      </section> : <section className="att-card att-overview-card att-overview-student-card">
        <div className="att-overview-student-summary">
          <div className="att-overview-student-identity"><span className="att-overview-photo">{(profile?.studentName || profile?.name || profile?.firstName || "S").charAt(0).toUpperCase()}</span><div><strong>{profile?.studentName || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || profile?.name || "N/A"}</strong><span>Student</span></div></div>
          <div className="att-overview-student-detail"><span>Admission No</span><strong>{profile?.admissionNo || profile?.admissionNumber || "N/A"}</strong></div>
          <div className="att-overview-student-detail"><span>Roll No</span><strong>{profile?.rollNo || profile?.rollNumber || "N/A"}</strong></div>
          <div className="att-overview-student-academic"><strong>{profile?.academicLevelName || "N/A"}</strong><span>{profile?.groupName || "N/A"} <i>•</i> {profile?.programName || "N/A"} <i>•</i> {profile?.sectionName || "N/A"}</span></div>
        </div>
      </section>}

      <section className="att-overview-section"><h3>{staff ? "Yearly Summary" : "Yearly Attendance Summary"}</h3><div className="att-overview-metrics">
        {staff ? <>
            <Metric label="Working Days" value={overview?.totalWorkingDays || 0} icon={CalendarCheck2} />
            <Metric label="Present" value={overview?.totalPresent || 0} icon={UserCheck} />
            <Metric label="Absent" value={overview?.totalAbsent || 0} icon={UserX} />
            <Metric label="Late" value={overview?.totalLate || 0} icon={Clock3} />
            <Metric label="Leave" value={overview?.totalLeave || 0} icon={CalendarClock} />
            <AttendanceMetric percentage={overview?.overallAttendancePercentage || 0} present={overview?.totalPresent || 0} total={overview?.totalWorkingDays || 0} />
        </> : <>
            <Metric label="Total Working Days" value={overview?.totalWorkingDays || 0} icon={CalendarCheck2} />
            <Metric label="Present" value={overview?.totalPresent || 0} icon={UserRound} />
            <Metric label="Absent" value={overview?.totalAbsent || 0} icon={UserX} />
            <Metric label="Half-Day" value={overview?.totalHalfDays || 0} icon={Coffee} />
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

import React from "react";
import {
  Users,
  CalendarClock,
  ClipboardCheck,
  Briefcase,
  Clock,
  UserCheck,
  Plus,
  Wallet,
} from "lucide-react";
import { useFaculty } from "../FacultyContext.jsx";
import "../styles/FacultyDashboardHome.css";

export default function FacultyDashboardHome() {
  const { profileData, initials, punchState, setActiveModule } = useFaculty();

  return (
    <div>
      <div className="cms-page-head">
        <div>
          <h1>Staff Dashboard</h1>
          <p>
            Welcome back, <strong>{profileData.firstName} {profileData.lastName}</strong>! Here is your daily overview.
          </p>
        </div>
      </div>

      {/* Staff Biometric & Identity Status Widget */}
      <div className="sp-punch-card">
        <div className="sp-punch-meta">
          <div className="sp-punch-avatar">{initials}</div>
          <div>
            <div className="sp-punch-title">{profileData.fullName}</div>
            <div className="sp-punch-subtitle">
              ID: <strong style={{ color: "var(--cms-primary)" }}>{profileData.employeeId}</strong> · {profileData.designation} ({profileData.department})
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span className={`sp-punch-status-badge ${punchState.isPunchedIn ? "in" : "out"}`}>
                ● {punchState.isPunchedIn ? `Checked In (${punchState.inTime})` : "Checked Out"}
              </span>
              <span className="sp-punch-logged-text">
                Logged Today: <strong>{punchState.hoursWorked}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active / Next Lecture Alert Card */}
      <div className="sp-hero-lecture">
        <div>
          <span className="sp-hero-tag">NEXT UPCOMING LECTURE (10:00 AM – 11:00 AM)</span>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--cms-text)" }}>
            {profileData.department ? `${profileData.department} — Section A` : "Mathematics I-A — Section A (MPC 1st Year)"}
          </div>
          <div style={{ fontSize: 13, color: "var(--cms-muted)", marginTop: 3 }}>
            📍 Lecture Hall 203 · 45 Enrolled Students · {profileData.department ? `Department of ${profileData.department}` : "Syllabus: Unit 3 (Calculus & Functions)"}
          </div>
        </div>
        <button
          className="cms-btn cms-btn-primary"
          onClick={() => setActiveModule("attendance")}
        >
          <UserCheck size={16} /> Take Attendance for this Class
        </button>
      </div>

      {/* 4 Key Academic & Workload Metric Cards */}
      <div className="sp-stat-grid">
        <div className="cms-stat">
          <div className="cms-stat-icon tone-blue"><Users size={22} /></div>
          <div>
            <div className="cms-stat-label">Assigned Classes</div>
            <div className="cms-stat-value">3 Sections</div>
            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>MPC 1A, MPC 2B, MEC 1A</div>
          </div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-green"><CalendarClock size={22} /></div>
          <div>
            <div className="cms-stat-label">Today's Lectures</div>
            <div className="cms-stat-value">3 Scheduled</div>
            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>1 Completed · 2 Remaining</div>
          </div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-amber"><ClipboardCheck size={22} /></div>
          <div>
            <div className="cms-stat-label">Pending Marks Entries</div>
            <div className="cms-stat-value">1 Evaluation</div>
            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>Unit Test II (Draft)</div>
          </div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-violet"><Briefcase size={22} /></div>
          <div>
            <div className="cms-stat-label">Leave Balance</div>
            <div className="cms-stat-value">15 Days</div>
            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>8 CL · 7 SL Available</div>
          </div>
        </div>
      </div>

      {/* Quick Actions Hub */}
      <div style={{ marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Quick Actions Hub</h2>
        <div className="sp-quick-actions">
          <div className="sp-quick-btn" onClick={() => setActiveModule("myattendance")}>
            <div className="sp-quick-icon tone-green"><Clock size={20} /></div>
            <div>
              <strong style={{ display: "block", fontSize: 13 }}>My Attendance</strong>
              <span style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Biometric punch logs</span>
            </div>
          </div>
          <div className="sp-quick-btn" onClick={() => setActiveModule("attendance")}>
            <div className="sp-quick-icon tone-blue"><UserCheck size={20} /></div>
            <div>
              <strong style={{ display: "block", fontSize: 13 }}>Student Attendance</strong>
              <span style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Mark class attendance</span>
            </div>
          </div>
          <div className="sp-quick-btn" onClick={() => setActiveModule("marks")}>
            <div className="sp-quick-icon tone-amber"><ClipboardCheck size={20} /></div>
            <div>
              <strong style={{ display: "block", fontSize: 13 }}>Enter Marks</strong>
              <span style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Exam evaluations</span>
            </div>
          </div>
          <div className="sp-quick-btn" onClick={() => setActiveModule("leave")}>
            <div className="sp-quick-icon tone-violet"><Plus size={20} /></div>
            <div>
              <strong style={{ display: "block", fontSize: 13 }}>Apply Leave</strong>
              <span style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Submit CL/SL request</span>
            </div>
          </div>
          <div className="sp-quick-btn" onClick={() => setActiveModule("salary")}>
            <div className="sp-quick-icon tone-green"><Wallet size={20} /></div>
            <div>
              <strong style={{ display: "block", fontSize: 13 }}>View Payslip</strong>
              <span style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Download January 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Punch & Staff Attendance Record */}
      <div className="cms-card">
        <div className="cms-card-head">
          <div>
            <h2>My Monthly Attendance Summary (May 2025)</h2>
            <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 2 }}>
              Biometric punch logs & overall staff attendance rate
            </div>
          </div>
          <span className="cms-badge cms-badge-active">95.4% Punctuality</span>
        </div>
        <div className="cms-card-body">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Working Days</span>
              <div style={{ fontSize: 20, fontWeight: 800 }}>22</div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Present Days</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--cms-green)" }}>21</div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Leaves Taken</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--cms-amber)" }}>1</div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Holidays / Sundays</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--cms-muted)" }}>8</div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Shift Timings</span>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>09:00 AM – 04:30 PM</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

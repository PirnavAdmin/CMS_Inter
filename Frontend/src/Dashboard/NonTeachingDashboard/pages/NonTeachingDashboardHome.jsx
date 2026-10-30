import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  CalendarDays,
  ListTodo,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Megaphone,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { nonTeachingService } from "../services/nonTeachingService.js";
import { attendanceService } from "@/api/attendanceService.js";
import { announcementService } from "@/services/announcementService.js";

export default function NonTeachingDashboardHome() {
  const [profile, setProfile] = useState(() => nonTeachingService.getProfile());
  const [tasks, setTasks] = useState(() => nonTeachingService.getTasks());
  const [leaveBalances, setLeaveBalances] = useState(() => nonTeachingService.getLeaveBalances());
  const [leaveHistory, setLeaveHistory] = useState(() => nonTeachingService.getLeaveHistory());
  const [announcements, setAnnouncements] = useState(() => nonTeachingService.getAnnouncements());
  const [attendanceSummary, setAttendanceSummary] = useState(() => nonTeachingService.getAttendanceSummary());
  const [punchState, setPunchState] = useState({ status: "not_punched", inTime: null, outTime: null });
  const [liveClock, setLiveClock] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
  );
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    let active = true;
    attendanceService.getMyTodayStatus()
      .then((res) => {
        if (active && res?.Data) {
          setPunchState({
            status: res.Data.Status || res.Data.status || "not_punched",
            inTime: res.Data.InTime || res.Data.inTime || null,
            outTime: res.Data.OutTime || res.Data.outTime || null,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsub = announcementService.subscribeAnnouncements(() => {
      setAnnouncements(nonTeachingService.getAnnouncements());
    });
    return unsub;
  }, []);

  useEffect(() => {
    let active = true;
    nonTeachingService.fetchProfile().then((p) => {
      if (active && p) setProfile(p);
    }).catch(() => {});

    nonTeachingService.fetchTasks().then((t) => {
      if (active && Array.isArray(t)) setTasks(t);
    }).catch(() => {});

    if (typeof nonTeachingService.fetchLeaveData === "function") {
      nonTeachingService.fetchLeaveData().then((ld) => {
        if (active && ld) {
          if (ld.balances) setLeaveBalances(ld.balances);
          if (ld.history) setLeaveHistory(ld.history);
        }
      }).catch(() => {});
    }

    if (typeof nonTeachingService.fetchAttendanceSummary === "function") {
      nonTeachingService.fetchAttendanceSummary().then((s) => {
        if (active && s) setAttendanceSummary(s);
      }).catch(() => {});
    }

    return () => {
      active = false;
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const p = await nonTeachingService.fetchProfile();
      if (p) setProfile(p);
      const t = await nonTeachingService.fetchTasks();
      if (Array.isArray(t)) setTasks(t);
      if (typeof nonTeachingService.fetchLeaveData === "function") {
        const ld = await nonTeachingService.fetchLeaveData();
        if (ld) {
          if (ld.balances) setLeaveBalances(ld.balances);
          if (ld.history) setLeaveHistory(ld.history);
        }
      }
      if (typeof nonTeachingService.fetchAttendanceSummary === "function") {
        const s = await nonTeachingService.fetchAttendanceSummary();
        if (s) setAttendanceSummary(s);
      }
    } catch {}
    setRefreshing(false);
    showToast("Dashboard synchronized with server.");
  };

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePunch = async (action) => {
    try {
      if (action === "in") {
        const res = await attendanceService.punchIn({ deviceId: "Web Portal", remarks: "Non-Teaching Web Punch In" });
        if (res?.Data) {
          setPunchState({ status: "punched_in", inTime: res.Data.InTime, outTime: null });
          showToast(`Punched In successfully at ${res.Data.InTime}`);
          return;
        }
      } else {
        const res = await attendanceService.punchOut({ deviceId: "Web Portal", remarks: "Non-Teaching Web Punch Out" });
        if (res?.Data) {
          setPunchState((prev) => ({ ...prev, status: "punched_out", outTime: res.Data.OutTime }));
          showToast(`Punched Out successfully at ${res.Data.OutTime}`);
          return;
        }
      }
    } catch {}
    const res = nonTeachingService.recordPunch(action);
    if (action === "in") {
      setPunchState({ status: "punched_in", inTime: res.timeStr, outTime: null });
      showToast(`Punched In successfully at ${res.timeStr}`);
    } else {
      setPunchState((prev) => ({ ...prev, status: "punched_out", outTime: res.timeStr }));
      showToast(`Punched Out successfully at ${res.timeStr}`);
    }
  };

  const handleToggleTaskStatus = (taskId, currentStatus) => {
    const nextStatus = currentStatus === "Completed" ? "In Progress" : currentStatus === "Pending" ? "In Progress" : "Completed";
    const updated = nonTeachingService.updateTaskStatus(taskId, nextStatus);
    setTasks(updated);
    showToast(`Task marked as ${nextStatus}`);
  };

  // Time-aware greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Formatted date string
  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const pendingLeavesCount = leaveHistory.filter((l) => l.status === "Pending").length;
  const activeTasksCount = tasks.filter((t) => t.status !== "Completed").length;
  const completedTasksCount = tasks.filter((t) => t.status === "Completed").length;
  const pendingTasksCount = tasks.filter((t) => t.status === "Pending").length;
  const totalLeaveDaysRemaining = leaveBalances.reduce((sum, b) => sum + Number(b.remaining || b.available || b.total || 0), 0);

  return (
    <>
      {toastMessage && (
        <div className="cms-toast-banner cms-toast-success" role="alert" style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}>
          <CheckCircle2 size={16} /> {toastMessage}
        </div>
      )}

      {/* Welcome Header Bar */}
      <section className="nts-header-bar">
        <div>
          <h2 className="nts-greeting-title">
            <Sparkles size={20} style={{ color: "var(--nts-primary)" }} />
            {greeting}, {(profile.displayName || profile.name || "Non-Teaching Staff").replace(/\bDemo\s*/gi, "").trim()}
          </h2>
          <div className="nts-greeting-sub">
            <span className="nts-badge-pill active">
              <UserCheck size={12} /> ID: {profile.employeeId}
            </span>
            <span>•</span>
            <span>{profile.departmentName || profile.department}</span>
            <span>•</span>
            <span style={{ fontWeight: 600 }}>{profile.designationName || profile.designation}</span>
            <span>•</span>
            <span>{profile.campusName}</span>
          </div>
        </div>

        <div className="nts-header-controls">
          <div className="nts-date-badge">
            <Calendar size={14} style={{ color: "var(--nts-primary)" }} />
            <span>{todayFormatted}</span>
          </div>
          <button
            type="button"
            className="nts-refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh dashboard metrics"
          >
            <RefreshCw size={13} className={refreshing ? "dashboard-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      {/* KPI Cards (Matches Admin Dashboard Standards) */}
      <section className="nts-kpi-grid">
        {/* 1. My Attendance */}
        <div className="nts-kpi nts-kpi-green">
          <div className="nts-kpi-top">
            <div className="nts-kpi-icon">
              <UserCheck size={18} />
            </div>
            <div className="nts-kpi-meta">
              <span className="nts-kpi-label">My Attendance</span>
              <span className="nts-kpi-val">{attendanceSummary.attendanceRate}%</span>
            </div>
          </div>
          <span className="nts-kpi-sub">{attendanceSummary.presentDays} Days Present (Oct)</span>
        </div>

        {/* 2. Leave Balance */}
        <div className="nts-kpi nts-kpi-blue">
          <div className="nts-kpi-top">
            <div className="nts-kpi-icon">
              <CalendarDays size={18} />
            </div>
            <div className="nts-kpi-meta">
              <span className="nts-kpi-label">Leave Balance</span>
              <span className="nts-kpi-val">{totalLeaveDaysRemaining} Days</span>
            </div>
          </div>
          <span className="nts-kpi-sub">
            {leaveBalances.length > 0
              ? leaveBalances.map((b) => `${b.code || b.categoryCode || (b.type || b.categoryName || "LV").slice(0, 2)}: ${b.remaining ?? b.available ?? b.total ?? 0}`).join(" • ")
              : "No active leave quotas"}
          </span>
        </div>

        {/* 3. Pending Leave Requests */}
        <div className="nts-kpi nts-kpi-orange">
          <div className="nts-kpi-top">
            <div className="nts-kpi-icon">
              <Clock size={18} />
            </div>
            <div className="nts-kpi-meta">
              <span className="nts-kpi-label">Pending Leaves</span>
              <span className="nts-kpi-val">{pendingLeavesCount} Request</span>
            </div>
          </div>
          <span className="nts-kpi-sub">Awaiting AO approval</span>
        </div>

        {/* 4. Assigned Tasks */}
        <div className="nts-kpi nts-kpi-purple">
          <div className="nts-kpi-top">
            <div className="nts-kpi-icon">
              <ListTodo size={18} />
            </div>
            <div className="nts-kpi-meta">
              <span className="nts-kpi-label">Assigned Tasks</span>
              <span className="nts-kpi-val">{activeTasksCount} Active</span>
            </div>
          </div>
          <span className="nts-kpi-sub">Across Office Duties</span>
        </div>

        {/* 5. Completed Tasks */}
        <div className="nts-kpi nts-kpi-cyan">
          <div className="nts-kpi-top">
            <div className="nts-kpi-icon">
              <CheckCircle2 size={18} />
            </div>
            <div className="nts-kpi-meta">
              <span className="nts-kpi-label">Completed Tasks</span>
              <span className="nts-kpi-val">{completedTasksCount} Done</span>
            </div>
          </div>
          <span className="nts-kpi-sub">This month</span>
        </div>

        {/* 6. Pending Tasks */}
        <div className="nts-kpi nts-kpi-amber">
          <div className="nts-kpi-top">
            <div className="nts-kpi-icon">
              <AlertCircle size={18} />
            </div>
            <div className="nts-kpi-meta">
              <span className="nts-kpi-label">Pending Tasks</span>
              <span className="nts-kpi-val">{pendingTasksCount} Pending</span>
            </div>
          </div>
          <span className="nts-kpi-sub">Immediate action needed</span>
        </div>
      </section>



      {/* Two-Column Overview Content */}
      <div className="nts-two-col">
        {/* Left Column: Today's Punch & Active Tasks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Biometric Punch / Attendance Status */}
          <div className="nts-card">
            <div className="nts-card-head">
              <h3>
                <Clock size={16} style={{ color: "var(--nts-primary)" }} /> Today's Shift & Biometric Attendance
              </h3>
              <Link to="/non-teaching-dashboard/attendance" className="nts-card-action">
                Full Log <ArrowRight size={13} />
              </Link>
            </div>
            <div className="nts-card-body">
              <div className="nts-punch-card">
                <div>
                  <div className="nts-clock-time">{liveClock}</div>
                  <div className="nts-clock-sub">
                    <span className="nts-status-badge present">
                      <CheckCircle2 size={12} /> {punchState.status === "punched_in" ? `Punched In at ${punchState.inTime}` : punchState.status === "punched_out" ? `Punched Out at ${punchState.outTime}` : "Not Punched"}
                    </span>
                    <span>Shift: {profile.shift}</span>
                  </div>
                </div>

                <div className="nts-punch-actions">
                  {punchState.status !== "punched_in" ? (
                    <button
                      type="button"
                      className="nts-punch-btn in"
                      onClick={() => handlePunch("in")}
                      disabled={punchState.status === "punched_out"}
                    >
                      <UserCheck size={15} /> Punch In
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="nts-punch-btn out"
                      onClick={() => handlePunch("out")}
                    >
                      <Clock size={15} /> Punch Out
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Tasks Overview */}
          <div className="nts-card">
            <div className="nts-card-head">
              <h3>
                <ListTodo size={16} style={{ color: "#7c3aed" }} /> Priority Work Orders & Assigned Tasks
              </h3>
              <Link to="/non-teaching-dashboard/tasks" className="nts-card-action">
                View All ({tasks.length}) <ArrowRight size={13} />
              </Link>
            </div>
            <div className="nts-card-body" style={{ gap: 8 }}>
              {tasks.length > 0 ? (
                tasks.slice(0, 4).map((task) => (
                  <div key={task.id} className={`nts-task-item ${task.status === "Completed" ? "completed" : ""}`}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nts-task-title">{task.title}</div>
                      <div className="nts-task-desc">{task.description}</div>
                      <div className="nts-task-meta">
                        <span className={`nts-pill-priority ${task.priority.toLowerCase()}`}>
                          {task.priority}
                        </span>
                        <span>Category: <strong>{task.category}</strong></span>
                        <span>Due: <strong>{task.dueDate}</strong></span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`nts-status-badge ${task.status === "Completed" ? "completed" : task.status === "In Progress" ? "in-progress" : "pending"}`}
                      style={{ cursor: "pointer", border: "none" }}
                      onClick={() => handleToggleTaskStatus(task.id, task.status)}
                      title="Click to advance status"
                    >
                      {task.status === "Completed" ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      {task.status}
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "24px 12px", color: "var(--nts-muted)", fontSize: 12.5 }}>
                  <ListTodo size={24} style={{ margin: "0 auto 6px", opacity: 0.4, display: "block" }} />
                  No assigned tasks found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Leave Overview & Announcements */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Leave Balances Card */}
          <div className="nts-card">
            <div className="nts-card-head">
              <h3>
                <CalendarDays size={16} style={{ color: "#2563eb" }} /> Leave Balances & Status
              </h3>
              <Link to="/non-teaching-dashboard/leave" className="nts-card-action">
                Manage Leaves <ArrowRight size={13} />
              </Link>
            </div>
            <div className="nts-card-body" style={{ gap: 12 }}>
              {leaveBalances.length > 0 ? (
                leaveBalances.map((leave, idx) => {
                  const avail = Number(leave.remaining ?? leave.available ?? leave.total ?? 0);
                  const tot = Number(leave.total || 12);
                  const percent = tot > 0 ? Math.min(100, Math.round((avail / tot) * 100)) : 0;
                  const tones = ["#2563eb", "#16a34a", "#7c3aed", "#d97706"];
                  const barColor = leave.tone === "blue" ? "#2563eb" : leave.tone === "green" ? "#16a34a" : leave.tone === "purple" ? "#7c3aed" : leave.tone === "amber" ? "#d97706" : tones[idx % tones.length];
                  const label = leave.type || leave.categoryName || leave.title || leave.code || "Leave";
                  return (
                    <div key={leave.code || leave.categoryCode || idx} className="nts-progress-wrap">
                      <div className="nts-progress-labels">
                        <span>{label}</span>
                        <span>{avail} / {tot} Days Left</span>
                      </div>
                      <div className="nts-progress-track">
                        <div className="nts-progress-fill" style={{ width: `${percent}%`, backgroundColor: barColor }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: "center", padding: "18px 12px", color: "var(--nts-muted)", fontSize: 12.5 }}>
                  No leave quotas or balances recorded.
                </div>
              )}

              {leaveHistory.length > 0 ? (
                <div style={{ marginTop: 4, padding: "8px 12px", background: "var(--nts-subtle)", borderRadius: 8, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Latest Request: <strong>{leaveHistory[0]?.type}</strong></span>
                  <span className={`nts-status-badge ${leaveHistory[0]?.status.toLowerCase()}`}>
                    {leaveHistory[0]?.status}
                  </span>
                </div>
              ) : (
                <div style={{ marginTop: 4, padding: "8px 12px", background: "var(--nts-subtle)", borderRadius: 8, fontSize: 12, color: "var(--nts-muted)", textAlign: "center" }}>
                  No leave requests submitted.
                </div>
              )}
            </div>
          </div>

          {/* Department Announcements */}
          {announcements.length > 0 && (
            <div className="nts-card">
              <div className="nts-card-head">
                <h3>
                  <Megaphone size={16} style={{ color: "#ea580c" }} /> Announcements & Notices
                </h3>
                <Link to="/non-teaching-dashboard/announcements" className="nts-card-action">
                  All Notices <ArrowRight size={13} />
                </Link>
              </div>
              <div className="nts-card-body" style={{ gap: 10 }}>
                {announcements.slice(0, 3).map((notice) => (
                  <div key={notice.id} style={{ padding: "8px 10px", border: "1px solid var(--nts-border)", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--nts-primary)" }}>{notice.category}</span>
                      <span style={{ fontSize: 10.5, color: "var(--nts-muted)" }}>{notice.date}</span>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 750, color: "var(--nts-text)", marginBottom: 4 }}>
                      {notice.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--nts-muted)", lineHeight: 1.35 }}>
                      {notice.content ? (notice.content.length > 110 ? `${notice.content.slice(0, 110)}...` : notice.content) : "No description provided."}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

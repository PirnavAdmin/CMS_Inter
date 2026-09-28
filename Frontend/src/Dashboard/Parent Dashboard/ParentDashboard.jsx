import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  CalendarCheck,
  Award,
  Wallet,
  Calendar,
  Megaphone,
  Bell,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Clock,
  MapPin,
  Eye,
  CreditCard,
  Plus,
  Printer,
  Phone,
  Mail,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import {
  useParentPortal,
  subjectAttendanceData,
  academicSubjectsData,
  upcomingExamsData,
  getStoredFeeRecords,
  saveStoredFeeRecords,
  collegeAnnouncements,
  getStoredNotifications,
  saveStoredNotifications,
} from "./parentData.js";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import "./ParentDashboard.css";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const {
    parentUser,
    availableChildren,
    activeChildId,
    setActiveChildId,
    child,
    dataKey,
    currentAcademicYear,
  } = useParentPortal();

  const [feeRecords, setFeeRecords] = useState(getStoredFeeRecords());
  const [notifs, setNotifs] = useState(getStoredNotifications());

  // Interactive Modals State
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [selectedExamModal, setSelectedExamModal] = useState(null);
  const [selectedReceiptModal, setSelectedReceiptModal] = useState(null);
  const [selectedNotifModal, setSelectedNotifModal] = useState(null);
  const [selectedAnnouncementModal, setSelectedAnnouncementModal] = useState(null);
  const [hallTicketOpen, setHallTicketOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);

  // Form State for Quick Pay
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("UPI");
  const [payBusy, setPayBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const isCurrentYear = currentAcademicYear === "2026-2027";

  const rawChildFee = child
    ? feeRecords[dataKey] || (isCurrentYear ? (feeRecords[child.id] || child.fees) : null) || { total: 0, paid: 0, pending: 0, breakdown: [], receipts: [] }
    : { total: 0, paid: 0, pending: 0, breakdown: [], receipts: [] };

  const breakdownTotal = (rawChildFee.breakdown || []).reduce((acc, b) => acc + (b.amount || 0), 0);
  const breakdownPaid = (rawChildFee.breakdown || []).reduce((acc, b) => acc + (b.paid || 0), 0);
  const breakdownPending = (rawChildFee.breakdown || []).reduce((acc, b) => acc + (b.pending || 0), 0);

  const childFee = {
    ...rawChildFee,
    total: breakdownTotal > 0 ? breakdownTotal : rawChildFee.total,
    paid: breakdownTotal > 0 ? breakdownPaid : rawChildFee.paid,
    pending: breakdownTotal > 0 ? breakdownPending : rawChildFee.pending,
    status: breakdownTotal > 0 ? (breakdownPending === 0 ? "Paid" : breakdownPaid > 0 ? "Partial" : "Due") : rawChildFee.status,
  };
  const subjects = child ? subjectAttendanceData[dataKey] || (isCurrentYear ? (subjectAttendanceData[child.id] || []) : []) : [];
  const academics = child ? academicSubjectsData[dataKey] || (isCurrentYear ? (academicSubjectsData[child.id] || []) : []) : [];
  const exams = child ? upcomingExamsData[dataKey] || (isCurrentYear ? (upcomingExamsData[child.id] || []) : []) : [];
  const nextExam = exams[0] || null;

  const childNotifs = useMemo(() => {
    if (!child) return [];
    return notifs.filter((n) => {
      if (!n.studentId) return true;
      const baseId = n.studentId.replace(/-\d{4}$/, "");
      return baseId === child.id;
    });
  }, [notifs, child?.id]);

  const unreadNotifsCount = childNotifs.filter((n) => !n.read).length;

  const handleSelectChild = (id) => {
    setActiveChildId(id);
  };

  // Quick Payment Simulator
  const handleExecutePayment = (e) => {
    e.preventDefault();
    const amount = Number(payAmount);
    if (!amount || amount <= 0 || amount > childFee.pending) {
      alert("Please enter a valid amount up to the pending fee balance.");
      return;
    }

    setPayBusy(true);
    setTimeout(() => {
      let remaining = amount;
      const updatedBreakdown = (childFee.breakdown || []).map((item) => {
        if (remaining <= 0 || (item.pending || 0) <= 0) return item;
        const alloc = Math.min(item.pending, remaining);
        remaining -= alloc;
        const newPaid = item.paid + alloc;
        const newPending = item.pending - alloc;
        return {
          ...item,
          paid: newPaid,
          pending: newPending,
          status: newPending === 0 ? "Paid" : "Partial",
        };
      });

      const newPaid = updatedBreakdown.length > 0
        ? updatedBreakdown.reduce((sum, b) => sum + b.paid, 0)
        : childFee.paid + amount;
      const newPending = updatedBreakdown.length > 0
        ? updatedBreakdown.reduce((sum, b) => sum + b.pending, 0)
        : Math.max(0, childFee.pending - amount);
      const newStatus = newPending === 0 ? "Paid" : newPaid > 0 ? "Partial" : "Due";

      const newReceipt = {
        id: `rec-${Date.now()}`,
        receiptNo: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        amount,
        method: payMethod,
        txnId: `TXN${Date.now()}`,
        paidFor: `Term Fee Installment (${child?.programme || ""})`,
        status: "Success",
      };

      const updated = {
        ...feeRecords,
        [dataKey || child?.id]: {
          ...childFee,
          total: childFee.total,
          paid: newPaid,
          pending: newPending,
          status: newStatus,
          breakdown: updatedBreakdown,
          receipts: [newReceipt, ...(childFee.receipts || [])],
        },
      };

      setFeeRecords(updated);
      saveStoredFeeRecords(updated);
      setPayBusy(false);
      setPayModalOpen(false);
      setToastMessage(`Payment of ₹${amount.toLocaleString()} received! Receipt #${newReceipt.receiptNo} generated.`);
    }, 900);
  };

  const handleOpenNotification = (notif) => {
    const updated = notifs.map((n) => (n.id === notif.id ? { ...n, read: true } : n));
    setNotifs(updated);
    saveStoredNotifications(updated);
    setSelectedNotifModal(notif);
  };

  if (!child || availableChildren.length === 0) {
    return (
      <DashboardLayout
        title="Parent Dashboard"
        subtitle="Enrolled children overview"
        breadcrumb={["Parent Portal", "Dashboard"]}
      >
        <div className="parent-dashboard-wrapper" style={{ padding: "40px 20px", textAlign: "center" }}>
          <div className="parent-card" style={{ padding: "30px", maxWidth: 500, margin: "0 auto" }}>
            <Users size={48} style={{ color: "var(--cms-muted)", margin: "0 auto 16px" }} />
            <h3>No Children Associated</h3>
            <p style={{ color: "var(--cms-muted)", fontSize: 14 }}>
              No enrolled student records were found linked to your parent account ({parentUser?.email || parentUser?.name}).
              Please contact the college administration.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Parent Dashboard"
      subtitle={`Welcome to the Pirnav Parent Portal • Viewing ${child.name} (${child.group} - ${child.section})`}
      breadcrumb={["Parent Portal", "Dashboard"]}
    >
      <div className="parent-dashboard-wrapper">
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />

        {/* Child Selector Banner */}
        <div className="parent-child-banner">
          <div className="parent-child-meta">
            <img src={child.avatar} alt={child.name} className="parent-child-avatar" />
            <div className="parent-child-title">
              <h2>
                {child.name}
                <span className="cms-badge cms-badge-active" style={{ fontSize: 11 }}>Active</span>
              </h2>
              <p>
                {child.programme} • Roll: {child.roll} • Adm: {child.admissionNo} • Class Teacher: {child.mentor}
              </p>
            </div>
          </div>
          <div className="parent-child-switch-buttons">
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--cms-muted)", marginRight: 4 }}>Switch Child:</span>
            {availableChildren.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`parent-child-switch-btn ${child.id === c.id ? "is-active" : ""}`}
                onClick={() => handleSelectChild(c.id)}
              >
                <Users size={14} /> {c.name} ({c.group})
              </button>
            ))}
          </div>
        </div>

        {/* 1. Dashboard Summary Cards */}
        <div className="parent-stat-grid">
          {/* Children Summary */}
          <div className="parent-stat-card" onClick={() => navigate("/parent-dashboard/children")}>
            <div className="parent-stat-icon-wrap">
              <Users size={22} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">My Children</div>
              <div className="parent-stat-value">{availableChildren.length} Enrolled</div>
              <div className="parent-stat-subtext">Active: <strong>{child.name}</strong></div>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="parent-stat-card" onClick={() => navigate("/parent-dashboard/attendance")}>
            <div className="parent-stat-icon-wrap green">
              <CalendarCheck size={22} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Attendance</div>
              <div className="parent-stat-value" style={{ color: "var(--cms-green)" }}>{child.attendance.overall}%</div>
              <div className="parent-stat-subtext">Status: <strong>{child.attendance.status}</strong></div>
            </div>
          </div>

          {/* Academic Performance */}
          <div className="parent-stat-card" onClick={() => navigate("/parent-dashboard/academics")}>
            <div className="parent-stat-icon-wrap">
              <Award size={22} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Academic SGPA</div>
              <div className="parent-stat-value" style={{ color: "var(--cms-primary-dark)" }}>{child.academics.sgpa}</div>
              <div className="parent-stat-subtext">Grade: <strong>{child.academics.grade}</strong> • {child.academics.rank}</div>
            </div>
          </div>

          {/* Fees Summary */}
          <div
            className="parent-stat-card"
            onClick={() => navigate("/parent-dashboard/fees")}
          >
            <div className="parent-stat-icon-wrap" style={{ background: childFee.pending > 0 ? "var(--cms-red-soft)" : "var(--cms-green-soft)", color: childFee.pending > 0 ? "var(--cms-red)" : "var(--cms-green)" }}>
              <Wallet size={22} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Pending Fees</div>
              <div className="parent-stat-value" style={{ color: childFee.pending > 0 ? "var(--cms-red)" : "var(--cms-green)" }}>
                ₹{childFee.pending.toLocaleString()}
              </div>
              <div className="parent-stat-subtext">{childFee.pending > 0 ? `Due: ${childFee.dueDate}` : "All Dues Cleared"}</div>
            </div>
          </div>

          {/* Upcoming Exams */}
          <div className="parent-stat-card" onClick={() => navigate("/parent-dashboard/examinations")}>
            <div className="parent-stat-icon-wrap amber">
              <Calendar size={22} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Upcoming Exams</div>
              <div className="parent-stat-value" style={{ fontSize: 18 }}>{nextExam ? nextExam.date : "Dec 2026"}</div>
              <div className="parent-stat-subtext">{nextExam ? nextExam.subject : "Half-Yearly"}</div>
            </div>
          </div>
        </div>



        {/* Main Two-Column Grid */}
        <div className="parent-dashboard-grid">
          {/* Left Column (Student Overview, Attendance, Academics) */}
          <div className="parent-section-column">
            {/* 2. Student Overview Card */}
            <div className="parent-card">
              <div className="parent-card-header">
                <h3 className="parent-card-title">
                  <Users size={18} /> Student Overview
                </h3>
                <button type="button" className="cms-btn cms-btn-sm cms-btn-outline" onClick={() => setStudentModalOpen(true)}>
                  <Eye size={13} /> Full Profile
                </button>
              </div>
              <div className="parent-card-body">
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 18 }}>
                  <img src={child.avatar} alt={child.name} className="parent-child-avatar" style={{ width: 62, height: 62 }} />
                  <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: 18, color: "var(--cms-text)" }}>{child.name}</h3>
                    <div style={{ fontSize: 13, color: "var(--cms-muted)" }}>{child.programme} • {child.level}</div>
                    <div style={{ fontSize: 12.5, color: "var(--cms-muted)", marginTop: 2 }}>
                      Class Teacher: <strong>{child.mentor}</strong> ({child.mentorMobile})
                    </div>
                  </div>
                </div>

                <div className="parent-profile-meta-grid">
                  <div className="parent-meta-item">
                    <span className="parent-meta-label">Admission Number</span>
                    <span className="parent-meta-val">{child.admissionNo}</span>
                  </div>
                  <div className="parent-meta-item">
                    <span className="parent-meta-label">Roll Number</span>
                    <span className="parent-meta-val">{child.roll}</span>
                  </div>
                  <div className="parent-meta-item">
                    <span className="parent-meta-label">Department</span>
                    <span className="parent-meta-val">{child.department}</span>
                  </div>
                  <div className="parent-meta-item">
                    <span className="parent-meta-label">Semester / Term</span>
                    <span className="parent-meta-val">{child.semester}</span>
                  </div>
                  <div className="parent-meta-item">
                    <span className="parent-meta-label">Affiliation Board</span>
                    <span className="parent-meta-val">{child.board}</span>
                  </div>
                  <div className="parent-meta-item">
                    <span className="parent-meta-label">Academic Year</span>
                    <span className="parent-meta-val">{child.academicYear}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Attendance Overview Card */}
            <div className="parent-card">
              <div className="parent-card-header">
                <h3 className="parent-card-title">
                  <CalendarCheck size={18} /> Attendance Breakdown
                </h3>
                <Link to="/parent-dashboard/attendance" className="cms-btn cms-btn-sm cms-btn-outline" style={{ textDecoration: "none" }}>
                  Detailed Register <ChevronRight size={13} />
                </Link>
              </div>
              <div className="parent-card-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--cms-muted)" }}>Overall Attendance Rate</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "var(--cms-green)" }}>
                      {child.attendance.overall}%
                    </div>
                  </div>
                  <span className="cms-badge cms-badge-active" style={{ fontSize: 12 }}>
                    {child.attendance.status}
                  </span>
                </div>

                <div className="parent-progress-bar-wrap" style={{ height: 10, marginBottom: 16 }}>
                  <div
                    className="parent-progress-bar-fill green"
                    style={{ width: `${child.attendance.overall}%` }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {subjects.slice(0, 4).map((sub) => (
                    <div key={sub.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                      <div>
                        <strong>{sub.subject}</strong>
                        <span style={{ fontSize: 12, color: "var(--cms-muted)", marginLeft: 6 }}>({sub.present}/{sub.total} classes)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700 }}>{sub.percentage}%</span>
                        <span className={`cms-badge ${sub.percentage >= 90 ? "cms-badge-active" : "cms-badge-warn"}`} style={{ fontSize: 11 }}>
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Academics Overview Card */}
            <div className="parent-card">
              <div className="parent-card-header">
                <h3 className="parent-card-title">
                  <Award size={18} /> Academic Performance
                </h3>
                <Link to="/parent-dashboard/academics" className="cms-btn cms-btn-sm cms-btn-outline" style={{ textDecoration: "none" }}>
                  View Syllabus & Marks <ChevronRight size={13} />
                </Link>
              </div>
              <div className="parent-card-body">
                <div className="parent-profile-meta-grid">
                  <div className="parent-meta-item">
                    <span className="parent-meta-label">Current Term SGPA</span>
                    <span className="parent-meta-val" style={{ color: "var(--cms-primary-dark)", fontSize: 18 }}>{child.academics.sgpa} / 10.0</span>
                  </div>
                  <div className="parent-meta-item">
                    <span className="parent-meta-label">Cumulative CGPA</span>
                    <span className="parent-meta-val" style={{ fontSize: 18 }}>{child.academics.cgpa}</span>
                  </div>
                  <div className="parent-meta-item">
                    <span className="parent-meta-label">Overall Evaluation</span>
                    <span className="parent-meta-val">Grade {child.academics.grade}</span>
                  </div>
                  <div className="parent-meta-item">
                    <span className="parent-meta-label">Class Merit Rank</span>
                    <span className="parent-meta-val">{child.academics.rank}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 8. Fees & Payments Overview Card (Restored to Left Column) */}
            <div className="parent-card">
              <div className="parent-card-header">
                <h3 className="parent-card-title">
                  <Wallet size={18} /> Fee Account Status
                </h3>
                <Link to="/parent-dashboard/fees" className="cms-btn cms-btn-sm cms-btn-outline" style={{ textDecoration: "none" }}>
                  All Transactions <ChevronRight size={13} />
                </Link>
              </div>
              <div className="parent-card-body">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 16 }}>
                  <div style={{ padding: 12, background: "var(--cms-bg)", borderRadius: 8 }}>
                    <div style={{ fontSize: 11.5, color: "var(--cms-muted)", textTransform: "uppercase" }}>Total Fee</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>₹{childFee.total.toLocaleString()}</div>
                  </div>
                  <div style={{ padding: 12, background: "var(--cms-green-soft)", borderRadius: 8 }}>
                    <div style={{ fontSize: 11.5, color: "var(--cms-green)", textTransform: "uppercase" }}>Paid Amount</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--cms-green)" }}>₹{childFee.paid.toLocaleString()}</div>
                  </div>
                  <div style={{ padding: 12, background: childFee.pending > 0 ? "var(--cms-red-soft)" : "var(--cms-bg)", borderRadius: 8 }}>
                    <div style={{ fontSize: 11.5, color: childFee.pending > 0 ? "var(--cms-red)" : "var(--cms-muted)", textTransform: "uppercase" }}>Pending Due</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: childFee.pending > 0 ? "var(--cms-red)" : "inherit" }}>₹{childFee.pending.toLocaleString()}</div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>
                    Payment Status: <strong style={{ color: childFee.pending > 0 ? "var(--cms-red)" : "var(--cms-green)" }}>{childFee.status}</strong>
                    {childFee.pending > 0 && ` (Due: ${childFee.dueDate})`}
                  </span>
                  {childFee.pending > 0 ? (
                    <button
                      type="button"
                      className="cms-btn cms-btn-primary cms-btn-sm"
                      onClick={() => {
                        setPayAmount(String(childFee.pending));
                        setPayModalOpen(true);
                      }}
                    >
                      <CreditCard size={13} /> Pay Balance Online
                    </button>
                  ) : (
                    <span className="cms-badge cms-badge-active">No Pending Dues</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Examinations, Announcements, Notifications) */}
          <div className="parent-section-column">
            {/* 5. Announcements Card */}
            <div className="parent-card">
              <div className="parent-card-header">
                <h3 className="parent-card-title">
                  <Megaphone size={18} /> College Announcements
                </h3>
                <Link to="/parent-dashboard/announcements" className="cms-btn cms-btn-sm cms-btn-outline" style={{ textDecoration: "none" }}>
                  All Notices <ChevronRight size={13} />
                </Link>
              </div>
              <div className="parent-card-body">
                <div className="parent-list-stack">
                  {collegeAnnouncements.slice(0, 3).map((ann) => (
                    <div
                      key={ann.id}
                      style={{ padding: 12, borderRadius: 10, background: "var(--cms-bg)", border: "1px solid var(--cms-border)", cursor: "pointer" }}
                      onClick={() => setSelectedAnnouncementModal(ann)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span className="cms-badge cms-badge-active" style={{ fontSize: 11 }}>{ann.category}</span>
                        <span style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>{ann.date}</span>
                      </div>
                      <h4 style={{ margin: "0 0 4px 0", fontSize: 13.5, color: "var(--cms-text)" }}>{ann.title}</h4>
                      <p style={{
                        margin: 0,
                        fontSize: 12,
                        color: "var(--cms-muted)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        lineHeight: 1.4
                      }}>
                        {ann.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 6. Upcoming Examinations Card */}
            <div className="parent-card">
              <div className="parent-card-header">
                <h3 className="parent-card-title">
                  <Calendar size={18} /> Upcoming Examinations
                </h3>
                <Link to="/parent-dashboard/examinations" className="cms-btn cms-btn-sm cms-btn-outline" style={{ textDecoration: "none" }}>
                  Schedule <ChevronRight size={13} />
                </Link>
              </div>
              <div className="parent-card-body">
                <div className="parent-list-stack">
                  {exams.slice(0, 3).map((ex) => (
                    <div key={ex.id} className="parent-list-row">
                      <div className="parent-list-info" style={{ minWidth: 0 }}>
                        <h4 style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ex.subject} ({ex.code})</h4>
                        <p>{ex.date} • {ex.time}</p>
                        <span style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Room: {ex.hall} ({ex.seat})</span>
                      </div>
                      <button
                        type="button"
                        className="cms-btn cms-btn-sm cms-btn-outline"
                        style={{ flexShrink: 0 }}
                        onClick={() => setSelectedExamModal(ex)}
                      >
                        <Eye size={13} /> Details
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    style={{ width: "100%", justifyContent: "center", whiteSpace: "normal", fontSize: 13, padding: "9px 12px" }}
                    onClick={() => setHallTicketOpen(true)}
                  >
                    <Printer size={14} /> Download Admit Card / Hall Ticket
                  </button>
                </div>
              </div>
            </div>

            {/* 7. Notifications Card */}
            <div className="parent-card">
              <div className="parent-card-header">
                <h3 className="parent-card-title">
                  <Bell size={18} /> Recent Notifications
                </h3>
                <Link to="/parent-dashboard/notifications" className="cms-btn cms-btn-sm cms-btn-outline" style={{ textDecoration: "none" }}>
                  View All <ChevronRight size={13} />
                </Link>
              </div>
              <div className="parent-card-body">
                <div className="parent-list-stack">
                  {childNotifs.slice(0, 3).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleOpenNotification(n)}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        background: n.read ? "var(--cms-bg)" : "var(--cms-primary-soft)",
                        border: "1px solid var(--cms-border)",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <strong style={{ fontSize: 13 }}>{n.title}</strong>
                        <span style={{ fontSize: 11, color: "var(--cms-muted)" }}>{n.time}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--cms-text)" }}>{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Student Overview Modal */}
        {studentModalOpen && (
          <Modal
            title={`Student Information — ${child.name}`}
            onClose={() => setStudentModalOpen(false)}
            size="md"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={() => setStudentModalOpen(false)}>Close</button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={() => {
                    navigate(`/parent-dashboard/children/${child.id}`);
                    setStudentModalOpen(false);
                  }}
                >
                  Go to Full Profile
                </button>
              </>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center", paddingBottom: 14, borderBottom: "1px solid var(--cms-border)" }}>
                <img src={child.avatar} alt={child.name} className="parent-child-avatar" style={{ width: 64, height: 64 }} />
                <div>
                  <h3 style={{ margin: "0 0 2px 0", fontSize: 18 }}>{child.name}</h3>
                  <div style={{ fontSize: 13, color: "var(--cms-muted)" }}>{child.programme} • {child.section}</div>
                  <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 3 }}>
                    Admission: <strong>{child.admissionNo}</strong> | Roll: <strong>{child.roll}</strong>
                  </div>
                </div>
              </div>
              <div className="parent-profile-meta-grid">
                <div className="parent-meta-item"><span className="parent-meta-label">Date of Birth</span><span className="parent-meta-val">{child.dob}</span></div>
                <div className="parent-meta-item"><span className="parent-meta-label">Gender</span><span className="parent-meta-val">{child.gender}</span></div>
                <div className="parent-meta-item"><span className="parent-meta-label">Blood Group</span><span className="parent-meta-val">{child.bloodGroup}</span></div>
                <div className="parent-meta-item"><span className="parent-meta-label">Affiliation Board</span><span className="parent-meta-val">{child.board}</span></div>
                <div className="parent-meta-item"><span className="parent-meta-label">Attendance</span><span className="parent-meta-val" style={{ color: "var(--cms-green)" }}>{child.attendance.overall}% ({child.attendance.status})</span></div>
                <div className="parent-meta-item"><span className="parent-meta-label">Academic SGPA</span><span className="parent-meta-val">{child.academics.sgpa} ({child.academics.grade})</span></div>
                <div className="parent-meta-item"><span className="parent-meta-label">Fee Status</span><span className="parent-meta-val">{child.fees.status}</span></div>
                <div className="parent-meta-item"><span className="parent-meta-label">Class Mentor</span><span className="parent-meta-val">{child.mentor}</span></div>
              </div>
            </div>
          </Modal>
        )}

        {/* Exam Detail Modal */}
        {selectedExamModal && (
          <Modal
            title={`Examination Details — ${selectedExamModal.subject}`}
            onClose={() => setSelectedExamModal(null)}
            size="md"
            footer={
              <button type="button" className="cms-btn cms-btn-primary" onClick={() => setSelectedExamModal(null)}>
                Close
              </button>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: 14, background: "var(--cms-bg)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Paper Code & Subject:</span>
                  <strong>{selectedExamModal.subject} ({selectedExamModal.code})</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Date:</span>
                  <strong>{selectedExamModal.date}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Timings:</span>
                  <strong>{selectedExamModal.time}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Hall & Seat:</span>
                  <strong>{selectedExamModal.hall} (Seat {selectedExamModal.seat})</strong>
                </div>
              </div>
              <div>
                <strong>Syllabus Scope:</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: 13, background: "#f8fafc", padding: 10, borderRadius: 6, border: "1px solid var(--cms-border)" }}>
                  {selectedExamModal.syllabus}
                </p>
              </div>
            </div>
          </Modal>
        )}

        {/* View Receipt Modal */}
        {selectedReceiptModal && (
          <Modal
            title={`Fee Receipt — ${selectedReceiptModal.receiptNo}`}
            onClose={() => setSelectedReceiptModal(null)}
            size="lg"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={() => setSelectedReceiptModal(null)}>Close</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={() => window.print()}>
                  <Printer size={15} /> Print Official Receipt
                </button>
              </>
            }
          >
            <div className="parent-receipt-sheet">
              <div className="parent-receipt-header">
                <h2>PIRNAV JUNIOR COLLEGE</h2>
                <p>Campus Road, Jubilee Hills, Hyderabad - 500033</p>
                <strong style={{ display: "block", marginTop: 6, fontSize: 15 }}>STUDENT FEE RECEIPT</strong>
              </div>

              <div className="parent-profile-meta-grid" style={{ marginBottom: 16 }}>
                <div className="parent-meta-item"><span>Receipt No:</span> <strong>{selectedReceiptModal.receiptNo}</strong></div>
                <div className="parent-meta-item"><span>Date:</span> <strong>{selectedReceiptModal.date}</strong></div>
                <div className="parent-meta-item"><span>Student Name:</span> <strong>{child.name}</strong></div>
                <div className="parent-meta-item"><span>Admission No:</span> <strong>{child.admissionNo}</strong></div>
                <div className="parent-meta-item"><span>Course / Section:</span> <strong>{child.programme} - {child.section}</strong></div>
                <div className="parent-meta-item"><span>Payment Mode:</span> <strong>{selectedReceiptModal.method}</strong></div>
              </div>

              <table className="parent-receipt-table">
                <thead>
                  <tr>
                    <th>Narration</th>
                    <th>Txn Reference</th>
                    <th>Amount Paid</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{selectedReceiptModal.paidFor}</td>
                    <td>{selectedReceiptModal.txnId}</td>
                    <td style={{ fontWeight: 700, color: "var(--cms-green)" }}>₹{selectedReceiptModal.amount.toLocaleString()}</td>
                    <td>
                      <span className="cms-badge cms-badge-active">Success</span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 30, paddingTop: 16, borderTop: "1px solid #cbd5e1" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Computer-generated receipt, valid for Section 80C tax exemption.</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: 35 }}></div>
                  <div style={{ borderTop: "1px solid #334155", paddingTop: 4, fontSize: 12, fontWeight: 600 }}>Accounts Officer</div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Hall Ticket Modal */}
        {hallTicketOpen && (
          <Modal
            title="Official Examination Hall Ticket"
            onClose={() => setHallTicketOpen(false)}
            size="lg"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={() => setHallTicketOpen(false)}>Close</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={() => window.print()}>
                  <Printer size={15} /> Print Hall Ticket
                </button>
              </>
            }
          >
            <div className="parent-hall-ticket">
              <div className="parent-hall-ticket-head">
                <div>
                  <h2 style={{ margin: "0 0 2px 0", fontSize: 20, color: "var(--cms-primary-dark)" }}>PIRNAV JUNIOR COLLEGE</h2>
                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--cms-muted)" }}>Board of Intermediate Education</div>
                  <strong style={{ display: "block", marginTop: 4, fontSize: 15 }}>ADMIT CARD — HALF-YEARLY EXAMS 2026</strong>
                </div>
                <img src={child.avatar} alt={child.name} style={{ width: 70, height: 80, objectFit: "cover", border: "2px solid #000", borderRadius: 4 }} />
              </div>

              <div className="parent-hall-ticket-meta">
                <div><span>Student Name:</span> <strong style={{ display: "block" }}>{child.name}</strong></div>
                <div><span>Admission No:</span> <strong style={{ display: "block" }}>{child.admissionNo}</strong></div>
                <div><span>Hall Ticket No:</span> <strong style={{ display: "block" }}>HT2026{child.roll}</strong></div>
                <div><span>Course:</span> <strong style={{ display: "block" }}>{child.programme} ({child.section})</strong></div>
              </div>

              <table className="parent-receipt-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Subject</th>
                    <th>Hall / Room</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((ex) => (
                    <tr key={ex.id}>
                      <td>{ex.date}</td>
                      <td>{ex.time}</td>
                      <td><strong>{ex.subject}</strong> ({ex.code})</td>
                      <td>{ex.hall} ({ex.seat})</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30, paddingTop: 16, borderTop: "1px solid #cbd5e1" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: 30 }}></div>
                  <div style={{ borderTop: "1px solid #334155", paddingTop: 4, fontSize: 12, fontWeight: 600 }}>Parent Signature</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: 30 }}></div>
                  <div style={{ borderTop: "1px solid #334155", paddingTop: 4, fontSize: 12, fontWeight: 600 }}>Candidate Signature</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: 30 }}></div>
                  <div style={{ borderTop: "1px solid #334155", paddingTop: 4, fontSize: 12, fontWeight: 600 }}>Controller of Examinations</div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Pay Fees Modal */}
        {payModalOpen && (
          <Modal
            title="Pay Pending Fee Balance"
            onClose={() => !payBusy && setPayModalOpen(false)}
            size="md"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={() => setPayModalOpen(false)} disabled={payBusy}>Cancel</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={handleExecutePayment} disabled={payBusy}>
                  {payBusy ? "Processing..." : `Pay ₹${Number(payAmount || 0).toLocaleString()}`}
                </button>
              </>
            }
          >
            <form onSubmit={handleExecutePayment} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ padding: 12, background: "var(--cms-bg)", borderRadius: 8 }}>
                <div>Student: <strong>{child.name}</strong> ({child.admissionNo})</div>
                <div>Total Pending: <strong style={{ color: "var(--cms-red)" }}>₹{childFee.pending.toLocaleString()}</strong></div>
              </div>
              <div>
                <label className="cms-label" htmlFor="dash-pay-amount">Amount to Pay (₹)</label>
                <input
                  id="dash-pay-amount"
                  type="number"
                  className="cms-input"
                  min={500}
                  max={childFee.pending}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="cms-label">Payment Mode</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {["UPI", "Net Banking", "Card"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`cms-btn ${payMethod === m ? "cms-btn-primary" : "cms-btn-outline"}`}
                      onClick={() => setPayMethod(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </Modal>
        )}



        {/* Announcement Modal */}
        {selectedAnnouncementModal && (
          <Modal
            title={selectedAnnouncementModal.title}
            onClose={() => setSelectedAnnouncementModal(null)}
            size="md"
            footer={
              <button type="button" className="cms-btn cms-btn-primary" onClick={() => setSelectedAnnouncementModal(null)}>
                Close
              </button>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--cms-muted)" }}>
                <span>Category: <strong>{selectedAnnouncementModal.category}</strong></span>
                <span>Date: <strong>{selectedAnnouncementModal.date}</strong></span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--cms-text)", margin: 0 }}>
                {selectedAnnouncementModal.summary}
              </p>
              <div style={{ fontSize: 12, color: "var(--cms-muted)", fontStyle: "italic" }}>
                Published by: {selectedAnnouncementModal.author}
              </div>
            </div>
          </Modal>
        )}

        {/* Notification Modal */}
        {selectedNotifModal && (
          <Modal
            title={selectedNotifModal.title}
            onClose={() => setSelectedNotifModal(null)}
            size="md"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={() => setSelectedNotifModal(null)}>Close</button>
                {selectedNotifModal.link && (
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={() => {
                      navigate(selectedNotifModal.link);
                      setSelectedNotifModal(null);
                    }}
                  >
                    Open Page
                  </button>
                )}
              </>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--cms-muted)" }}>
                <span>Category: <strong>{selectedNotifModal.category}</strong></span>
                <span>{selectedNotifModal.time}</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: "var(--cms-text)" }}>{selectedNotifModal.message}</p>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}

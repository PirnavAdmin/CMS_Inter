import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Users, GraduationCap, Calendar, CheckCircle2, ChevronRight, Phone, Mail, Award, BookOpen, Clock, ArrowLeft, Eye } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useParentPortal, getChildForYear } from "../parentData.js";
import { Modal } from "@/components/common/Ui.jsx";
import "../ParentDashboard.css";

export default function ParentChildrenPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    availableChildren,
    activeChildId,
    setActiveChildId,
    currentAcademicYear,
  } = useParentPortal();
  const [selectedChildModal, setSelectedChildModal] = useState(null);

  const activeBase = availableChildren.find((c) => c.id === (id || activeChildId)) || availableChildren[0];
  const activeChild = activeBase ? getChildForYear(activeBase, currentAcademicYear) : null;

  const handleSelectChild = (childId) => {
    setActiveChildId(childId);
  };

  if (availableChildren.length === 0 || !activeChild) {
    return (
      <DashboardLayout
        title="My Children"
        subtitle="View enrolled children profile, academic performance, and mentorship details"
        breadcrumb={["Parent Portal", "My Children"]}
      >
        <div className="parent-dashboard-wrapper">
          <div className="parent-card" style={{ padding: 48, textAlign: "center" }}>
            <Users size={48} style={{ color: "var(--cms-muted)", margin: "0 auto 16px" }} />
            <h3>No Children Associated</h3>
            <p style={{ color: "var(--cms-muted)", fontSize: 14 }}>
              No enrolled student records were found linked to your parent account.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My Children"
      subtitle="View enrolled children profile, academic performance, and mentorship details"
      breadcrumb={["Parent Portal", "My Children"]}
    >
      <div className="parent-dashboard-wrapper">
        <div className="parent-child-banner">
          <div className="parent-child-meta">
            <div className="parent-stat-icon-wrap" style={{ width: 44, height: 44 }}>
              <Users size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Enrolled Children ({availableChildren.length})</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--cms-muted)" }}>Select a student to view full details or manage their records</p>
            </div>
          </div>
          <div className="parent-child-switch-buttons">
            {availableChildren.map((base) => {
              const c = getChildForYear(base, currentAcademicYear);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`parent-child-switch-btn ${activeChild.id === c.id ? "is-active" : ""}`}
                  onClick={() => handleSelectChild(c.id)}
                >
                  <GraduationCap size={15} />
                  {c.name} ({c.group})
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
          {availableChildren.map((base) => {
            const child = getChildForYear(base, currentAcademicYear);
            return (
            <div key={child.id} className="parent-card" style={{ borderTop: activeChild.id === child.id ? "3px solid var(--cms-primary)" : undefined }}>
              <div className="parent-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img src={child.avatar} alt={child.name} className="parent-child-avatar" style={{ width: 46, height: 46 }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{child.name}</h3>
                    <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Roll No: {child.roll} | Adm: {child.admissionNo}</span>
                  </div>
                </div>
                <span className={`cms-badge ${child.fees.status === "Paid" ? "cms-badge-active" : "cms-badge-warn"}`}>
                  Fee: {child.fees.status}
                </span>
              </div>
              <div className="parent-card-body">
                <div className="parent-profile-meta-grid" style={{ marginBottom: 16 }}>
                  <div className="parent-meta-item">
                    <span className="parent-meta-label">Course & Level</span>
                    <span className="parent-meta-val">{child.level}</span>
                  </div>
                  <div className="parent-meta-item">
                    <span className="parent-meta-label">Group & Section</span>
                    <span className="parent-meta-val">{child.group} - {child.section}</span>
                  </div>
                  <div className="parent-meta-item">
                    <span className="parent-meta-label">Overall Attendance</span>
                    <span className="parent-meta-val" style={{ color: "var(--cms-green)" }}>{child.attendance.overall}% ({child.attendance.status})</span>
                  </div>
                  <div className="parent-meta-item">
                    <span className="parent-meta-label">Current SGPA</span>
                    <span className="parent-meta-val" style={{ color: "var(--cms-primary-dark)" }}>{child.academics.sgpa} / 10.0</span>
                  </div>
                </div>

                <div style={{ padding: "12px 14px", background: "var(--cms-bg)", borderRadius: 10, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: "var(--cms-muted)", marginBottom: 4, fontWeight: 600 }}>CLASS TEACHER / MENTOR</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <strong style={{ fontSize: 13.5 }}>{child.mentor}</strong>
                      <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>{child.mentorDesignation}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <a href={`tel:${child.mentorMobile}`} className="cms-btn cms-btn-sm cms-btn-outline" title="Call Mentor">
                        <Phone size={13} />
                      </a>
                      <a href={`mailto:${child.mentorEmail}`} className="cms-btn cms-btn-sm cms-btn-outline" title="Email Mentor">
                        <Mail size={13} />
                      </a>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      handleSelectChild(child.id);
                      setSelectedChildModal(child);
                    }}
                  >
                    <Eye size={14} /> Quick View
                  </button>
                  <Link
                    to={`/parent-dashboard/children/${child.id}`}
                    className="cms-btn cms-btn-outline"
                    style={{ flex: 1, textDecoration: "none", textAlign: "center" }}
                    onClick={() => handleSelectChild(child.id)}
                  >
                    Full Profile <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
        </div>

        {/* Child Quick View Modal */}
        {selectedChildModal && (
          <Modal
            title={`Student Profile — ${selectedChildModal.name}`}
            onClose={() => setSelectedChildModal(null)}
            size="md"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={() => setSelectedChildModal(null)}>Close</button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={() => {
                    navigate(`/parent-dashboard/children/${selectedChildModal.id}`);
                    setSelectedChildModal(null);
                  }}
                >
                  Go to Full Profile
                </button>
              </>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 16, borderBottom: "1px solid var(--cms-border)" }}>
                <img src={selectedChildModal.avatar} alt={selectedChildModal.name} className="parent-child-avatar" style={{ width: 64, height: 64 }} />
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: 18 }}>{selectedChildModal.name}</h3>
                  <div style={{ fontSize: 13, color: "var(--cms-muted)" }}>{selectedChildModal.programme} | {selectedChildModal.section}</div>
                  <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 2 }}>Admission No: <strong>{selectedChildModal.admissionNo}</strong></div>
                </div>
              </div>
              <div className="parent-profile-meta-grid">
                <div className="parent-meta-item"><span className="parent-meta-label">Date of Birth</span><span className="parent-meta-val">{selectedChildModal.dob}</span></div>
                <div className="parent-meta-item"><span className="parent-meta-label">Gender</span><span className="parent-meta-val">{selectedChildModal.gender}</span></div>
                <div className="parent-meta-item"><span className="parent-meta-label">Blood Group</span><span className="parent-meta-val">{selectedChildModal.bloodGroup}</span></div>
                <div className="parent-meta-item"><span className="parent-meta-label">Board</span><span className="parent-meta-val">{selectedChildModal.board}</span></div>
                <div className="parent-meta-item"><span className="parent-meta-label">Academic Year</span><span className="parent-meta-val">{selectedChildModal.academicYear}</span></div>
                <div className="parent-meta-item"><span className="parent-meta-label">Attendance</span><span className="parent-meta-val" style={{ color: "var(--cms-green)" }}>{selectedChildModal.attendance.overall}% ({selectedChildModal.attendance.presentDays}/{selectedChildModal.attendance.totalWorkingDays} days)</span></div>
                <div className="parent-meta-item"><span className="parent-meta-label">Academic Standing</span><span className="parent-meta-val">SGPA {selectedChildModal.academics.sgpa} ({selectedChildModal.academics.grade})</span></div>
                <div className="parent-meta-item"><span className="parent-meta-label">Fee Status</span><span className="parent-meta-val" style={{ color: selectedChildModal.fees.pending > 0 ? "var(--cms-red)" : "var(--cms-green)" }}>{selectedChildModal.fees.status} (Pending: ₹{selectedChildModal.fees.pending.toLocaleString()})</span></div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}

export function ParentChildDetailsRoute() {
  const { id } = useParams();
  const { availableChildren, activeChildId, currentAcademicYear, setActiveChildId } = useParentPortal();
  const baseChild = availableChildren.find((c) => c.id === id) || availableChildren[0];
  const child = baseChild ? getChildForYear(baseChild, currentAcademicYear) : null;

  useEffect(() => {
    if (child?.id && activeChildId !== child.id) {
      setActiveChildId(child.id);
    }
  }, [child?.id, activeChildId, setActiveChildId]);

  if (!child) {
    return (
      <DashboardLayout
        title="Student Profile"
        subtitle="Child Record"
        breadcrumb={["Parent Portal", "My Children"]}
        backLink={<Link to="/parent-dashboard/children" className="cms-btn cms-btn-sm cms-btn-outline" style={{ textDecoration: "none", marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", marginLeft: 0, marginRight: "auto" }}><ArrowLeft size={14} /> Back to Children</Link>}
      >
        <div className="parent-dashboard-wrapper">
          <div className="parent-card" style={{ padding: 48, textAlign: "center" }}>
            <h3>Student Record Not Found</h3>
            <p style={{ color: "var(--cms-muted)" }}>This child profile is not associated with your parent account.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Student Profile — ${child.name}`}
      subtitle={`${child.programme} • Roll No: ${child.roll} • Admission No: ${child.admissionNo}`}
      breadcrumb={["Parent Portal", "My Children", child.name]}
      backLink={<Link to="/parent-dashboard/children" className="cms-btn cms-btn-sm cms-btn-outline" style={{ textDecoration: "none", marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", marginLeft: 0, marginRight: "auto" }}><ArrowLeft size={14} /> Back to Children</Link>}
    >
      <div className="parent-dashboard-wrapper">
        <div className="parent-card">
          <div className="parent-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <img src={child.avatar} alt={child.name} className="parent-child-avatar" style={{ width: 60, height: 60 }} />
              <div>
                <h2 style={{ margin: "0 0 4px 0", fontSize: 18, color: "var(--cms-text)" }}>{child.name}</h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--cms-muted)" }}>{child.level} • {child.department}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Link to="/parent-dashboard/attendance" className="cms-btn cms-btn-outline cms-btn-sm" style={{ textDecoration: "none" }}>Attendance</Link>
              <Link to="/parent-dashboard/academics" className="cms-btn cms-btn-outline cms-btn-sm" style={{ textDecoration: "none" }}>Academics</Link>
              <Link to="/parent-dashboard/fees" className="cms-btn cms-btn-primary cms-btn-sm" style={{ textDecoration: "none" }}>Fees</Link>
            </div>
          </div>
          <div className="parent-card-body">
            <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--cms-muted)", marginBottom: 14 }}>Academic & Enrollment Details</h3>
            <div className="parent-profile-meta-grid" style={{ marginBottom: 24 }}>
              <div className="parent-meta-item"><span className="parent-meta-label">Student ID</span><span className="parent-meta-val">{child.studentId}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Admission Number</span><span className="parent-meta-val">{child.admissionNo}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Roll Number</span><span className="parent-meta-val">{child.roll}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Current Level</span><span className="parent-meta-val">{child.level}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Group & Section</span><span className="parent-meta-val">{child.group} - {child.section}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Current Semester</span><span className="parent-meta-val">{child.semester}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Board</span><span className="parent-meta-val">{child.board}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Academic Year</span><span className="parent-meta-val">{child.academicYear}</span></div>
            </div>

            <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--cms-muted)", marginBottom: 14 }}>Academic & Attendance Status</h3>
            <div className="parent-profile-meta-grid" style={{ marginBottom: 24 }}>
              <div className="parent-meta-item"><span className="parent-meta-label">Overall Attendance</span><span className="parent-meta-val" style={{ color: "var(--cms-green)", fontWeight: 700 }}>{child.attendance?.overall}% ({child.attendance?.status})</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Days Present</span><span className="parent-meta-val">{child.attendance?.presentDays} / {child.attendance?.totalWorkingDays} days</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Current SGPA</span><span className="parent-meta-val" style={{ color: "var(--cms-primary-dark)", fontWeight: 700 }}>{child.academics?.sgpa} ({child.academics?.grade || "A+"})</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Class Rank</span><span className="parent-meta-val">{child.academics?.rank}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Fee Account</span><span className="parent-meta-val" style={{ color: (child.fees?.pending || 0) > 0 ? "var(--cms-red)" : "var(--cms-green)", fontWeight: 600 }}>{child.fees?.status} (₹{child.fees?.paid?.toLocaleString()} paid)</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Pending Fee Balance</span><span className="parent-meta-val" style={{ color: (child.fees?.pending || 0) > 0 ? "var(--cms-red)" : "var(--cms-green)", fontWeight: 700 }}>₹{child.fees?.pending?.toLocaleString()}</span></div>
            </div>

            <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--cms-muted)", marginBottom: 14 }}>Personal Information</h3>
            <div className="parent-profile-meta-grid" style={{ marginBottom: 24 }}>
              <div className="parent-meta-item"><span className="parent-meta-label">Date of Birth</span><span className="parent-meta-val">{child.dob}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Gender</span><span className="parent-meta-val">{child.gender}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Blood Group</span><span className="parent-meta-val">{child.bloodGroup}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Student Contact</span><span className="parent-meta-val">{child.mobile}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Student Email</span><span className="parent-meta-val">{child.email}</span></div>
            </div>

            <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--cms-muted)", marginBottom: 14 }}>Assigned Mentor & Class In-Charge</h3>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, background: "var(--cms-bg)", borderRadius: 12 }}>
              <div>
                <strong style={{ fontSize: 15, display: "block" }}>{child.mentor}</strong>
                <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>{child.mentorDesignation}</span>
                <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 4 }}>Phone: {child.mentorMobile} | Email: {child.mentorEmail}</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <a href={`tel:${child.mentorMobile}`} className="cms-btn cms-btn-outline"><Phone size={14} /> Call Mentor</a>
                <Link to="/parent-dashboard/communication" className="cms-btn cms-btn-primary" style={{ textDecoration: "none" }}><Mail size={14} /> Send Message</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

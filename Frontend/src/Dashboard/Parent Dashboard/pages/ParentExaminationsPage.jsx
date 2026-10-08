import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, MapPin, FileText, CheckCircle2, AlertTriangle, Download, Printer, Eye, Users } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useParentPortal, upcomingExamsData } from "../parentData.js";
import { Modal } from "@/components/common/Ui.jsx";
import "../ParentDashboard.css";

const getExamMetaForYear = (year) => {
  if (year === "2024-2025") {
    return {
      title: "Annual Foundation Examinations 2024-25",
      subtitle: "Foundation Theory Examinations • March 2025 • Examination Center: Main Campus",
      startDate: "20 March 2025",
      admitCardTitle: "FOUNDATION EXAMINATIONS ADMIT CARD — MAR 2025",
      hallTicketPrefix: "HT2024",
    };
  }
  if (year === "2025-2026") {
    return {
      title: "Annual Board Examinations 2025-26",
      subtitle: "Annual Theory Examinations • March 2026 • Examination Center: Main Campus",
      startDate: "18 March 2026",
      admitCardTitle: "ANNUAL EXAMINATIONS ADMIT CARD — MAR 2026",
      hallTicketPrefix: "HT2025",
    };
  }
  return {
    title: "Half-Yearly Examinations 2026",
    subtitle: "Half-Yearly Theory Examinations • December 2026 • Examination Center: Main Campus",
    startDate: "05 December 2026",
    admitCardTitle: "HALF-YEARLY EXAMINATIONS ADMIT CARD — DEC 2026",
    hallTicketPrefix: "HT2026",
  };
};

export default function ParentExaminationsPage() {
  const {
    availableChildren,
    activeChildId,
    setActiveChildId,
    child,
    dataKey,
    currentAcademicYear,
  } = useParentPortal();
  const [selectedExamModal, setSelectedExamModal] = useState(null);
  const [hallTicketOpen, setHallTicketOpen] = useState(false);

  useEffect(() => {
    setSelectedExamModal(null);
    setHallTicketOpen(false);
  }, [currentAcademicYear, activeChildId]);

  const exams = child && dataKey ? upcomingExamsData[dataKey] || [] : [];
  const examMeta = getExamMetaForYear(currentAcademicYear);

  const handleSelectChild = (id) => {
    setActiveChildId(id);
  };

  if (availableChildren.length === 0 || !child) {
    return (
      <DashboardLayout
        title="Examinations"
        subtitle="Examination Schedule"
        breadcrumb={["Parent Portal", "Examinations"]}
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
      title="Examinations"
      subtitle={`Upcoming Schedule & Hall Tickets • ${child.name} (${child.group}) • Academic Year ${currentAcademicYear}`}
      breadcrumb={["Parent Portal", "Examinations"]}
    >
      <div className="parent-dashboard-wrapper">
        {/* Child Switcher */}
        <div className="parent-child-banner">
          <div className="parent-child-meta">
            <img src={child.avatar} alt={child.name} className="parent-child-avatar" />
            <div className="parent-child-title">
              <h2>{child.name} ({child.group})</h2>
              <p>{examMeta.subtitle}</p>
            </div>
          </div>
          <div className="parent-child-switch-buttons">
            {availableChildren.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`parent-child-switch-btn ${child.id === c.id ? "is-active" : ""}`}
                onClick={() => handleSelectChild(c.id)}
              >
                <Users size={14} /> {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Examination Banner & Actions */}
        <div
          className="parent-card"
          style={{
            background: "linear-gradient(135deg, var(--cms-surface), #f8fafc)",
            borderLeft: `4px solid ${exams.length > 0 ? "var(--cms-primary)" : "var(--cms-border)"}`,
          }}
        >
          <div className="parent-card-body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              {exams.length > 0 ? (
                <>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--cms-primary-dark)", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    <CheckCircle2 size={16} /> EXAMINATION ADMIT CARD AVAILABLE
                  </div>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: 18, color: "var(--cms-text)" }}>{examMeta.title}</h3>
                  <p style={{ margin: 0, fontSize: 13.5, color: "var(--cms-muted)" }}>
                    Examinations begin on <strong>{examMeta.startDate}</strong>. Please download and print the official hall ticket with parent endorsement.
                  </p>
                </>
              ) : (
                <>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--cms-muted)", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    <Calendar size={16} /> NO EXAMINATIONS SCHEDULED
                  </div>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: 18, color: "var(--cms-text)" }}>Academic Year {currentAcademicYear}</h3>
                  <p style={{ margin: 0, fontSize: 13.5, color: "var(--cms-muted)" }}>
                    There are no upcoming or scheduled examinations released for Academic Year {currentAcademicYear}.
                  </p>
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={() => setHallTicketOpen(true)}
                disabled={exams.length === 0}
                style={exams.length === 0 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              >
                <Printer size={15} /> View Hall Ticket
              </button>
              <Link to="/parent-dashboard/academics?tab=results" className="cms-btn cms-btn-outline" style={{ textDecoration: "none" }}>
                Previous Results
              </Link>
            </div>
          </div>
        </div>

        {/* Exam Schedule Table */}
        <div className="parent-card">
          <div className="parent-card-header">
            <h3 className="parent-card-title">
              <Calendar size={18} /> Official Examination Timetable
            </h3>
            <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>Total: {exams.length} Scheduled Papers</span>
          </div>
          <div className="parent-card-body" style={{ padding: 0 }}>
            <div className="parent-timetable-table-wrap" style={{ border: "none" }}>
              <table className="parent-timetable-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Subject & Code</th>
                    <th>Examination Hall</th>
                    <th>Seat Allocation</th>
                    <th>Max Marks</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.length > 0 ? (
                    exams.map((ex) => (
                      <tr key={ex.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--cms-text)" }}>
                            <Calendar size={14} color="var(--cms-primary)" /> {ex.date}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--cms-muted)", marginTop: 2 }}>
                            <Clock size={12} /> {ex.time}
                          </div>
                        </td>
                        <td>
                          <strong>{ex.subject}</strong>
                          <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>Code: {ex.code}</div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <MapPin size={13} color="var(--cms-muted)" /> {ex.hall}
                          </div>
                        </td>
                        <td>
                          <span className="cms-badge cms-badge-active">{ex.seat}</span>
                        </td>
                        <td>{ex.maxMarks} Marks</td>
                        <td>
                          <button
                            type="button"
                            className="cms-btn cms-btn-sm cms-btn-outline"
                            onClick={() => setSelectedExamModal(ex)}
                          >
                            <Eye size={13} /> Syllabus & Info
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "36px 16px", color: "var(--cms-muted)" }}>
                        <Calendar size={32} style={{ margin: "0 auto 8px", opacity: 0.5, display: "block" }} />
                        No examination timetable scheduled for Academic Year {currentAcademicYear}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Examination Rules & Guidelines */}
        <div className="parent-card">
          <div className="parent-card-header">
            <h3 className="parent-card-title">
              <AlertTriangle size={18} color="var(--cms-amber)" /> Important Rules for Students & Parents
            </h3>
          </div>
          <div className="parent-card-body">
            <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5, color: "var(--cms-text)" }}>
              <li>Students must report to the examination hall at least <strong>30 minutes</strong> prior to commencement (by 09:00 AM).</li>
              <li>A physical printout of the Hall Ticket and College Student ID Card are mandatory for entry into the exam hall.</li>
              <li>Electronic gadgets including smart watches, mobile phones, and programmable calculators are strictly prohibited.</li>
              <li>No student will be permitted to leave the examination hall before the completion of 2 hours.</li>
            </ul>
          </div>
        </div>

        {/* Exam Detail Modal */}
        {selectedExamModal && (
          <Modal
            title={`Exam Details — ${selectedExamModal.subject} (${selectedExamModal.code})`}
            onClose={() => setSelectedExamModal(null)}
            size="md"
            footer={
              <button type="button" className="cms-btn cms-btn-primary" onClick={() => setSelectedExamModal(null)}>
                Close
              </button>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ padding: 14, background: "var(--cms-bg)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Examination Date:</span>
                  <strong>{selectedExamModal.date}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Timings:</span>
                  <strong>{selectedExamModal.time}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Hall & Room:</span>
                  <strong>{selectedExamModal.hall} (Seat {selectedExamModal.seat})</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Invigilator:</span>
                  <strong>{selectedExamModal.invigilator}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Maximum Marks:</span>
                  <strong>{selectedExamModal.maxMarks} Marks</strong>
                </div>
              </div>
              <div>
                <strong style={{ display: "block", marginBottom: 4, fontSize: 13.5 }}>Prescribed Syllabus & Units:</strong>
                <p style={{ margin: 0, fontSize: 13, color: "var(--cms-text)", background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid var(--cms-border)" }}>
                  {selectedExamModal.syllabus}
                </p>
              </div>
            </div>
          </Modal>
        )}

        {/* Hall Ticket Printable Modal */}
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
                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--cms-muted)" }}>Affiliated to Board of Intermediate Education</div>
                  <strong style={{ display: "block", marginTop: 4, fontSize: 15 }}>{examMeta.admitCardTitle}</strong>
                </div>
                <img src={child.avatar} alt={child.name} style={{ width: 70, height: 80, objectFit: "cover", border: "2px solid #000", borderRadius: 4 }} />
              </div>

              <div className="parent-hall-ticket-meta">
                <div><span>Candidate Name:</span> <strong style={{ display: "block" }}>{child.name}</strong></div>
                <div><span>Admission No:</span> <strong style={{ display: "block" }}>{child.admissionNo}</strong></div>
                <div><span>Roll / Hall Ticket No:</span> <strong style={{ display: "block" }}>{examMeta.hallTicketPrefix}{child.roll}</strong></div>
                <div><span>Course & Group:</span> <strong style={{ display: "block" }}>{child.programme}</strong></div>
                <div><span>Center:</span> <strong style={{ display: "block" }}>Pirnav Campus - Block A</strong></div>
                <div><span>Parent Endorsement:</span> <strong style={{ display: "block" }}>Verified by Parent Portal</strong></div>
              </div>

              <table className="parent-receipt-table" style={{ margin: "14px 0" }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Subject</th>
                    <th>Hall / Room</th>
                    <th>Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((ex) => (
                    <tr key={ex.id}>
                      <td>{ex.date}</td>
                      <td>{ex.time}</td>
                      <td><strong>{ex.subject}</strong> ({ex.code})</td>
                      <td>{ex.hall}</td>
                      <td style={{ color: "#94a3b8" }}>_______________</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30, paddingTop: 16, borderTop: "1px solid #cbd5e1" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: 35 }}></div>
                  <div style={{ borderTop: "1px solid #334155", paddingTop: 4, fontSize: 12, fontWeight: 600 }}>Parent Signature</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: 35 }}></div>
                  <div style={{ borderTop: "1px solid #334155", paddingTop: 4, fontSize: 12, fontWeight: 600 }}>Candidate Signature</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: 35 }}></div>
                  <div style={{ borderTop: "1px solid #334155", paddingTop: 4, fontSize: 12, fontWeight: 600 }}>Controller of Examinations</div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}

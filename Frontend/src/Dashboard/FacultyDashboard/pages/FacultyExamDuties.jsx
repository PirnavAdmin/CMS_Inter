import React, { useState } from "react";
import { Download, Check, AlertCircle, CheckCircle2 } from "lucide-react";
import "../styles/FacultyExamDuties.css";
import { facultyMockData } from "../data/facultyMockData.js";

import { useFacultySafe } from "../FacultyContext.jsx";

export default function FacultyExamDuties() {
  const context = useFacultySafe();
  const [dutiesList] = useState(facultyMockData.examDuties);
  const [examDutyTab, setExamDutyTab] = useState("all");
  const [toast, setToast] = useState(null);

  const notify = (text, type = "success") => {
    if (context?.notify) {
      context.notify(text, type);
    } else {
      setToast({ text, type });
      setTimeout(() => setToast(null), 3500);
    }
  };

  const filteredDuties = dutiesList.filter((d) => {
    if (examDutyTab === "all") return true;
    return d.category === examDutyTab;
  });

  return (
    <div>
      <div className="cms-page-head">
        <div>
          <h1>Examination Duties</h1>
          <p>Assigned BIEAP/TSBIE Board examinations, practical examiner duties & internal unit tests.</p>
        </div>
        <button className="cms-btn cms-btn-ghost" onClick={() => notify("Exam duties schedule downloaded.")}>
          <Download size={14} /> Download Schedule
        </button>
      </div>

      {/* Category Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[
          ["all", "All Duties"],
          ["board", "Board Theory (IPE)"],
          ["practical", "Practical Exams"],
          ["internal", "Internal Tests"],
        ].map(([k, lbl]) => (
          <button
            key={k}
            className={`cms-btn ${examDutyTab === k ? "cms-btn-primary" : "cms-btn-ghost"}`}
            onClick={() => setExamDutyTab(k)}
            style={{ fontSize: 13 }}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className="cms-grid-2">
        {filteredDuties.map((d) => (
          <div key={d.id} className="sp-duty-card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span className={`cms-badge ${d.dutyType.includes("Invigilator") || d.dutyType.includes("Superintendent") ? "cms-badge-info" : "cms-badge-warn"}`}>
                {d.dutyType}
              </span>
              <span className={`cms-badge ${d.status === "Completed" ? "cms-badge-active" : "cms-badge-warn"}`}>
                {d.status}
              </span>
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{d.examName}</div>
            <div style={{ fontSize: 13, color: "var(--cms-primary-dark)", fontWeight: 700, marginBottom: 6 }}>
              📖 {d.subject} · Code: {d.examCode}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--cms-text-secondary)", marginBottom: 12 }}>
              <div>📅 Date & Session: <strong>{d.date} ({d.session})</strong></div>
              <div>⏰ Exam Hours: <strong>{d.startTime} – {d.endTime}</strong></div>
              <div>🚨 Reporting Time: <strong style={{ color: "var(--cms-red, #dc2626)" }}>{d.reportingTime}</strong></div>
              <div>📍 Venue: <strong>{d.venue}</strong></div>
              <div>👥 Candidates: <strong>{d.candidates}</strong></div>
            </div>

            {/* SOP Checklist */}
            {d.sops && (
              <div style={{ background: "var(--cms-subtle, #f9fafb)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--cms-border)", marginBottom: 14 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", color: "var(--cms-muted)", marginBottom: 6 }}>
                  Duty Guidelines & SOPs:
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "var(--cms-text-secondary)", lineHeight: 1.5 }}>
                  {d.sops.map((sop, sIdx) => <li key={sIdx}>{sop}</li>)}
                </ul>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="cms-btn cms-btn-primary"
                style={{ flex: 1, justifyContent: "center", fontSize: 12.5 }}
                onClick={() => notify(`Allotment order for ${d.examCode} downloaded.`)}
              >
                <Download size={13} /> Duty Order
              </button>
              <button
                className="cms-btn cms-btn-ghost"
                style={{ flex: 1, justifyContent: "center", fontSize: 12.5 }}
                onClick={() => notify(`Duty acknowledged for ${d.examCode}`)}
              >
                <Check size={13} /> Acknowledge
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`sp-toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.text}
        </div>
      )}
    </div>
  );
}


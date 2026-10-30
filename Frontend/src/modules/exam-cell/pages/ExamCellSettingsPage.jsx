import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sliders,
  Award,
  Calendar,
  CheckCircle2,
  Bell,
  Clock,
  FileText,
  Landmark,
  Save,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { Toast } from "@/shared/components/Ui.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { getExaminationSettings, updateExaminationSettings } from "@/services/examinationService.js";
import attendanceTimingImg from "@/assets/settings-3d/attendance-timing.png";
import templatesImg from "@/assets/settings-3d/templates.png";
import boardYearImg from "@/assets/settings-3d/board-academic-year.png";
import { SHOW_HALL_TICKETS } from "../hallTicketsConfig.js";
import "./ExamCellSettingsPage.css";

const STORAGE_KEY = "cms_exam_cell_settings";

const DEFAULT_SETTINGS = {
  // Grading & Evaluation (Backend /api/v1/examinations/settings)
  minPassPercentage: 35,
  maxGraceMarks: 5,
  gradeScale: "10-Point CGPA (UGC / AICTE Standard)",
  reevaluationWindowDays: 15,
  allowNegativeMarking: false,
  doubleEvaluationTheory: false,

  // Hall Tickets & Attendance
  minAttendancePercent: 75,
  condonationThreshold: 65,
  includePrincipalSign: true,
  autoLockSeatingHours: 24,
  allowManualHallTicketRelease: true,

  // Results & Notifications
  smsAlertsOnPublish: true,
  emailMarksheetCopy: true,
  restrictResultsForFeeDue: false,
  autoArchivePastExams: true,
};

export default function ExamCellSettingsPage() {
  const navigate = useNavigate();
  const campusCtx = useCampusContext();
  const campusId = campusCtx?.selectedCampusId || campusCtx?.selectedCampus?.campusId || campusCtx?.selectedCampus?.id || 1;

  const [activeTab, setActiveTab] = useState("grading");
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch live examination cell settings from backend
  useEffect(() => {
    let isMounted = true;
    async function loadBackendSettings() {
      try {
        setLoading(true);
        const data = await getExaminationSettings(campusId);
        if (data && isMounted) {
          setSettings((prev) => ({
            ...prev,
            minPassPercentage: data.minimumPassingPercentage ?? prev.minPassPercentage,
            maxGraceMarks: data.maximumGraceMarksLimit ?? prev.maxGraceMarks,
            gradeScale: data.gradeScaleStandard || prev.gradeScale,
            reevaluationWindowDays: data.reEvaluationWindowDays ?? prev.reevaluationWindowDays,
            doubleEvaluationTheory: Boolean(data.enableDoubleEvaluation ?? prev.doubleEvaluationTheory),
            allowNegativeMarking: Boolean(data.allowNegativeMarking ?? prev.allowNegativeMarking),
          }));
          if (data.updatedAt) {
            setLastUpdatedAt(data.updatedAt);
          }
        }
      } catch {
        // Cached default values remain active seamlessly
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBackendSettings();
    return () => {
      isMounted = false;
    };
  }, [campusId]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        minimumPassingPercentage: Number(settings.minPassPercentage) || 35,
        maximumGraceMarksLimit: Number(settings.maxGraceMarks) || 0,
        gradeScaleStandard: settings.gradeScale || "10-Point CGPA (UGC / AICTE Standard)",
        reEvaluationWindowDays: Number(settings.reevaluationWindowDays) || 15,
        enableDoubleEvaluation: Boolean(settings.doubleEvaluationTheory),
        allowNegativeMarking: Boolean(settings.allowNegativeMarking),
      };

      const result = await updateExaminationSettings(campusId, payload);
      if (result?.updatedAt) setLastUpdatedAt(result.updatedAt);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      showToast("Exam Cell settings saved and applied to database successfully!", "success");
    } catch (err) {
      console.error("Failed to save examination settings:", err);
      showToast("Failed to save settings: " + (err?.response?.data?.message || err.message || "Server error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to restore default Exam Cell settings?")) {
      setSettings(DEFAULT_SETTINGS);
      try {
        setSaving(true);
        const defaultPayload = {
          minimumPassingPercentage: 35,
          maximumGraceMarksLimit: 5,
          gradeScaleStandard: "10-Point CGPA (UGC / AICTE Standard)",
          reEvaluationWindowDays: 15,
          enableDoubleEvaluation: false,
          allowNegativeMarking: false,
        };
        const result = await updateExaminationSettings(campusId, defaultPayload);
        if (result?.updatedAt) setLastUpdatedAt(result.updatedAt);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
        showToast("Restored system default Exam Cell settings in database.", "info");
      } catch (err) {
        console.error("Failed to reset examination settings:", err);
        showToast("Failed to restore default settings: " + (err?.response?.data?.message || err.message || "Server error"), "error");
      } finally {
        setSaving(false);
      }
    }
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const quickLinks = [
    {
      title: "Attendance Timing",
      desc: "Work shifts, check-in thresholds and late rules for staff and biometric terminals.",
      to: "/exam-cell-dashboard/attendance-timing",
      image: attendanceTimingImg,
      btn: "Configure Timings",
    },
    {
      title: "Certificate Templates",
      desc: "Customize marksheet, transfer and bona fide certificate layouts.",
      to: "/exam-cell-dashboard/certificates",
      image: templatesImg,
      btn: "Manage Templates",
    },
    {
      title: "Board & Academic Year",
      desc: "Configure educational boards, active academic calendars, and date intervals.",
      to: "/dashboard/board-academic-year",
      image: boardYearImg,
      btn: "Manage Board",
    },
  ];

  return (
    <DashboardLayout
      title="Exam Cell Settings"
      subtitle="Manage examination policies, grading thresholds, and publication options."
      breadcrumb={["Home", "Exam Cell", "Settings"]}
    >
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* QUICK SYSTEM MODULES CARDS */}
      <section className="ec-settings-quick-grid">
        {quickLinks.map((item) => (
          <article key={item.title} className="ec-settings-quick-card">
            <div className="ec-settings-quick-icon">
              <img src={item.image} alt="" aria-hidden="true" />
            </div>
            <div className="ec-settings-quick-content">
              <h4>{item.title}</h4>
              <p>{item.desc}</p>
              <button
                type="button"
                className="cms-btn cms-btn-outline"
                onClick={() => navigate(item.to)}
              >
                {item.btn} <ArrowRight size={13} />
              </button>
            </div>
          </article>
        ))}
      </section>

      {/* MAIN SETTINGS PANEL */}
      <div className="cms-card ec-settings-container">
        {/* NAV TABS */}
        <div className="ec-settings-tabs">
          <button
            type="button"
            className={`ec-settings-tab ${activeTab === "grading" ? "is-active" : ""}`}
            onClick={() => setActiveTab("grading")}
          >
            <Award size={16} />
            <span>Grading &amp; Evaluation</span>
          </button>
          {SHOW_HALL_TICKETS && (
            <button
              type="button"
              className={`ec-settings-tab ${activeTab === "halltickets" ? "is-active" : ""}`}
              onClick={() => setActiveTab("halltickets")}
            >
              <FileText size={16} />
              <span>Hall Ticket &amp; Attendance</span>
            </button>
          )}
          <button
            type="button"
            className={`ec-settings-tab ${activeTab === "results" ? "is-active" : ""}`}
            onClick={() => setActiveTab("results")}
          >
            <Bell size={16} />
            <span>Publishing &amp; Notifications</span>
          </button>
        </div>

        {/* SETTINGS CONTENT FORM */}
        <form onSubmit={handleSave} className="ec-settings-form">
          {activeTab === "grading" && (
            <div className="ec-settings-section">
              <div className="ec-settings-section-head">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <h3>Grading Criteria &amp; Moderation Rules</h3>
                  {lastUpdatedAt && (
                    <span style={{ fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
                      Live Synced • Updated: {new Date(lastUpdatedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <p>Define standard academic pass parameters, grace allowances, and scoring systems.</p>
              </div>

              <div className="ec-form-grid-2">
                <div className="cms-field">
                  <label>
                    Minimum Passing Percentage (%)
                    <span className="ec-field-hint">Percentage required in each subject to qualify as PASS</span>
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="60"
                    className="cms-input"
                    value={settings.minPassPercentage}
                    onChange={(e) => updateSetting("minPassPercentage", Number(e.target.value))}
                  />
                </div>

                <div className="cms-field">
                  <label>
                    Maximum Grace Marks Limit
                    <span className="ec-field-hint">Marks that can be moderated by Exam Controller</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    className="cms-input"
                    value={settings.maxGraceMarks}
                    onChange={(e) => updateSetting("maxGraceMarks", Number(e.target.value))}
                  />
                </div>

                <div className="cms-field">
                  <label>
                    Grade Scale Standard
                    <span className="ec-field-hint">Calculation convention used on report cards</span>
                  </label>
                  <select
                    className="cms-input"
                    value={
                      /percentage/i.test(settings.gradeScale)
                        ? "Percentage & Divisions (1st, 2nd, 3rd)"
                        : /letter/i.test(settings.gradeScale)
                        ? "Letter Grades (A+, A, B, C, D, F)"
                        : "10-Point CGPA (UGC / AICTE Standard)"
                    }
                    onChange={(e) => updateSetting("gradeScale", e.target.value)}
                  >
                    <option value="10-Point CGPA (UGC / AICTE Standard)">10-Point CGPA (UGC / AICTE Standard)</option>
                    <option value="Percentage & Divisions (1st, 2nd, 3rd)">Percentage &amp; Divisions (1st, 2nd, 3rd)</option>
                    <option value="Letter Grades (A+, A, B, C, D, F)">Letter Grades (A+, A, B, C, D, F)</option>
                  </select>
                </div>

                <div className="cms-field">
                  <label>
                    Re-Evaluation Application Window (Days)
                    <span className="ec-field-hint">Days after result publication student can apply</span>
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="45"
                    className="cms-input"
                    value={settings.reevaluationWindowDays}
                    onChange={(e) => updateSetting("reevaluationWindowDays", Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="ec-toggle-group">
                <label className="ec-toggle-label">
                  <input
                    type="checkbox"
                    checked={settings.doubleEvaluationTheory}
                    onChange={(e) => updateSetting("doubleEvaluationTheory", e.target.checked)}
                  />
                  <div className="ec-toggle-text">
                    <strong>Enable Double Evaluation for Major Theory Papers</strong>
                    <span>Requires marks entry verification by two independent faculty evaluators before finalizing.</span>
                  </div>
                </label>

                <label className="ec-toggle-label">
                  <input
                    type="checkbox"
                    checked={settings.allowNegativeMarking}
                    onChange={(e) => updateSetting("allowNegativeMarking", e.target.checked)}
                  />
                  <div className="ec-toggle-text">
                    <strong>Allow Negative Marking for MCQ / Competitive Practice Tests</strong>
                    <span>Enables deduction of fractional marks for incorrect answers where configured.</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {SHOW_HALL_TICKETS && activeTab === "halltickets" && (
            <div className="ec-settings-section">
              <div className="ec-settings-section-head">
                <h3>Hall Ticket Issuance &amp; Eligibility Parameters</h3>
                <p>Enforce minimum biometric attendance rules and seating allocation guidelines.</p>
              </div>

              <div className="ec-form-grid-2">
                <div className="cms-field">
                  <label>
                    Minimum Attendance Threshold for Hall Ticket (%)
                    <span className="ec-field-hint">Mandatory overall attendance needed to download admit card</span>
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="90"
                    className="cms-input"
                    value={settings.minAttendancePercent}
                    onChange={(e) => updateSetting("minAttendancePercent", Number(e.target.value))}
                  />
                </div>

                <div className="cms-field">
                  <label>
                    Attendance Condonation Threshold (%)
                    <span className="ec-field-hint">Medical exemption / special permission approval floor</span>
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="75"
                    className="cms-input"
                    value={settings.condonationThreshold}
                    onChange={(e) => updateSetting("condonationThreshold", Number(e.target.value))}
                  />
                </div>

                <div className="cms-field">
                  <label>
                    Auto-Lock Hall Allocation Before Exam (Hours)
                    <span className="ec-field-hint">Freezes room and bench re-allocation prior to exam start</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="72"
                    className="cms-input"
                    value={settings.autoLockSeatingHours}
                    onChange={(e) => updateSetting("autoLockSeatingHours", Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="ec-toggle-group">
                <label className="ec-toggle-label">
                  <input
                    type="checkbox"
                    checked={settings.includePrincipalSign}
                    onChange={(e) => updateSetting("includePrincipalSign", e.target.checked)}
                  />
                  <div className="ec-toggle-text">
                    <strong>Include Controller / Principal Digital Signature on Hall Tickets</strong>
                    <span>Embeds the verified institution seal and signature on generated PDF hall tickets.</span>
                  </div>
                </label>

                <label className="ec-toggle-label">
                  <input
                    type="checkbox"
                    checked={settings.allowManualHallTicketRelease}
                    onChange={(e) => updateSetting("allowManualHallTicketRelease", e.target.checked)}
                  />
                  <div className="ec-toggle-text">
                    <strong>Permit Exam Cell Manual Admit Card Overrides</strong>
                    <span>Allows Exam Incharge to manually generate Hall Ticket for eligible special cases.</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeTab === "results" && (
            <div className="ec-settings-section">
              <div className="ec-settings-section-head">
                <h3>Result Publishing &amp; Broadcast Settings</h3>
                <p>Configure automated notifications, alerts, and publication security.</p>
              </div>

              <div className="ec-toggle-group">
                <label className="ec-toggle-label">
                  <input
                    type="checkbox"
                    checked={settings.smsAlertsOnPublish}
                    onChange={(e) => updateSetting("smsAlertsOnPublish", e.target.checked)}
                  />
                  <div className="ec-toggle-text">
                    <strong>Broadcast SMS Alerts to Registered Parent Mobiles</strong>
                    <span>Dispatches automated SMS score summary immediately upon section result publication.</span>
                  </div>
                </label>

                <label className="ec-toggle-label">
                  <input
                    type="checkbox"
                    checked={settings.emailMarksheetCopy}
                    onChange={(e) => updateSetting("emailMarksheetCopy", e.target.checked)}
                  />
                  <div className="ec-toggle-text">
                    <strong>Email PDF Marksheet to Parent &amp; Student</strong>
                    <span>Attaches digitally verified electronic statement of marks to registered emails.</span>
                  </div>
                </label>

                <label className="ec-toggle-label">
                  <input
                    type="checkbox"
                    checked={settings.restrictResultsForFeeDue}
                    onChange={(e) => updateSetting("restrictResultsForFeeDue", e.target.checked)}
                  />
                  <div className="ec-toggle-text">
                    <strong>Restrict Result View on Portal for Outstanding Fee Defaulters</strong>
                    <span>Withholds online mark sheet display until finance clearance is approved.</span>
                  </div>
                </label>

                <label className="ec-toggle-label">
                  <input
                    type="checkbox"
                    checked={settings.autoArchivePastExams}
                    onChange={(e) => updateSetting("autoArchivePastExams", e.target.checked)}
                  />
                  <div className="ec-toggle-text">
                    <strong>Auto-Archive Past Term Examinations</strong>
                    <span>Moves completed and published examination records into the audit archive after 90 days.</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ACTIONS FOOTER */}
          <div className="ec-settings-actions">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={handleReset}
              disabled={saving}
            >
              <RotateCcw size={15} /> Reset to Defaults
            </button>
            <button
              type="submit"
              className="cms-btn cms-btn-primary"
              disabled={saving}
            >
              <Save size={15} /> {saving ? "Saving Changes..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect } from "react";
import { Settings, Bell, Lock, Globe, Shield, CheckCircle2, Save } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import {
  useParentPortal,
  getStoredSettings,
  saveStoredSettings,
  getStoredParentPassword,
  saveStoredParentPassword,
} from "../parentData.js";
import "../ParentDashboard.css";

export default function ParentSettingsPage() {
  const { parentUser } = useParentPortal();
  const initial = getStoredSettings(parentUser?.id);
  const [smsAlerts, setSmsAlerts] = useState(initial.smsAlerts ?? true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(initial.whatsappAlerts ?? true);
  const [emailAlerts, setEmailAlerts] = useState(initial.emailAlerts ?? true);
  const [attendanceAlerts, setAttendanceAlerts] = useState(initial.attendanceAlerts ?? true);
  const [feeReminders, setFeeReminders] = useState(initial.feeReminders ?? true);
  const [examAlerts, setExamAlerts] = useState(initial.examAlerts ?? true);
  const [language, setLanguage] = useState(initial.language || "English");

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (parentUser?.id) {
      const s = getStoredSettings(parentUser.id);
      setSmsAlerts(s.smsAlerts ?? true);
      setWhatsappAlerts(s.whatsappAlerts ?? true);
      setEmailAlerts(s.emailAlerts ?? true);
      setAttendanceAlerts(s.attendanceAlerts ?? true);
      setFeeReminders(s.feeReminders ?? true);
      setExamAlerts(s.examAlerts ?? true);
      setLanguage(s.language || "English");
    }
  }, [parentUser?.id]);

  const handleSaveSettings = () => {
    saveStoredSettings(
      {
        smsAlerts,
        whatsappAlerts,
        emailAlerts,
        attendanceAlerts,
        feeReminders,
        examAlerts,
        language,
      },
      parentUser?.id
    );
    setToastMessage("Parent preferences saved successfully!");
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      alert("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("New password and confirm password do not match.");
      return;
    }
    if (newPassword.length < 6) {
      alert("New password must be at least 6 characters.");
      return;
    }

    if (parentUser?.id) {
      const currentSaved = getStoredParentPassword(parentUser.id);
      if (currentSaved && oldPassword !== currentSaved) {
        alert("The current password entered is incorrect.");
        return;
      }
      saveStoredParentPassword(parentUser.id, newPassword);
    }

    setPasswordModalOpen(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setToastMessage("Password changed successfully for parent account!");
  };

  return (
    <DashboardLayout
      title="Settings"
      subtitle="Notification channels, security credentials, and account preferences"
      breadcrumb={["Parent Portal", "Settings"]}
      actions={
        <button type="button" className="cms-btn cms-btn-primary cms-btn-sm" onClick={handleSaveSettings}>
          <Save size={14} /> Save Preferences
        </button>
      }
    >
      <div className="parent-dashboard-wrapper">
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />

        {/* Notification Preferences */}
        <div className="parent-card">
          <div className="parent-card-header">
            <h3 className="parent-card-title">
              <Bell size={18} /> Alert & Notification Channels
            </h3>
          </div>
          <div className="parent-card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "SMS Alerts", desc: "Receive immediate SMS on registered mobile for daily attendance and critical notices", val: smsAlerts, set: setSmsAlerts },
              { label: "WhatsApp Updates", desc: "Get report card memos, fee receipts, and circulars directly on WhatsApp", val: whatsappAlerts, set: setWhatsappAlerts },
              { label: "Email Summaries", desc: "Weekly academic performance digest and monthly attendance report", val: emailAlerts, set: setEmailAlerts },
              { label: "Daily Absence Alerts", desc: "Immediate notification if student is marked absent during morning roll call", val: attendanceAlerts, set: setAttendanceAlerts },
              { label: "Fee Due Reminders", desc: "Advance reminders 7 days and 3 days before installment due dates", val: feeReminders, set: setFeeReminders },
              { label: "Exam & Result Alerts", desc: "Instant notifications for timetable publishing and semester result memos", val: examAlerts, set: setExamAlerts },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "var(--cms-bg)",
                  borderRadius: 10,
                  border: "1px solid var(--cms-border)",
                }}
              >
                <div>
                  <strong style={{ fontSize: 14, display: "block" }}>{item.label}</strong>
                  <span style={{ fontSize: 12.5, color: "var(--cms-muted)" }}>{item.desc}</span>
                </div>
                <label className="cms-check" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={item.val}
                    onChange={(e) => item.set(e.target.checked)}
                  />
                  <span></span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Account Security */}
        <div className="parent-card">
          <div className="parent-card-header">
            <h3 className="parent-card-title">
              <Lock size={18} /> Account Security & Password
            </h3>
          </div>
          <div className="parent-card-body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <strong style={{ fontSize: 14.5, display: "block", marginBottom: 2 }}>Change Parent Login Password</strong>
              <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>
                Keep your account secure with a strong password of at least 6 characters.
              </span>
            </div>
            <button
              type="button"
              className="cms-btn cms-btn-outline"
              onClick={() => setPasswordModalOpen(true)}
            >
              <Lock size={14} /> Update Password
            </button>
          </div>
        </div>

        {/* Regional Preferences */}
        <div className="parent-card">
          <div className="parent-card-header">
            <h3 className="parent-card-title">
              <Globe size={18} /> Regional & Language Preferences
            </h3>
          </div>
          <div className="parent-card-body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <strong style={{ fontSize: 14, display: "block" }}>Preferred Portal Language</strong>
              <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>Language for circulars and notifications</span>
            </div>
            <select
              className="cms-select"
              style={{ width: 180 }}
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                setToastMessage(`Language set to ${e.target.value}`);
              }}
            >
              <option value="English">English</option>
              <option value="Telugu">Telugu (తెలుగు)</option>
              <option value="Hindi">Hindi (हिंदी)</option>
            </select>
          </div>
        </div>

        {/* Change Password Modal */}
        {passwordModalOpen && (
          <Modal
            title="Change Account Password"
            onClose={() => setPasswordModalOpen(false)}
            size="md"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={() => setPasswordModalOpen(false)}>Cancel</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={handleChangePassword}>
                  Save Password
                </button>
              </>
            }
          >
            <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="cms-label" htmlFor="old-pass">Current Password *</label>
                <input
                  id="old-pass"
                  type="password"
                  className="cms-input"
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="cms-label" htmlFor="new-pass">New Password *</label>
                <input
                  id="new-pass"
                  type="password"
                  className="cms-input"
                  placeholder="Enter new password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="cms-label" htmlFor="conf-pass">Confirm New Password *</label>
                <input
                  id="conf-pass"
                  type="password"
                  className="cms-input"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </form>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}

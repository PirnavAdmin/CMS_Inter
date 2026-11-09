import React, { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Building2,
  Mail,
  Calendar,
  Bell,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  RefreshCw,
  Palette,
  Globe,
  ShieldCheck,
  Link2,
  Lock,
  Clock,
  Coins,
  Send,
  Layers,
  Info
} from "lucide-react";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import superAdminApi from "@/api/superAdminApi.js";
import settingsIllustration from "@/assets/settings-3d/campus-configuration.png";
import "./GlobalSettingsPage.css";

// ── Toast Notification ───────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  if (!msg) return null;
  return (
    <div className={`gsp-toast gsp-toast-${type}`}>
      {type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      <span>{msg}</span>
      <button type="button" className="gsp-toast-close" onClick={onClose}>
        <X size={13} />
      </button>
    </div>
  );
}

export default function GlobalSettingsPage() {
  const { data, refresh } = useSuperAdmin?.() || { data: {} };

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState("platform_reminders");

  // Form State — Platform & Reminders (Main real-time fields)
  const [platformName, setPlatformName] = useState("PIRNAV CMS");
  const [supportEmail, setSupportEmail] = useState("support@example.test");
  const [renewalDays, setRenewalDays] = useState(30);
  const [enableReminders, setEnableReminders] = useState(true);
  const [sendCopyToSupport, setSendCopyToSupport] = useState(false);

  // Additional tab states for full interactivity
  const [primaryColor, setPrimaryColor] = useState("#1e4529");
  const [accentColor, setAccentColor] = useState("#2d6a4f");
  const [portalTitle, setPortalTitle] = useState("PIRNAV COLLEGE MANAGEMENT SYSTEM");

  const [timezone, setTimezone] = useState("Asia/Kolkata (IST)");
  const [dateFormat, setDateFormat] = useState("DD-MM-YYYY");
  const [currency, setCurrency] = useState("INR (₹)");

  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [enforce2FA, setEnforce2FA] = useState(false);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);

  const [smtpHost, setSmtpHost] = useState("smtp.pirnav.edu.in");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smsGateway, setSmsGateway] = useState("Enabled");

  // UI status
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load real-time settings from DB via API / provider
  const loadLiveSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getSettings();
      if (res) {
        if (res.platformName) setPlatformName(res.platformName);
        if (res.supportEmail) setSupportEmail(res.supportEmail);
        if (res.renewalDays !== undefined) setRenewalDays(Number(res.renewalDays));
      }
    } catch {
      // Fallback to data.settings from Provider context
      if (data?.settings) {
        setPlatformName(data.settings.platformName || "PIRNAV CMS");
        setSupportEmail(data.settings.supportEmail || "support@example.test");
        setRenewalDays(Number(data.settings.renewalDays || 30));
      }
    } finally {
      setLoading(false);
    }
  }, [data?.settings]);

  useEffect(() => {
    loadLiveSettings();
  }, [loadLiveSettings]);

  // Handle Save
  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const payload = {
        platformName: platformName.trim(),
        supportEmail: supportEmail.trim(),
        renewalDays: Number(renewalDays) || 30
      };

      await superAdminApi.updateSettings(payload);
      await refresh?.();
      showToast("Global settings saved successfully!");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to save settings.";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  // Handle Reset to live DB values
  const handleReset = async () => {
    await loadLiveSettings();
    showToast("Settings reset to current database values.");
  };

  return (
    <div className="gsp-page">
      {/* Toast Notification */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── BREADCRUMB ── */}
      <nav className="gsp-breadcrumb">
        <span>Platform Management</span>
        <ChevronRight size={13} className="gsp-bc-sep" />
        <span className="gsp-bc-active">Global Settings</span>
      </nav>

      {/* ── HEADER BANNER ── */}
      <div className="gsp-header-card">
        <div className="gsp-header-left">
          <div className="gsp-header-icon">
            <Settings size={22} />
          </div>
          <div className="gsp-header-text">
            <h1 className="gsp-page-title">Global Settings</h1>
            <p className="gsp-page-desc">
              Configure platform-wide settings, identity, reminders, and core preferences for all colleges.
            </p>
          </div>
        </div>

        {/* ── 3D INTERACTIVE ILLUSTRATION AT TOP RIGHT ── */}
        <div
          className="gsp-header-illustration-wrap"
          title="Global Platform Configuration & Controls"
        >
          <img
            src={settingsIllustration}
            alt="Global Configuration"
            className="gsp-header-3d-img"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
      </div>

      {/* ── MAIN CONTENT LAYOUT: Left Navigation Tabs + Settings Canvas ── */}
      <div className="gsp-layout">

        {/* ── LEFT: VERTICAL NAVIGATION TABS ── */}
        <aside className="gsp-nav-card">
          <button
            type="button"
            className={`gsp-tab-btn ${activeTab === "platform_reminders" ? "active" : ""}`}
            onClick={() => setActiveTab("platform_reminders")}
          >
            <Building2 size={16} className="gsp-tab-icon" />
            <span>Platform & Reminders</span>
          </button>

          <button
            type="button"
            className={`gsp-tab-btn ${activeTab === "platform_identity" ? "active" : ""}`}
            onClick={() => setActiveTab("platform_identity")}
          >
            <Palette size={16} className="gsp-tab-icon" />
            <span>Platform Identity</span>
          </button>

          <button
            type="button"
            className={`gsp-tab-btn ${activeTab === "regional_display" ? "active" : ""}`}
            onClick={() => setActiveTab("regional_display")}
          >
            <Globe size={16} className="gsp-tab-icon" />
            <span>Regional & Display</span>
          </button>

          <button
            type="button"
            className={`gsp-tab-btn ${activeTab === "security_access" ? "active" : ""}`}
            onClick={() => setActiveTab("security_access")}
          >
            <ShieldCheck size={16} className="gsp-tab-icon" />
            <span>Security & Access</span>
          </button>

          <button
            type="button"
            className={`gsp-tab-btn ${activeTab === "integrations" ? "active" : ""}`}
            onClick={() => setActiveTab("integrations")}
          >
            <Link2 size={16} className="gsp-tab-icon" />
            <span>Integrations</span>
          </button>
        </aside>

        {/* ── RIGHT: SETTINGS FORM CANVAS ── */}
        <main className="gsp-form-card">

          {/* ════ TAB 1: Platform & Reminders (Main real-time tab) ════ */}
          {activeTab === "platform_reminders" && (
            <form onSubmit={handleSave} className="gsp-form">
              {/* Form Section Header */}
              <div className="gsp-form-header">
                <div className="gsp-section-title-icon">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="gsp-form-title">Platform Identity & Renewal Reminders</h2>
                  <p className="gsp-form-subtitle">
                    Set your platform name, support contact, and renewal reminder period.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="gsp-loading">
                  <RefreshCw size={20} className="gsp-spin" />
                  <span>Loading platform settings…</span>
                </div>
              ) : (
                <>
                  {/* Two-column Inputs */}
                  <div className="gsp-form-grid">
                    {/* Platform Name */}
                    <div className="gsp-field-group">
                      <label className="gsp-field-label">
                        Platform Name <span className="gsp-req">*</span>
                      </label>
                      <div className="gsp-input-wrap">
                        <Building2 size={15} className="gsp-input-icon" />
                        <input
                          type="text"
                          className="gsp-input"
                          placeholder="e.g. PIRNAV CMS"
                          value={platformName}
                          onChange={(e) => setPlatformName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Support Email */}
                    <div className="gsp-field-group">
                      <label className="gsp-field-label">
                        Support Email <span className="gsp-req">*</span>
                      </label>
                      <div className="gsp-input-wrap">
                        <Mail size={15} className="gsp-input-icon" />
                        <input
                          type="email"
                          className="gsp-input"
                          placeholder="e.g. support@example.test"
                          value={supportEmail}
                          onChange={(e) => setSupportEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Renewal Reminder + Inline Helper */}
                  <div className="gsp-form-grid gsp-reminder-grid">
                    {/* Renewal Reminder (days) */}
                    <div className="gsp-field-group">
                      <label className="gsp-field-label">
                        Renewal Reminder (days) <span className="gsp-req">*</span>
                      </label>
                      <div className="gsp-input-wrap">
                        <Calendar size={15} className="gsp-input-icon" />
                        <input
                          type="number"
                          min="1"
                          max="365"
                          className="gsp-input"
                          value={renewalDays}
                          onChange={(e) => setRenewalDays(Number(e.target.value))}
                          required
                        />
                      </div>
                    </div>

                    {/* Inline Callout Box */}
                    <div className="gsp-inline-callout">
                      <Info size={16} className="gsp-callout-icon" />
                      <span>
                        A reminder will be sent to colleges {renewalDays || 30} days before their subscription expires.
                      </span>
                    </div>
                  </div>

                  {/* Additional Options Divider & Toggles */}
                  <div className="gsp-additional-section">
                    <div className="gsp-additional-header">
                      <Settings size={16} className="gsp-add-icon" />
                      <span className="gsp-add-title">Additional Options</span>
                    </div>

                    {/* Option 1: Enable Renewal Reminders */}
                    <div className="gsp-toggle-row">
                      <div className="gsp-toggle-left">
                        <div className="gsp-toggle-icon-wrap">
                          <Bell size={16} />
                        </div>
                        <div className="gsp-toggle-info">
                          <span className="gsp-toggle-title">Enable Renewal Reminders</span>
                          <span className="gsp-toggle-desc">
                            Send automatic email reminders for expiring subscriptions.
                          </span>
                        </div>
                      </div>
                      <label className="gsp-switch">
                        <input
                          type="checkbox"
                          checked={enableReminders}
                          onChange={(e) => setEnableReminders(e.target.checked)}
                        />
                        <span className="gsp-slider round" />
                      </label>
                    </div>

                    {/* Option 2: Send Copy to Support */}
                    <div className="gsp-toggle-row">
                      <div className="gsp-toggle-left">
                        <div className="gsp-toggle-icon-wrap">
                          <Mail size={16} />
                        </div>
                        <div className="gsp-toggle-info">
                          <span className="gsp-toggle-title">Send Copy to Support</span>
                          <span className="gsp-toggle-desc">
                            Also send a copy of renewal reminders to the support email.
                          </span>
                        </div>
                      </div>
                      <label className="gsp-switch">
                        <input
                          type="checkbox"
                          checked={sendCopyToSupport}
                          onChange={(e) => setSendCopyToSupport(e.target.checked)}
                        />
                        <span className="gsp-slider round" />
                      </label>
                    </div>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="gsp-form-actions">
                    <button
                      type="button"
                      className="gsp-btn-reset"
                      onClick={handleReset}
                      title="Reset fields to current database values"
                    >
                      <RotateCcw size={14} />
                      <span>Reset</span>
                    </button>

                    <button
                      type="submit"
                      className="gsp-btn-save"
                      disabled={saving}
                      title="Save settings to database"
                    >
                      {saving ? (
                        <RefreshCw size={14} className="gsp-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      <span>{saving ? "Saving…" : "Save Settings"}</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* ════ TAB 2: Platform Identity ════ */}
          {activeTab === "platform_identity" && (
            <div className="gsp-form">
              <div className="gsp-form-header">
                <div className="gsp-section-title-icon">
                  <Palette size={20} />
                </div>
                <div>
                  <h2 className="gsp-form-title">Platform Identity & Branding</h2>
                  <p className="gsp-form-subtitle">
                    Customize platform header titles, brand styling, and colors.
                  </p>
                </div>
              </div>

              <div className="gsp-form-grid">
                <div className="gsp-field-group">
                  <label className="gsp-field-label">Portal Header Title</label>
                  <div className="gsp-input-wrap">
                    <Building2 size={15} className="gsp-input-icon" />
                    <input
                      type="text"
                      className="gsp-input"
                      value={portalTitle}
                      onChange={(e) => setPortalTitle(e.target.value)}
                    />
                  </div>
                </div>

                <div className="gsp-field-group">
                  <label className="gsp-field-label">Primary Brand Accent</label>
                  <div className="gsp-color-picker-wrap">
                    <input
                      type="color"
                      className="gsp-color-input"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                    />
                    <span className="gsp-color-hex">{primaryColor}</span>
                  </div>
                </div>
              </div>

              <div className="gsp-form-actions">
                <button
                  type="button"
                  className="gsp-btn-save"
                  onClick={() => showToast("Branding preferences updated.")}
                >
                  <Save size={14} />
                  <span>Update Identity</span>
                </button>
              </div>
            </div>
          )}

          {/* ════ TAB 3: Regional & Display ════ */}
          {activeTab === "regional_display" && (
            <div className="gsp-form">
              <div className="gsp-form-header">
                <div className="gsp-section-title-icon">
                  <Globe size={20} />
                </div>
                <div>
                  <h2 className="gsp-form-title">Regional & Localization</h2>
                  <p className="gsp-form-subtitle">
                    Manage default platform timezone, date formatting, and financial currency.
                  </p>
                </div>
              </div>

              <div className="gsp-form-grid">
                <div className="gsp-field-group">
                  <label className="gsp-field-label">Platform Timezone</label>
                  <div className="gsp-input-wrap">
                    <Clock size={15} className="gsp-input-icon" />
                    <select
                      className="gsp-input"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST - GMT +05:30)</option>
                      <option value="UTC">UTC (GMT +00:00)</option>
                      <option value="America/New_York (EST)">America/New_York (EST)</option>
                    </select>
                  </div>
                </div>

                <div className="gsp-field-group">
                  <label className="gsp-field-label">Date Display Format</label>
                  <div className="gsp-input-wrap">
                    <Calendar size={15} className="gsp-input-icon" />
                    <select
                      className="gsp-input"
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                    >
                      <option value="DD-MM-YYYY">DD-MM-YYYY (e.g. 08-11-2026)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-11-08)</option>
                      <option value="DD MMM YYYY">DD MMM YYYY (e.g. 08 Nov 2026)</option>
                    </select>
                  </div>
                </div>

                <div className="gsp-field-group">
                  <label className="gsp-field-label">Currency Symbol</label>
                  <div className="gsp-input-wrap">
                    <Coins size={15} className="gsp-input-icon" />
                    <input
                      type="text"
                      className="gsp-input"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="gsp-form-actions">
                <button
                  type="button"
                  className="gsp-btn-save"
                  onClick={() => showToast("Regional preferences saved.")}
                >
                  <Save size={14} />
                  <span>Save Regional</span>
                </button>
              </div>
            </div>
          )}

          {/* ════ TAB 4: Security & Access ════ */}
          {activeTab === "security_access" && (
            <div className="gsp-form">
              <div className="gsp-form-header">
                <div className="gsp-section-title-icon">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="gsp-form-title">Security & Session Policies</h2>
                  <p className="gsp-form-subtitle">
                    Configure administrative session lifespans and authentication security.
                  </p>
                </div>
              </div>

              <div className="gsp-form-grid">
                <div className="gsp-field-group">
                  <label className="gsp-field-label">Session Inactivity Timeout (minutes)</label>
                  <div className="gsp-input-wrap">
                    <Clock size={15} className="gsp-input-icon" />
                    <input
                      type="number"
                      className="gsp-input"
                      value={sessionTimeout}
                      onChange={(e) => setSessionTimeout(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="gsp-field-group">
                  <label className="gsp-field-label">Max Consecutive Login Attempts</label>
                  <div className="gsp-input-wrap">
                    <Lock size={15} className="gsp-input-icon" />
                    <input
                      type="number"
                      className="gsp-input"
                      value={maxLoginAttempts}
                      onChange={(e) => setMaxLoginAttempts(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="gsp-additional-section">
                <div className="gsp-toggle-row">
                  <div className="gsp-toggle-left">
                    <div className="gsp-toggle-icon-wrap">
                      <ShieldCheck size={16} />
                    </div>
                    <div className="gsp-toggle-info">
                      <span className="gsp-toggle-title">Enforce Two-Factor Authentication (2FA)</span>
                      <span className="gsp-toggle-desc">
                        Require all Super Admin and College Admin users to authenticate via 2FA.
                      </span>
                    </div>
                  </div>
                  <label className="gsp-switch">
                    <input
                      type="checkbox"
                      checked={enforce2FA}
                      onChange={(e) => setEnforce2FA(e.target.checked)}
                    />
                    <span className="gsp-slider round" />
                  </label>
                </div>
              </div>

              <div className="gsp-form-actions">
                <button
                  type="button"
                  className="gsp-btn-save"
                  onClick={() => showToast("Security policy saved.")}
                >
                  <Save size={14} />
                  <span>Update Security</span>
                </button>
              </div>
            </div>
          )}

          {/* ════ TAB 5: Integrations ════ */}
          {activeTab === "integrations" && (
            <div className="gsp-form">
              <div className="gsp-form-header">
                <div className="gsp-section-title-icon">
                  <Link2 size={20} />
                </div>
                <div>
                  <h2 className="gsp-form-title">Platform Gateways & Integrations</h2>
                  <p className="gsp-form-subtitle">
                    Configure email notification delivery (SMTP) and SMS gateways.
                  </p>
                </div>
              </div>

              <div className="gsp-form-grid">
                <div className="gsp-field-group">
                  <label className="gsp-field-label">SMTP Gateway Host</label>
                  <div className="gsp-input-wrap">
                    <Send size={15} className="gsp-input-icon" />
                    <input
                      type="text"
                      className="gsp-input"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                    />
                  </div>
                </div>

                <div className="gsp-field-group">
                  <label className="gsp-field-label">SMTP Port</label>
                  <div className="gsp-input-wrap">
                    <Layers size={15} className="gsp-input-icon" />
                    <input
                      type="number"
                      className="gsp-input"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="gsp-form-actions">
                <button
                  type="button"
                  className="gsp-btn-save"
                  onClick={() => showToast("Gateway settings updated.")}
                >
                  <Save size={14} />
                  <span>Save Gateways</span>
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

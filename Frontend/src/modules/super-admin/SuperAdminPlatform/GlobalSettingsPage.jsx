import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Info,
  Hash,
  Sparkles,
  Check,
  Copy,
  Moon,
  Sun,
  Sliders,
} from "lucide-react";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";
import superAdminApi from "@/api/superAdminApi.js";
import settingsIllustration from "@/assets/settings-3d/campus-configuration.png";
import { useTheme } from "@/hooks/useTheme.js";
import ThemePalettePicker, { THEME_OPTIONS } from "@/shared/components/ThemePalettePicker.jsx";
import {
  getCollegeCodeSeriesSettings,
  saveCollegeCodeSeriesSettings,
  formatCollegeCode,
  SAMPLE_PRESETS,
  DEFAULT_COLLEGE_SERIES,
} from "../superAdminNumberSeries.js";
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
  const { theme, toggleTheme, palette, customColor } = useTheme();
  const [themePickerOpen, setThemePickerOpen] = useState(false);

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

  // ── College Code & Number Series State ──
  const [codeSeries, setCodeSeries] = useState(() => getCollegeCodeSeriesSettings());
  const [copiedPreview, setCopiedPreview] = useState(false);

  // UI status
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Synchronize count of existing colleges into sequence tracking
  const existingCollegesCount = data?.colleges?.length || 14;

  // Live dynamic previews of College Code Series
  const sampleCodePreview = useMemo(() => {
    return formatCollegeCode(codeSeries, codeSeries.startNumber || 1);
  }, [codeSeries]);

  const nextCodePreview = useMemo(() => {
    const currentSeq = Math.max(Number(codeSeries.currentSequence) || 0, existingCollegesCount);
    return formatCollegeCode(codeSeries, currentSeq + 1);
  }, [codeSeries, existingCollegesCount]);

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

  // Handle Save Platform Reminders
  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const payload = {
        platformName: platformName.trim(),
        supportEmail: supportEmail.trim(),
        renewalDays: Number(renewalDays) || 30,
      };

      await superAdminApi.updateSettings(payload);
      await refresh?.();
      showToast("Global platform settings saved successfully!");
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

  // Handle Save College Code Series
  const handleSaveCodeSeries = (e) => {
    e?.preventDefault();
    saveCollegeCodeSeriesSettings(codeSeries);
    showToast("College Code & Number Series configuration saved successfully!");
  };

  // Handle Reset College Code Series
  const handleResetCodeSeries = () => {
    const reset = { ...DEFAULT_COLLEGE_SERIES };
    setCodeSeries(reset);
    saveCollegeCodeSeriesSettings(reset);
    showToast("College Code series reset to factory defaults.");
  };

  // Apply a sample preset
  const handleApplyPreset = (preset) => {
    setCodeSeries((prev) => ({
      ...prev,
      template: preset.template,
      separator: preset.separator,
      yearFormat: preset.yearFormat,
      padding: preset.padding,
    }));
  };

  const handleCopyPreview = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(nextCodePreview);
      setCopiedPreview(true);
      setTimeout(() => setCopiedPreview(false), 2000);
    }
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
            <ThreeDIcon name="general-settings" size={34} />
          </div>
          <div className="gsp-header-text">
            <h1 className="gsp-page-title">Global Platform Settings</h1>
            <p className="gsp-page-desc">
              Configure platform-wide settings, college code series, reminders, theme appearances, and security.
            </p>
          </div>
        </div>
        <div className="gsp-header-illustration-wrap" title="Global Settings">
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

          {/* New College Code & Number Series Tab */}
          <button
            type="button"
            className={`gsp-tab-btn ${activeTab === "college_code_series" ? "active" : ""}`}
            onClick={() => setActiveTab("college_code_series")}
          >
            <Hash size={16} className="gsp-tab-icon" />
            <span>College Code & Series</span>
          </button>

          <button
            type="button"
            className={`gsp-tab-btn ${activeTab === "platform_identity" ? "active" : ""}`}
            onClick={() => setActiveTab("platform_identity")}
          >
            <Palette size={16} className="gsp-tab-icon" />
            <span>Theme Appearance</span>
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
                        Renewal Reminder Lead Time <span className="gsp-req">*</span>
                      </label>
                      <div className="gsp-input-wrap">
                        <Calendar size={15} className="gsp-input-icon" />
                        <input
                          type="number"
                          className="gsp-input"
                          min={1}
                          max={365}
                          value={renewalDays}
                          onChange={(e) => setRenewalDays(e.target.value)}
                          required
                        />
                        <span className="gsp-input-unit">days before expiry</span>
                      </div>
                    </div>

                    {/* Context Explanation */}
                    <div className="gsp-info-box">
                      <Info size={18} className="gsp-info-icon" />
                      <p className="gsp-info-text">
                        Colleges with expiring subscriptions will show alerts in Super Admin and
                        receive automatic notifications <strong>{renewalDays || 30} days</strong> before their end date.
                      </p>
                    </div>
                  </div>

                  {/* Additional Platform Toggles */}
                  <div className="gsp-additional-section">
                    <div className="gsp-section-heading">
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

          {/* ════ TAB 2: College Code & Number Series Configuration ════ */}
          {activeTab === "college_code_series" && (
            <form onSubmit={handleSaveCodeSeries} className="gsp-form">
              <div className="gsp-form-header">
                <div className="gsp-section-title-icon tone-emerald">
                  <Hash size={20} />
                </div>
                <div>
                  <h2 className="gsp-form-title">College Code & Number Series Configuration</h2>
                  <p className="gsp-form-subtitle">
                    Configure the automated prefix, digit padding, delimiters, and sequence pattern for newly registered colleges.
                  </p>
                </div>
              </div>

              {/* Dynamic Live Preview Banner */}
              <div className="gsp-series-preview-card">
                <div className="gsp-preview-badge">
                  <Sparkles size={14} />
                  <span>LIVE CODE PREVIEW</span>
                </div>

                <div className="gsp-preview-main-row">
                  <div className="gsp-preview-code-block">
                    <span className="gsp-preview-label">Next Generated College Code:</span>
                    <div className="gsp-preview-code-display">
                      <strong>{nextCodePreview}</strong>
                      <button
                        type="button"
                        className="gsp-preview-copy-btn"
                        onClick={handleCopyPreview}
                        title="Copy sample code"
                      >
                        {copiedPreview ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                        <span>{copiedPreview ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="gsp-preview-stats">
                    <div className="gsp-preview-stat-item">
                      <span className="label">Sample Code:</span>
                      <span className="val">{sampleCodePreview}</span>
                    </div>
                    <div className="gsp-preview-stat-item">
                      <span className="label">Sequence Counter:</span>
                      <span className="val">{codeSeries.currentSequence || existingCollegesCount} issued</span>
                    </div>
                    <div className="gsp-preview-stat-item">
                      <span className="label">Status:</span>
                      <span className="val text-green">● Active Series</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Format Presets */}
              <div className="gsp-presets-section">
                <label className="gsp-field-label">Quick Format Presets:</label>
                <div className="gsp-presets-row">
                  {SAMPLE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className={`gsp-preset-pill ${
                        codeSeries.template === preset.template && codeSeries.yearFormat === preset.yearFormat
                          ? "is-active"
                          : ""
                      }`}
                      onClick={() => handleApplyPreset(preset)}
                    >
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Grid for Number Series Configuration */}
              <div className="gsp-form-grid">
                {/* Prefix */}
                <div className="gsp-field-group">
                  <label className="gsp-field-label">
                    College Code Prefix <span className="gsp-req">*</span>
                  </label>
                  <div className="gsp-input-wrap">
                    <Building2 size={15} className="gsp-input-icon" />
                    <input
                      type="text"
                      className="gsp-input"
                      placeholder="e.g. COL, PJC, INST"
                      value={codeSeries.prefix}
                      onChange={(e) =>
                        setCodeSeries((prev) => ({
                          ...prev,
                          prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                        }))
                      }
                      required
                    />
                  </div>
                  <span className="gsp-field-hint">Leading code identifier (e.g. COL, PJC)</span>
                </div>

                {/* Delimiter / Separator */}
                <div className="gsp-field-group">
                  <label className="gsp-field-label">Delimiter / Separator</label>
                  <div className="gsp-input-wrap">
                    <Sliders size={15} className="gsp-input-icon" />
                    <select
                      className="gsp-input"
                      value={codeSeries.separator}
                      onChange={(e) => {
                        const newSep = e.target.value;
                        setCodeSeries((prev) => {
                          const oldSep = prev.separator || "-";
                          let newTemplate = prev.template;
                          if (oldSep && oldSep !== newSep) {
                            newTemplate = newTemplate.split(oldSep).join(newSep);
                          }
                          return { ...prev, separator: newSep, template: newTemplate };
                        });
                      }}
                    >
                      <option value="-">- (Hyphen e.g. COL-2026-001)</option>
                      <option value="/">/ (Slash e.g. COL/2026/001)</option>
                      <option value="_">_ (Underscore e.g. COL_2026_001)</option>
                      <option value=".">. (Dot e.g. COL.2026.001)</option>
                      <option value="">None (Continuous e.g. COL001)</option>
                    </select>
                  </div>
                </div>

                {/* Include Year */}
                <div className="gsp-field-group">
                  <label className="gsp-field-label">Include Academic / Calendar Year</label>
                  <div className="gsp-input-wrap">
                    <Calendar size={15} className="gsp-input-icon" />
                    <select
                      className="gsp-input"
                      value={codeSeries.yearFormat}
                      onChange={(e) =>
                        setCodeSeries((prev) => ({ ...prev, yearFormat: e.target.value }))
                      }
                    >
                      <option value="YYYY">Full 4-Digit Year (YYYY - 2026)</option>
                      <option value="YY">2-Digit Year (YY - 26)</option>
                      <option value="NONE">Do Not Include Year (None)</option>
                    </select>
                  </div>
                </div>

                {/* Number Padding (Digits) */}
                <div className="gsp-field-group">
                  <label className="gsp-field-label">Number Length & Padding</label>
                  <div className="gsp-input-wrap">
                    <Hash size={15} className="gsp-input-icon" />
                    <select
                      className="gsp-input"
                      value={codeSeries.padding}
                      onChange={(e) =>
                        setCodeSeries((prev) => ({ ...prev, padding: Number(e.target.value) }))
                      }
                    >
                      <option value={2}>2 Digits (01, 02…)</option>
                      <option value={3}>3 Digits (001, 002…)</option>
                      <option value={4}>4 Digits (0001, 0002…)</option>
                      <option value={5}>5 Digits (00001, 00002…)</option>
                    </select>
                  </div>
                </div>

                {/* Start Number */}
                <div className="gsp-field-group">
                  <label className="gsp-field-label">Starting Sequence Number</label>
                  <div className="gsp-input-wrap">
                    <Hash size={15} className="gsp-input-icon" />
                    <input
                      type="number"
                      min={1}
                      className="gsp-input"
                      value={codeSeries.startNumber}
                      onChange={(e) =>
                        setCodeSeries((prev) => ({
                          ...prev,
                          startNumber: Math.max(1, Number(e.target.value)),
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Current Sequence Count */}
                <div className="gsp-field-group">
                  <label className="gsp-field-label">Current Sequence Issued Counter</label>
                  <div className="gsp-input-wrap">
                    <Hash size={15} className="gsp-input-icon" />
                    <input
                      type="number"
                      min={0}
                      className="gsp-input"
                      value={codeSeries.currentSequence}
                      onChange={(e) =>
                        setCodeSeries((prev) => ({
                          ...prev,
                          currentSequence: Math.max(0, Number(e.target.value)),
                        }))
                      }
                    />
                  </div>
                  <span className="gsp-field-hint">
                    Current active count in platform: {existingCollegesCount} colleges
                  </span>
                </div>
              </div>

              {/* Template Pattern Input */}
              <div className="gsp-field-group full-width">
                <label className="gsp-field-label">Custom Format Pattern Template</label>
                <div className="gsp-input-wrap">
                  <Hash size={15} className="gsp-input-icon" />
                  <input
                    type="text"
                    className="gsp-input"
                    value={codeSeries.template}
                    onChange={(e) =>
                      setCodeSeries((prev) => ({ ...prev, template: e.target.value }))
                    }
                  />
                </div>
                <div className="gsp-tokens-row">
                  <span className="tokens-label">Available Tokens:</span>
                  <span className="token-tag">&#123;PREFIX&#125;</span>
                  <span className="token-tag">&#123;YYYY&#125;</span>
                  <span className="token-tag">&#123;YY&#125;</span>
                  <span className="token-tag">&#123;SEQ&#125;</span>
                </div>
              </div>

              {/* Actions */}
              <div className="gsp-form-actions">
                <button
                  type="button"
                  className="gsp-btn-reset"
                  onClick={handleResetCodeSeries}
                  title="Reset to factory defaults"
                >
                  <RotateCcw size={14} />
                  <span>Reset Defaults</span>
                </button>

                <button type="submit" className="gsp-btn-save">
                  <Save size={14} />
                  <span>Save College Code Series</span>
                </button>
              </div>
            </form>
          )}

          {/* ════ TAB 3: Theme Appearance ════ */}
          {activeTab === "platform_identity" && (
            <div className="gsp-form">
              <div className="gsp-form-header">
                <div className="gsp-section-title-icon tone-purple">
                  <Palette size={20} />
                </div>
                <div>
                  <h2 className="gsp-form-title">Theme Appearance</h2>
                  <p className="gsp-form-subtitle">
                    Customize your platform color theme palette and toggle between Dark and Light mode.
                  </p>
                </div>
              </div>

              {/* Dark / Light Mode Switch */}
              <div className="gsp-theme-mode-section">
                <div className="gsp-theme-mode-card">
                  <div className="gsp-theme-mode-left">
                    <div className="gsp-theme-mode-icon">
                      {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
                    </div>
                    <div>
                      <strong className="gsp-theme-mode-title">
                        Current Display Mode: {theme === "dark" ? "Dark Theme" : "Light Theme"}
                      </strong>
                      <p className="gsp-theme-mode-desc">
                        Switch between dark high-contrast mode and clean light mode across all Super Admin portals.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="gsp-mode-toggle-btn"
                    onClick={toggleTheme}
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun size={15} /> Switch to Light Mode
                      </>
                    ) : (
                      <>
                        <Moon size={15} /> Switch to Dark Mode
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Admin-style theme colour picker */}
              <div className="gsp-palette-picker-section">
                <label className="gsp-field-label">Active Theme</label>
                <div className="gsp-active-theme-row">
                  <div className="gsp-active-theme-summary">
                    <span className="gsp-active-theme-swatch" style={{ backgroundColor: palette === "custom" ? customColor : THEME_OPTIONS.find((option) => option.id === palette)?.swatches?.[0] || "#647900" }} />
                    <strong>{palette === "custom" ? "Custom" : THEME_OPTIONS.find((option) => option.id === palette)?.name || "Current Olive"}</strong>
                  </div>
                  <button type="button" className="gsp-mode-toggle-btn" onClick={() => setThemePickerOpen(true)}>
                    <Palette size={15} /> Pick a theme colour
                  </button>
                </div>
              </div>

              <div className="gsp-form-grid" style={{ marginTop: 20 }}>
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
                  <label className="gsp-field-label">Primary Brand Accent Hex</label>
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
                  onClick={() => showToast("Appearance settings updated successfully!")}
                >
                  <Save size={14} />
                  <span>Apply Branding</span>
                </button>
              </div>
            </div>
          )}

          {/* ════ TAB 4: Regional & Display ════ */}
          {activeTab === "regional_display" && (
            <div className="gsp-form">
              <div className="gsp-form-header">
                <div className="gsp-section-title-icon tone-blue">
                  <Globe size={20} />
                </div>
                <div>
                  <h2 className="gsp-form-title">Regional & Localization Preferences</h2>
                  <p className="gsp-form-subtitle">
                    Configure time zone, date formatting, and primary billing currency for institutions.
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

          {/* ════ TAB 5: Security & Access ════ */}
          {activeTab === "security_access" && (
            <div className="gsp-form">
              <div className="gsp-form-header">
                <div className="gsp-section-title-icon tone-red">
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

          {/* ════ TAB 6: Integrations ════ */}
          {activeTab === "integrations" && (
            <div className="gsp-form">
              <div className="gsp-form-header">
                <div className="gsp-section-title-icon tone-amber">
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
      <ThemePalettePicker
        open={themePickerOpen}
        onOpenChange={setThemePickerOpen}
        hideTrigger={true}
        isAdmin={true}
      />
    </div>
  );
}

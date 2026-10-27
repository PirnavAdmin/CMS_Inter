import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck, User, Lock, Bell, ArrowRight, X } from "lucide-react";
import apiClient, { getApiErrorMessage } from "../../../api/apiClient.js";
import { unwrapDriverData } from "../data/driverData.js";
import { useDriverData } from "../DriverDataContext.jsx";
import "./DriverSettingsPage.css";

const base = "/api/v1/transport/driver/settings";
const previewPreferences = { emailAttendanceAlerts: true, smsUrgentAlerts: false, tripReminders: true, autoLogoutMinutes: 30 };
const emptyPassword = { currentPassword: "", newPassword: "", confirmPassword: "" };
const preferenceFields = [
  ["emailAttendanceAlerts", "Email Attendance Alerts", "Receive daily student absent roll-call confirmation emails."],
  ["smsUrgentAlerts", "SMS Urgent Alerts", "Receive SMS for urgent administrative and exam duty notices."],
  ["tripReminders", "Timetable Slot Reminders", "Send advance 15-minute reminders before lecture commencement."],
];

export default function DriverSettingsPage() {
  const { driverProfile, refresh, applySavedPreferences } = useDriverData();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState({ fullName: "", mobile: "", personalEmail: "", address: "" });
  const [preferences, setPreferences] = useState(null);
  const [readOnlyProfile, setReadOnlyProfile] = useState({});
  const [preview, setPreview] = useState(previewPreferences);
  const displayedPreferences = preferences ?? preview;
  const updatePreference = (key, value) => {
    if (preferences) setPreferences({ ...preferences, [key]: value });
    else setPreview((previous) => ({ ...previous, [key]: value }));
  };
  const [password, setPassword] = useState(emptyPassword);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  const saveLock = useRef(false);
  const openSettings = () => {
    setReadOnlyProfile({});
    setProfile({ fullName: driverProfile.name || "", mobile: driverProfile.mobile || "", personalEmail: driverProfile.personalEmail || "", address: driverProfile.address || "" });
    setPassword(emptyPassword); setPreferences(null); setPreview(previewPreferences); setTab("profile"); setError(""); setMessage(""); setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setLoadError("");
    apiClient.get(base, { signal: controller.signal }).then(unwrapDriverData).then((data) => {
      if (controller.signal.aborted) return;
      if (data.profile) setProfile({ fullName: data.profile.fullName || "", mobile: data.profile.mobile || "", personalEmail: data.profile.personalEmail || "", address: data.profile.address || "" });
      setReadOnlyProfile(data.profile || {});
      setPreferences(data.preferences ? { ...data.preferences, autoLogoutMinutes: Number(data.preferences.autoLogoutMinutes) } : null);
      applySavedPreferences(data.preferences);
    }).catch((failure) => {
      if (!controller.signal.aborted) setLoadError(failure.response?.status === 404 ? "Driver settings are not connected on the server yet. Changes cannot be saved." : getApiErrorMessage(failure));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, applySavedPreferences]);
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    dialogRef.current?.querySelector("button")?.focus();
    const onKey = (event) => {
      if (event.key === "Escape" && !saveLock.current) { setPassword(emptyPassword); setOpen(false); }
      if (event.key === "Tab") {
        const nodes = dialogRef.current?.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)");
        const first = nodes?.[0], last = nodes?.[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); trigger?.focus(); };
  }, [open]);
  const close = () => { if (!busy) { setPassword(emptyPassword); setOpen(false); } };
  const save = async (event) => {
    event.preventDefault();
    if (saveLock.current || loading || loadError) return;
    setError(""); setMessage("");
    if (tab === "preferences" && (!preferences || ![15, 30, 60].includes(preferences.autoLogoutMinutes))) { setError("Select an inactivity duration of 15, 30, or 60 minutes."); return; }
    if (tab === "password" && (password.newPassword.length < 8 || password.newPassword !== password.confirmPassword || password.newPassword === password.currentPassword)) { setError("Use a new password of at least 8 characters and ensure both new password fields match."); return; }
    saveLock.current = true; setBusy(true);
    try {
      const endpoint = tab === "password" ? "change-password" : tab;
      const body = tab === "profile" ? { fullName: profile.fullName.trim(), mobile: profile.mobile.trim(), personalEmail: profile.personalEmail.trim(), address: profile.address.trim() } : tab === "password" ? password : { emailAttendanceAlerts: !!preferences.emailAttendanceAlerts, smsUrgentAlerts: !!preferences.smsUrgentAlerts, tripReminders: !!preferences.tripReminders, autoLogoutMinutes: preferences.autoLogoutMinutes };
      const response = tab === "password" ? await apiClient.post(`${base}/${endpoint}`, body) : await apiClient.put(`${base}/${endpoint}`, body);
      unwrapDriverData(response);
      setMessage(response.data?.message || (tab === "password" ? "Password changed successfully. Please log in again if required." : "Changes saved successfully."));
      if (tab === "preferences") applySavedPreferences(body);
      if (tab === "password") setPassword(emptyPassword);
      if (tab === "profile") await refresh();
    } catch (failure) { setError(getApiErrorMessage(failure)); }
    finally { saveLock.current = false; setBusy(false); }
  };
  return <div className="dp-page-container dp-settings">
    <div className="dp-page-header"><div><h1 className="dp-page-title">Settings</h1><p className="dp-page-subtitle">Manage your driver account, profile settings, password, and general preferences.</p></div></div>
    <section className="dp-settings-card"><h2><ShieldCheck size={30} /> General Settings</h2><p>Manage personal profile details, contact information, account password, and notification preferences.</p><button type="button" ref={triggerRef} className="dp-btn dp-btn-primary" onClick={openSettings}>Manage General Settings <ArrowRight size={16} /></button></section>
    {open && <div className="dp-modal-backdrop" onClick={close}><div ref={dialogRef} className="dp-modal-card dp-settings-modal" role="dialog" aria-modal="true" aria-labelledby="driver-settings-title" onClick={(event) => event.stopPropagation()}>
      <div className="dp-modal-header"><h2 id="driver-settings-title"><ShieldCheck size={20} /> General Settings Management</h2><button type="button" className="dp-modal-close" aria-label="Close settings" disabled={busy} onClick={close}><X size={20} /></button></div>
      <div className="dp-settings-tabs" role="tablist" aria-label="General settings">{[["profile", "Profile Settings", User], ["password", "Reset / Change Password", Lock], ["preferences", "General Preferences", Bell]].map(([id, label, Icon]) => <button key={id} type="button" role="tab" id={`driver-settings-${id}-tab`} aria-selected={tab === id} aria-controls="driver-settings-panel" className={tab === id ? "is-active" : ""} disabled={busy} onClick={() => { setTab(id); setError(""); setMessage(""); setPassword(emptyPassword); }}><Icon size={15} />{label}</button>)}</div>
      <form onSubmit={save}>
        <div className="dp-settings-body" role="tabpanel" id="driver-settings-panel" aria-labelledby={`driver-settings-${tab}-tab`}>
          {loading && <p role="status">Loading settings...</p>}{loadError && tab !== "preferences" && <p className="dp-settings-error" role="alert">{loadError}</p>}
          <fieldset disabled={busy || loading}>
          {tab === "profile" ? <div className="dp-settings-profile-grid">
            <label>Full Name<input required maxLength={150} value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} /></label>
            <label>Employee ID<input value={readOnlyProfile.employeeId ?? driverProfile.employeeId ?? ""} disabled /><small>Assigned by college administrator</small></label>
            <label>Department<input disabled value={readOnlyProfile.department ?? driverProfile.department ?? "Not available"} /></label>
            <label>Designation<input disabled value={readOnlyProfile.designation ?? driverProfile.designation ?? driverProfile.role ?? "Driver"} /></label>
            <label>Mobile Number<input type="tel" maxLength={20} value={profile.mobile} onChange={(event) => setProfile({ ...profile, mobile: event.target.value })} /></label>
            <label>Personal Email<input type="email" maxLength={254} value={profile.personalEmail} onChange={(event) => setProfile({ ...profile, personalEmail: event.target.value })} /></label>
            <label className="dp-settings-full-width">Residential Address<input maxLength={500} value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} /></label>
          </div> : tab === "password" ? <div className="dp-settings-password">
            <label>Current Password<input type="password" required autoComplete="current-password" placeholder="Enter current password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} /></label>
            <label>New Password<input type="password" required minLength={8} autoComplete="new-password" placeholder="Enter new password (min. 8 characters)" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} /><small>Use uppercase letters, numbers, and symbols for a stronger password.</small></label>
            <label>Confirm New Password<input type="password" required autoComplete="new-password" placeholder="Re-enter new password" value={password.confirmPassword} onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })} /></label>
          </div> : <div className="dp-settings-preferences">{preferenceFields.map(([key, label, description]) => <label className="dp-settings-toggle" key={key}><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={!!displayedPreferences[key]} onChange={(event) => updatePreference(key, event.target.checked)} /></label>)}<label>Auto-Logout Inactivity Duration<select value={displayedPreferences.autoLogoutMinutes ?? ""} onChange={(event) => updatePreference("autoLogoutMinutes", Number(event.target.value))}><option disabled value="">Select duration</option>{[15, 30, 60].map((value) => <option value={value} key={value}>{value} Minutes{value === 30 ? " (Recommended)" : ""}</option>)}</select></label></div>}
          </fieldset>
          {tab === "preferences" && !loading && !preferences && <p className="dp-settings-preview-note" role="status">Preview values ? settings are not available from the server. Changes cannot be saved.</p>}
          {error && <p className="dp-settings-error" role="alert">{error}</p>}{message && <p className="dp-settings-success" role="status">{message}</p>}
        </div>
        <div className="dp-modal-footer"><button type="button" className="dp-btn dp-btn-outline" disabled={busy} onClick={close}>Cancel</button><button type="submit" className="dp-btn dp-btn-primary" disabled={busy || loading || !!loadError || (tab === "preferences" && !preferences)}>{busy ? "Saving..." : tab === "profile" ? "Save Profile Changes" : tab === "password" ? "Update Password" : "Save Preferences"}</button></div>
      </form>
    </div></div>}
  </div>;
}

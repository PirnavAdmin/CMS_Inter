import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Building2, Clock, Copy, CreditCard, Eye, EyeOff, QrCode, RefreshCw, Save } from "lucide-react";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { ConfirmDialog } from "@/shared/components/Ui.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { getAuthItem, getAuthUser } from "@/modules/auth/authStorage.js";
import { useEffectivePermissions } from "@/modules/admin/AdminRolesPermissions/useEffectivePermissions.js";
import { hasRole, usePermissions } from "@/modules/admin/AdminRolesPermissions/permissionUtils.jsx";
import { getApiErrorMessage } from "@/api/axios.js";
import { getPaymentGatewayConfigApi, updatePaymentGatewayConfigApi } from "@/api/feePaymentGatewayApi.js";
import { hasPaymentReversalRole, PAYMENT_CONFIG_DEFAULTS, PAYMENT_CONFIG_SECTIONS, paymentConfigErrors, paymentConfigPayload } from "../AdminFees/services/paymentGatewaySession.js";
import "./PaymentGatewayConfigPage.css";
import PaymentTemplatesEditor from "./PaymentTemplatesEditor.jsx";

const tabs = [
  ["bank", "College Bank Account", Building2], ["upi", "Dynamic UPI QR", QrCode],
  ["razorpay", "Razorpay Gateway", CreditCard], ["advanced", "Countertop & Polling", Clock],
  ["templates", "Email & Receipt Templates", Copy],
];
const fields = {
  bank: [["bankName", "Bank Name"], ["accountHolderName", "Account Holder / Beneficiary Name"],
    ["accountNumber", "Account Number", "password"], ["confirmAccountNumber", "Confirm Account Number", "password"],
    ["ifscCode", "IFSC Code"], ["branchName", "Branch Name"], ["accountType", "Account Type", "select"]],
  upi: [["payeeVpa", "Payee VPA / UPI ID"], ["payeeName", "Payee Display Name"], ["currency", "Currency"], ["mcc", "Merchant Category Code"]],
  razorpay: [["razorpayKeyId", "Razorpay Key ID"], ["razorpayKeySecret", "Razorpay Key Secret", "password"], ["razorpayWebhookSecret", "Razorpay Webhook Secret", "password"]],
  advanced: [["pollingIntervalMs", "Polling Interval (milliseconds)", "number", 500, 10000], ["monitoringTimeoutSeconds", "Monitoring Timeout (seconds)", "number", 60, 3600], ["baseAppUrl", "Base Application URL"], ["frontendPort", "Frontend Port", "number", 1, 65535]],
};
const toggles = {
  bank: [["enableOfflineUtr", "Enable Offline Bank Transfer / UTR"]],
  upi: [["enableCounterUpiQr", "Enable Dynamic UPI QR"]],
  razorpay: [["autoCapture", "Auto-Capture Payments"], ["enableRazorpay", "Enable Razorpay"]], advanced: [],
};

export function usePaymentSettingsAccess() {
  const permissions = usePermissions();
  return hasPaymentReversalRole(permissions.user || {}, getAuthItem("role")) && permissions.canView("settings", "payment-gateway");
}

export function PaymentSettingsLink({ accountant = false, children = "Payment Settings", className = "cms-btn cms-btn-ghost" }) {
  const allowed = usePaymentSettingsAccess();
  if (!allowed) return null;
  return <Link className={className} to={accountant ? "/accountant-dashboard/settings/payment-gateway" : "/dashboard/settings/payment-gateway"}><CreditCard size={15} /> {children}</Link>;
}

function configFailure(error) {
  const status = error.response?.status;
  if (status === 404) return "Payment configuration is unavailable (404). The backend team must deploy GET and POST /api/v1/fee-payments/gateway/config. No configuration was substituted or saved.";
  if (status === 401) return "Your session is no longer authorized. Sign in again to load payment settings.";
  if (status === 403) return "The backend denied access to this campus's payment settings.";
  if (status === 409) return "The configuration changed or conflicts with another record. Refresh before saving again.";
  if (status >= 500) return "The payment configuration service failed. Refresh to check the saved state before retrying.";
  if (!status && (error.code === "ERR_NETWORK" || error.message === "Network Error")) return "The payment configuration service could not be reached. Your draft is still available on this page; saving is unavailable.";
  return getApiErrorMessage(error);
}

function maskedBankAccount(value) {
  const number = String(value || "").trim();
  if (!number) return "Not supplied";
  return number.length > 4 && /\d{4}$/.test(number) ? `XXXXXXXX${number.slice(-4)}` : "Account number hidden";
}

function CampusPaymentConfig({ campusId, campusName, editable, drafts, templateDrafts, templatesEditable = false }) {
  const retained = drafts?.get(campusId);
  const [tab, setTab] = useState("bank");
  const [form, setForm] = useState(() => retained?.form || { ...PAYMENT_CONFIG_DEFAULTS, campusId });
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [revealed, setRevealed] = useState({});
  const [message, setMessage] = useState({ error: false, text: "" });
  const [errors, setErrors] = useState({});
  const [confirmation, setConfirmation] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [bankSelected, setBankSelected] = useState(false);
  const alive = useRef(false);
  const request = useRef(null);
  const guard = useRef(false);
  const dirty = useRef(Boolean(retained));
  const editedFields = useRef(new Set(retained?.editedFields || []));
  useEffect(() => {
    if (dirty.current) drafts?.set(campusId, { form, editedFields: [...editedFields.current] });
    else drafts?.delete(campusId);
  }, [campusId, drafts, form]);
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setReady(false); setBankSelected(false);
    getPaymentGatewayConfigApi(campusId, controller.signal).then((data) => {
      if (!controller.signal.aborted) {
        // A late response or explicit refresh must not overwrite an entered draft.
        setForm((current) => ({ ...data, ...Object.fromEntries(
          [...editedFields.current].map((key) => [key, current[key]]),
        ) }));
        setSaved(data); setReady(true); setAccessDenied(false); setErrors({});
        setMessage({ error: false, text: dirty.current ? "Saved configuration loaded. Your unsaved draft has been retained."
          : !data.accountNumber && !data.bankName ? "No receiving account is saved for this campus yet." : "" });
      }
    }).catch((error) => {
      if (!controller.signal.aborted) {
        setAccessDenied([401, 403].includes(error.response?.status));
        setMessage({ error: true, text: configFailure(error) });
      }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { alive.current = false; controller.abort(); request.current?.abort(); };
  }, [campusId, refresh]);

  const update = (key, value) => {
    dirty.current = true;
    editedFields.current.add(key);
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const conditionalErrors = key === "enableCounterUpiQr"
        ? paymentConfigErrors({ ...form, enableCounterUpiQr: value }, tab) : null;
      return { ...current, [key]: "", ...(conditionalErrors ? {
        payeeVpa: current.payeeVpa ? conditionalErrors.payeeVpa || "" : "",
        payeeName: current.payeeName ? conditionalErrors.payeeName || "" : "",
      } : {}) };
    });
  };
  const validateField = (key) => setErrors((current) => ({ ...current, [key]: paymentConfigErrors(form, tab)[key] || "" }));
  const save = async () => {
    if (guard.current || !ready || !editable || !saved || Number(saved.campusId) !== Number(campusId)) return;
    const section = tab;
    const sectionKeys = PAYMENT_CONFIG_SECTIONS[section];
    const combined = { ...saved, ...Object.fromEntries(sectionKeys.map((key) => [key, form[key]])), campusId };
    // The current POST replaces bank fields, so a masked GET value cannot be replayed safely.
    if (combined.accountNumber && !/^\d{6,34}$/.test(combined.accountNumber)) {
      setMessage({ error: true, text: "The saved account number is masked or incomplete. Re-enter and confirm the full number in College Bank Account before saving, or ask the backend team to support preserving masked bank details." });
      return;
    }
    guard.current = true; setSaving(true); setConfirmation(""); setMessage({ error: false, text: "" });
    const controller = new AbortController(); request.current = controller;
    try {
      const payload = paymentConfigPayload(combined, campusId, section);
      await updatePaymentGatewayConfigApi(combined, controller.signal, section);
      if (controller.signal.aborted) return;
      const persisted = await getPaymentGatewayConfigApi(campusId, controller.signal);
      if (controller.signal.aborted) return;
      const same = Object.entries(payload).every(([key, value]) => key === "razorpayKeySecret" ? persisted.hasRazorpayKeySecret
        : key === "razorpayWebhookSecret" ? persisted.hasRazorpayWebhookSecret : String(persisted[key] ?? "") === String(value ?? ""));
      const secretsPreserved = ["hasRazorpayKeySecret", "hasRazorpayWebhookSecret"].every((flag) => !saved[flag] || persisted[flag]);
      if (!same || !secretsPreserved) throw new Error("The reloaded configuration differs from the submitted settings. Review it before trying again.");
      sectionKeys.forEach((key) => editedFields.current.delete(key));
      dirty.current = editedFields.current.size > 0;
      setRevealed({});
      setForm((current) => ({ ...persisted, ...Object.fromEntries(
        [...editedFields.current].map((key) => [key, current[key]]),
      ) }));
      setSaved(persisted); setErrors({});
      setMessage({ error: false, text: `${tabs.find(([id]) => id === section)[1]} settings saved successfully.` });
    } catch (error) {
      if (!controller.signal.aborted) {
        let text = configFailure(error);
        for (const secret of [form.razorpayKeySecret, form.razorpayWebhookSecret]) if (secret) text = text.split(secret).join("[redacted]");
        setMessage({ error: true, text });
        setAccessDenied([401, 403].includes(error.response?.status));
        setReady(false); // Do not replay an uncertain write; reload first.
      }
    } finally {
      if (alive.current && !controller.signal.aborted) {
        guard.current = false; setSaving(false);
      }
    }
  };
  const submit = (event) => {
    event.preventDefault();
    if (!ready || !editable || saving || confirmation) return;
    const invalid = paymentConfigErrors(form, tab); setErrors(invalid);
    if (Object.keys(invalid).length) {
      setMessage({ error: true, text: "Correct the highlighted fields before saving." }); return;
    }
    const accountChanged = tab === "bank" && saved && ["bankName", "accountHolderName", "accountNumber", "ifscCode", "accountType"].some((key) => form[key].trim() !== saved[key].trim());
    if (accountChanged || (tab === "razorpay" && form.isLiveMode && !saved?.isLiveMode)) {
      setConfirmation([accountChanged ? `Change the receiving bank account for ${campusName}?` : "", tab === "razorpay" && form.isLiveMode && !saved?.isLiveMode ? "Enable Live / Production mode? Subsequent gateway orders may collect real money." : ""].filter(Boolean).join(" "));
    } else save();
  };
  const copyWebhook = async () => {
    try { await navigator.clipboard.writeText(form.webhookUrl); if (alive.current) setMessage({ error: false, text: "Backend webhook URL copied. Confirm public reachability and event configuration with the backend team." }); }
    catch { if (alive.current) setMessage({ error: true, text: "Clipboard access was denied. Copy the displayed backend URL manually." }); }
  };
  let webhookValid = false;
  try {
    const url = new URL(form.webhookUrl);
    webhookValid = url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash
      && url.pathname === "/api/v1/fee-payments/gateway/webhook"
      && !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[|0\.)/i.test(url.hostname) && url.hostname.includes(".");
  } catch { /* No inferred frontend webhook URL. */ }
  const requiredFields = {
    bankName: true, accountHolderName: true, accountNumber: true, confirmAccountNumber: true,
    ifscCode: true, accountType: true,
    payeeVpa: form.enableCounterUpiQr, payeeName: form.enableCounterUpiQr,
    razorpayKeyId: form.enableRazorpay,
    razorpayKeySecret: form.enableRazorpay && !form.hasRazorpayKeySecret,
    razorpayWebhookSecret: form.enableRazorpay && !form.hasRazorpayWebhookSecret,
    pollingIntervalMs: true, monitoringTimeoutSeconds: true, frontendPort: true,
  };
  // The config API returns one object, not a bank-account list or an active-account ID.
  // Count only bank data in the successfully loaded campus configuration, never a draft.
  const bankAvailable = ready && !loading && !accessDenied && Number(saved?.campusId) === Number(campusId);
  const hasConfiguredBank = bankAvailable && Boolean(saved.bankName || saved.accountNumber || saved.accountHolderName || saved.ifscCode);
  return <section className="cms-payment-config">
    <div className="cms-payment-config-head"><div><h2>{campusName}</h2><p>Receiving accounts and payment processing · Campus {campusId}</p></div>
      <button type="button" className="cms-btn cms-btn-ghost" disabled={loading || saving || Boolean(confirmation)} onClick={() => setRefresh((value) => value + 1)}><RefreshCw size={15} /> Refresh</button></div>
    {!editable && <p role="status">Read-only: Settings edit permission is required to change this configuration.</p>}
    {message.text && <p className={message.error ? "cms-error" : "cms-payment-config-success"} role={message.error ? "alert" : "status"}>{message.text}</p>}
    {loading && <p role="status">Loading this campus's saved payment configuration…</p>}
    {editable && !accessDenied && <p className="cms-payment-config-note">Unsaved drafts stay in memory for each campus while this page is open. Switching campuses retains them; leaving or reloading the page clears them. {(!ready || loading) && "You can enter and review a draft, but Save is unavailable until this campus's configuration loads successfully."}</p>}
    <div className="cms-payment-config-tabs" role="tablist" aria-label="Payment configuration">
      {tabs.map(([id, label, Icon]) => <button key={id} id={`payment-tab-${id}`} type="button" role="tab" aria-selected={tab === id} aria-controls="payment-settings-panel" className={`cms-btn ${tab === id ? "cms-btn-primary" : "cms-btn-ghost"}`} disabled={saving || Boolean(confirmation)} onClick={() => { setTab(id); setErrors({}); }}><Icon size={15} /> {label}</button>)}
    </div>
    {tab === "bank" && <section className="cms-payment-bank-accounts" aria-labelledby="payment-bank-accounts-title">
      <div className="cms-payment-bank-summary">
        <div><h3 id="payment-bank-accounts-title">College Bank Accounts</h3><p>Configured account: <strong data-bank-account-count>{bankAvailable ? hasConfiguredBank ? 1 : 0 : "Unavailable"}</strong></p></div>
        <button type="button" className="cms-btn cms-btn-ghost" disabled aria-describedby="payment-bank-support">+ Add Bank Account</button>
      </div>
      <p id="payment-bank-support" className="cms-payment-config-note">Only one bank account is exposed by the current campus configuration API. A full account list, total saved-account count, and active-account status are not available. Adding another account or activating one requires backend support.</p>
      {!bankAvailable ? <p>Load this campus's configuration to view its saved bank details.</p>
        : !hasConfiguredBank ? <p>No bank details are configured for this campus. Use the existing form below to configure its receiving account.</p>
          : <>
            <h4>Saved Bank Account</h4>
            <label className={`cms-payment-bank-card${bankSelected ? " is-selected" : ""}`}>
              <input type="radio" name="payment-bank-view" checked={bankSelected} onChange={() => setBankSelected(true)} aria-controls="payment-bank-details" />
              <span><strong>{saved.bankName || "Bank name not supplied"}</strong><span>{saved.accountType || "Account type not supplied"} · {maskedBankAccount(saved.accountNumber)}</span><span>{saved.accountHolderName || "Beneficiary not supplied"}</span><small>Configured · Active status not supplied</small></span>
            </label>
            {bankSelected && <div id="payment-bank-details" className="cms-payment-bank-details">
              <h4>Selected Account Details</h4>
              <dl>{[["Bank", saved.bankName], ["Beneficiary", saved.accountHolderName], ["Account", maskedBankAccount(saved.accountNumber)], ["IFSC", saved.ifscCode], ["Branch", saved.branchName], ["Account Type", saved.accountType], ["Offline UTR", saved.enableOfflineUtr ? "Enabled" : "Disabled"], ["Active Receiving Account", "Not reported by the backend"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not supplied"}</dd></div>)}</dl>
              <button type="button" className="cms-btn cms-btn-ghost" disabled aria-describedby="payment-bank-support">Set as Active Receiving Account</button>
              <p className="cms-payment-config-note">Selecting this card only shows saved details. It does not change the receiving account or discard your draft.</p>
            </div>}
          </>}
      <p className="cms-payment-config-note">Changing bank details does not change the bank linked to a UPI ID or Razorpay's merchant settlement account. Those must be verified with the bank or payment provider.</p>
      <h4>{hasConfiguredBank ? "Update Configured Bank Account" : "Bank Account Form"}</h4>
    </section>}
    {tab === "templates" ? <PaymentTemplatesEditor campusId={campusId} campusName={campusName} editable={templatesEditable && !accessDenied} drafts={templateDrafts} /> : <form noValidate onSubmit={submit}>
      <fieldset disabled={saving || !editable || accessDenied || Boolean(confirmation)}>
        <div id="payment-settings-panel" role="tabpanel" aria-labelledby={`payment-tab-${tab}`}>
          {tab === "razorpay" && <div className="cms-payment-config-mode"><span>Environment</span>{[[false, "Test / Sandbox"], [true, "Live / Production"]].map(([live, label]) => <label key={label}><input type="radio" name="payment-mode" checked={form.isLiveMode === live} onChange={() => update("isLiveMode", live)} /> {label}</label>)}</div>}
          <div className="cms-payment-config-grid">
            {fields[tab].map(([key, label, type = "text", min, max]) => <div className="cms-field" key={key}>
              <label htmlFor={`payment-config-${key}`}>{label}{requiredFields[key] && <> <span className="req" aria-hidden="true">*</span></>}</label>
              {type === "select" ? <select id={`payment-config-${key}`} value={form[key]} aria-required={Boolean(requiredFields[key])} onChange={(e) => update(key, e.target.value)} onBlur={() => validateField(key)}><option>Current</option><option>Savings</option></select>
                : <span className={type === "password" ? "cms-password" : undefined}><input id={`payment-config-${key}`} type={type === "password" && revealed[key] ? "text" : type} value={form[key]} readOnly={key === "currency"} aria-required={Boolean(requiredFields[key])} maxLength={key === "currency" ? 3 : undefined} min={min} max={max} step={type === "number" ? 1 : undefined} autoComplete={type === "password" ? "new-password" : "off"} spellCheck={false} inputMode={key.includes("AccountNumber") || key === "accountNumber" ? "numeric" : undefined} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `payment-error-${key}` : key === "currency" ? "payment-currency-hint" : undefined} onBlur={() => validateField(key)} onChange={(e) => update(key, ["ifscCode", "currency"].includes(key) ? e.target.value.toUpperCase() : e.target.value)} />{type === "password" && <button type="button" className="cms-eye-btn" aria-label={`${revealed[key] ? "Hide" : "Show"} ${label}`} aria-pressed={Boolean(revealed[key])} onClick={() => setRevealed((current) => ({ ...current, [key]: !current[key] }))}>{revealed[key] ? <EyeOff size={16} /> : <Eye size={16} />}</button>}</span>}
              {key === "accountNumber" && <small>Hidden for privacy. Re-enter the same number in Confirm Account Number before saving.</small>}
              {key === "currency" && <small id="payment-currency-hint">Currently supported currency: INR (Indian Rupees).</small>}
              {key === "razorpayKeySecret" && <small>{!ready ? "Saved secret status is unavailable." : form.hasRazorpayKeySecret ? "Key secret is configured. Saved values are never displayed." : "No saved key secret."}</small>}
              {key === "razorpayWebhookSecret" && <small>{!ready ? "Saved secret status is unavailable." : form.hasRazorpayWebhookSecret ? "Webhook secret is configured. Saved values are never displayed." : "No saved webhook secret."}</small>}
              {errors[key] && <span className="cms-error" id={`payment-error-${key}`}>{errors[key]}</span>}
            </div>)}
          </div>
          {toggles[tab].map(([key, label]) => <label key={key} className="cms-payment-config-toggle"><input type="checkbox" checked={form[key]} onChange={(e) => update(key, e.target.checked)} /> {label}</label>)}
        </div>
      </fieldset>
      {tab === "razorpay" && <div className="cms-field cms-payment-config-webhook"><label htmlFor="payment-webhook">Backend Webhook URL</label><div><input id="payment-webhook" value={form.webhookUrl} readOnly placeholder="Not supplied by the backend" /><button type="button" className="cms-btn cms-btn-ghost" disabled={!ready || !webhookValid} onClick={copyWebhook}><Copy size={14} /> Copy</button></div><small>{webhookValid ? "Backend-provided HTTPS URL; public reachability and webhook registration require backend verification." : "A public HTTPS backend webhook URL is required. A frontend or LAN address cannot receive production Razorpay webhooks."}</small></div>}
      <p className="cms-payment-config-note">{tab === "bank" ? "One receiving account per campus. Bank details do not change Razorpay's onboarded merchant settlement account. UTR payments require reconciliation."
        : tab === "upi" ? "Displaying or scanning a QR never confirms payment. The backend must verify settlement before updating fees. Note: If Razorpay Gateway is also enabled with valid keys for this campus, UPI QR orders route through Razorpay's Merchant Account (auto-settlement) instead of the Payee VPA above."
          : tab === "razorpay" ? "Leave stored secrets blank to preserve them. Enter a replacement only when changing credentials; saved secrets are never displayed."
            : "These settings do not change the Vite proxy, API base URL or workstation network. Mobile checkout and backend LAN resolution must be supported separately."}</p>
      <div className="cms-payment-config-actions"><button type="submit" className="cms-btn cms-btn-primary" disabled={!ready || !editable || loading || saving || Boolean(confirmation)}><Save size={15} /> {saving ? "Saving and verifying…" : "Save Settings"}</button></div>
    </form>}
    {confirmation && <ConfirmDialog title="Confirm payment settings" message={confirmation} confirmLabel="Confirm & Save" onCancel={() => setConfirmation("")} onConfirm={save} loading={saving} />}
  </section>;
}

export default function PaymentGatewayConfigPage({ embedded = false }) {
  const drafts = useRef(new Map());
  const templateDrafts = useRef(new Map());
  const permissions = useEffectivePermissions();
  const { selectedCampusId, selectedCampus } = useCampusContext();
  const user = getAuthUser() || {};
  const allowedRole = hasPaymentReversalRole(user, getAuthItem("role"));
  const canView = allowedRole && !permissions.loading && !permissions.error && permissions.canView("settings", "payment-gateway");
  const canEdit = canView && permissions.canDo("settings", "edit", "payment-gateway");
  const templatesEditable = canEdit && permissions.isSuperOrAdmin;
  useEffect(() => { if (!canEdit) drafts.current.clear(); }, [canEdit]);
  useEffect(() => { if (!templatesEditable) templateDrafts.current.clear(); }, [templatesEditable]);
  useEffect(() => {
    const beforeUnload = event => {
      if (!templateDrafts.current.size) return;
      event.preventDefault(); event.returnValue = "";
    };
    const beforeLink = event => {
      const link = event.target?.closest?.("a[href]");
      if (!templateDrafts.current.size || !link || link.target === "_blank" || link.hasAttribute("download")) return;
      if (link.href === window.location?.href) return;
      if (!window.confirm("Leave payment settings? Unsaved email and receipt template drafts will be discarded.")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener?.("beforeunload", beforeUnload);
    if (typeof document !== "undefined") document.addEventListener("click", beforeLink, true);
    return () => {
      window.removeEventListener?.("beforeunload", beforeUnload);
      if (typeof document !== "undefined") document.removeEventListener("click", beforeLink, true);
    };
  }, []);
  const campusId = Number(selectedCampusId);
  const isAdmin = permissions.isSuperOrAdmin;
  const assigned = Array.isArray(user.assignedCampusIds) && user.assignedCampusIds.length ? user.assignedCampusIds : [user.campusId];
  const inScope = Number.isSafeInteger(campusId) && campusId > 0
    && Number(selectedCampus?.campusId ?? selectedCampus?.id) === campusId
    && (isAdmin || assigned.some((id) => Number(id) === campusId));
  if (!embedded && hasRole("ACCOUNTANT", user)) return <Navigate to="/accountant-dashboard/settings/payment-gateway" replace />;
  const content = permissions.loading ? <p role="status">Checking payment settings permissions…</p>
    : !canView ? <p role="alert">Access restricted. An authorized accounting role and Settings view permission are required.</p>
      : !inScope ? <p role="alert">Select a permitted campus in the header. No default receiving account will be loaded. Assigned campus access must be present in your account.</p>
        : <CampusPaymentConfig key={`${campusId}:${canEdit}:${templatesEditable}`} campusId={campusId} campusName={selectedCampus.name || selectedCampus.campusName || `Campus ${campusId}`} editable={canEdit} drafts={drafts.current} templateDrafts={templateDrafts.current} templatesEditable={templatesEditable} />;
  return embedded ? <><h1>Payment Gateway & Bank Accounts</h1>{content}</>
    : <DashboardLayout actions={<Link className="cms-btn cms-btn-ghost" to="/dashboard/settings">&larr; Back to Settings</Link>} title="Payment Gateway & Bank Accounts" subtitle="Configure campus receiving bank accounts and payment processing." breadcrumb={["Settings", "Payment Gateway"]}>{content}</DashboardLayout>;
}

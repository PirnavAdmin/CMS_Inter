import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/shared/components/Ui.jsx";
import { PAYMENT_EMAIL_TYPES, PAYMENT_TEMPLATE_TOKENS, newPaymentTemplateDraft, paymentTemplateSample, insertPaymentTemplateText, renderPaymentTemplateSample } from "../AdminFees/services/paymentGatewaySession.js";

const sections = [["email", "Payment Email Templates"], ["receipt", "Payment Receipt Templates"], ["delivery", "Email Delivery Settings"]];
const emailFields = [["subject", "Email Subject"], ["heading", "Email Heading"], ["body", "Email Body"], ["closing", "Closing Message"], ["signature", "Signature"]];
const receiptFields = [["collegeName", "College Display Name"], ["campusName", "Campus Display Name"], ["address", "College Address"], ["phone", "Contact Number"], ["email", "Contact Email", "email"], ["website", "Website", "url"], ["title", "Receipt Title"], ["accentColor", "Accent Color", "color"], ["footer", "Footer Message"], ["instructions", "Additional Payment Instructions"], ["signatureName", "Authorized Signature Name"], ["signatureDesignation", "Authorized Signature Designation"]];
const visibleFields = [["academicYear", "Academic year"], ["campusName", "Campus name"], ["paymentMethod", "Payment method"], ["transactionReference", "Transaction reference"], ["installments", "Fee installment details"], ["remainingBalance", "Remaining balance"], ["contact", "Contact information"]];
const unavailable = "Backend payment-template APIs are not available. Edits and previews are local only; nothing is saved, published or sent.";

// Render a deliberately small formatting vocabulary as React text/elements.
// No raw HTML, URL embedding, script execution or remote student data.
function TemplateText({ value }) {
  return <div className="cms-payment-template-text">{String(value || "").split("\n").map((line, index) => <div key={index}>
    {line.startsWith("- ") ? "• " : ""}{(line.startsWith("- ") ? line.slice(2) : line).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part.startsWith("*") && part.endsWith("*") ? <em key={i}>{part.slice(1, -1)}</em> : part)}{!line && <br />}
  </div>)}</div>;
}

export default function PaymentTemplatesEditor({ campusId, campusName, editable, drafts }) {
  const [section, setSection] = useState("email");
  const [type, setType] = useState("successful");
  const [draft, setDraft] = useState(() => drafts?.get(campusId) || newPaymentTemplateDraft(campusName));
  const [preview, setPreview] = useState(false);
  const [restore, setRestore] = useState(false);
  const selection = useRef(null);
  const pendingCursor = useRef(null);
  const inputRefs = useRef({});
  // This map belongs to the settings page, never localStorage or backend config.
  const change = next => {
    if (!editable) return;
    const updated = { ...next, dirty: true };
    drafts?.set(campusId, updated);
    setDraft(updated);
  };
  useEffect(() => {
    const pending = pendingCursor.current;
    if (!pending) return;
    const input = inputRefs.current[pending.field];
    input?.focus(); input?.setSelectionRange(pending.cursor, pending.cursor);
    selection.current = { field: pending.field, start: pending.cursor, end: pending.cursor };
    pendingCursor.current = null;
  }, [draft]);
  const updateEmail = (key, value) => change({ ...draft, emails: { ...draft.emails, [type]: { ...draft.emails[type], [key]: value } } });
  const select = (field, node) => { selection.current = { field, start: node.selectionStart, end: node.selectionEnd }; };
  const insert = (text, format) => {
    if (!editable || !selection.current) return;
    const { field, start, end } = selection.current;
    const value = draft.emails[type][field];
    const selected = value.slice(start, end) || "text";
    const added = format === "bold" ? `**${selected}**` : format === "italic" ? `*${selected}*` : format === "list" ? `- ${selected.replace(/\n/g, "\n- ")}` : text;
    const result = insertPaymentTemplateText(value, added, start, end);
    if (result.value.length > (field === "body" ? 10000 : 1000)) return;
    pendingCursor.current = { field, cursor: result.cursor };
    updateEmail(field, result.value);
  };
  const selectSection = value => { setSection(value); setRestore(false); setPreview(false); selection.current = null; };
  const restoreLocal = () => {
    if (!editable) return;
    const defaults = newPaymentTemplateDraft(campusName);
    change(section === "email" ? { ...draft, emails: { ...draft.emails, [type]: defaults.emails[type] } }
      : { ...draft, [section]: defaults[section] });
    setRestore(false);
  };
  const sample = paymentTemplateSample(campusName, type);
  const email = draft.emails[type];
  const receipt = draft.receipt;
  const sampleText = value => renderPaymentTemplateSample(value, sample);
  const status = <p className="cms-payment-config-note" role="status">{draft.dirty ? "Unsaved local draft" : "Local sample — unpublished"}. Active source: unavailable. Campus Custom / College Default / System Default inheritance must be supplied by the backend.</p>;
  const unavailableActions = labels => <div className="cms-payment-template-actions">{labels.map(label => <button key={label} type="button" className="cms-btn cms-btn-primary" disabled aria-describedby="payment-template-support">{label}</button>)}</div>;
  return <div id="payment-template-panel" role="tabpanel" aria-labelledby="payment-tab-templates" className="cms-payment-templates">
    <h3>Email &amp; Receipt Templates</h3>
    <p><strong>Campus: {campusName}</strong> · Campus {campusId}</p>
    <p id="payment-template-support" className="cms-payment-config-note">{unavailable}</p>
    <p className="cms-payment-config-note">Drafts are isolated by campus and retained when switching tabs or campuses while this settings page stays open. Reloading or leaving the page discards them.</p>
    {!editable && <p role="status">View and preview only. Template editing requires an Admin role and Settings edit permission.</p>}
    <div className="cms-payment-config-tabs" role="tablist" aria-label="Email and receipt configuration">
      {sections.map(([id, label]) => <button key={id} id={`template-section-${id}`} role="tab" type="button" aria-selected={section === id} aria-controls={`template-${id}-panel`} className={`cms-btn ${section === id ? "cms-btn-primary" : "cms-btn-ghost"}`} onClick={() => selectSection(id)}>{label}</button>)}
    </div>
    {status}
    {section === "email" && <section id="template-email-panel" role="tabpanel" aria-labelledby="template-section-email">
      <div className="cms-field"><label htmlFor="payment-email-type">Template Type</label><select id="payment-email-type" value={type} onChange={event => { setType(event.target.value); selection.current = null; }}>
        {PAYMENT_EMAIL_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></div>
      <div className="cms-payment-template-toolbar" role="group" aria-label="Simple text formatting">
        {[["bold", "Bold"], ["italic", "Italic"], ["list", "List"]].map(([id, label]) => <button type="button" key={id} className="cms-btn cms-btn-ghost" disabled={!editable} onMouseDown={event => event.preventDefault()} onClick={() => insert("", id)}>{label}</button>)}
        <small>Select an email field first. Use blank lines for paragraphs. HTML and executable links are displayed as text.</small>
      </div>
      <fieldset disabled={!editable}><div className="cms-payment-config-grid">
        {emailFields.map(([key, label]) => <div className={`cms-field ${key === "body" ? "cms-payment-template-wide" : ""}`} key={key}>
          <label htmlFor={`payment-email-${key}`}>{label}</label>
          <textarea id={`payment-email-${key}`} ref={node => { inputRefs.current[key] = node; }} value={email[key]} rows={key === "body" ? 7 : key === "subject" || key === "heading" ? 2 : 3} maxLength={key === "body" ? 10000 : 1000}
            onFocus={event => select(key, event.target)} onSelect={event => select(key, event.target)} onChange={event => { select(key, event.target); updateEmail(key, event.target.value); }} />
        </div>)}
      </div></fieldset>
      <h4>Sample preview placeholders</h4>
      <p className="cms-payment-config-note">These tokens work in this sample preview only. Production placeholders require the backend's approved allowlist and verified payment values. Click a token to replace the selection in the last focused email field.</p>
      <div className="cms-payment-template-tokens">{Object.entries(PAYMENT_TEMPLATE_TOKENS).map(([key, description]) => <button key={key} type="button" className="cms-btn cms-btn-ghost" disabled={!editable} title={description} onMouseDown={event => event.preventDefault()} onClick={() => insert(`{{${key}}}`)}><span>{`{{${key}}}`}</span><small>{description}</small></button>)}</div>
      {unavailableActions(["Save Draft", "Publish Template"])}
    </section>}
    {section === "receipt" && <section id="template-receipt-panel" role="tabpanel" aria-labelledby="template-section-receipt">
      <h4>College Branding &amp; Receipt Appearance</h4>
      <fieldset disabled={!editable}><div className="cms-payment-config-grid">
        {receiptFields.map(([key, label, fieldType = "text"]) => <div className="cms-field" key={key}><label htmlFor={`payment-receipt-${key}`}>{label}</label>
          {["address", "footer", "instructions"].includes(key) ? <textarea rows={3} id={`payment-receipt-${key}`} value={receipt[key]} maxLength={1000} onChange={event => change({ ...draft, receipt: { ...receipt, [key]: event.target.value } })} />
            : <input id={`payment-receipt-${key}`} type={fieldType} maxLength={300} value={receipt[key]} onChange={event => change({ ...draft, receipt: { ...receipt, [key]: event.target.value } })} />}
        </div>)}
        <div className="cms-field"><label htmlFor="payment-receipt-layout">Header Layout</label><select id="payment-receipt-layout" value={receipt.layout} onChange={event => change({ ...draft, receipt: { ...receipt, layout: event.target.value } })}><option value="split">College left, receipt right</option><option value="centered">Centered</option></select></div>
        <div className="cms-field"><label htmlFor="payment-receipt-logo">College Logo</label><input id="payment-receipt-logo" type="file" accept="image/png,image/jpeg" disabled /><small>Logo upload requires a campus-authorized backend asset API.</small></div>
        <div className="cms-field"><label htmlFor="payment-receipt-signature">Signature Image</label><input id="payment-receipt-signature" type="file" accept="image/png,image/jpeg" disabled /><small>Signature upload requires backend support.</small></div>
      </div>
      <h4>Optional Field Visibility</h4><div className="cms-payment-config-grid">{visibleFields.map(([key, label]) => <label className="cms-payment-config-toggle" key={key}><input type="checkbox" checked={receipt.visibility[key]} onChange={event => change({ ...draft, receipt: { ...receipt, visibility: { ...receipt.visibility, [key]: event.target.checked } } })} />{label}</label>)}</div>
      </fieldset>
      <p className="cms-payment-config-note">Receipt number, student identity, admission number, payment date, amount paid and payment status always come from the backend's verified payment record. They cannot be edited here.</p>
      {unavailableActions(["Save Receipt Settings", "Preview PDF"])}
    </section>}
    {section === "delivery" && <section id="template-delivery-panel" role="tabpanel" aria-labelledby="template-section-delivery">
      <fieldset disabled={!editable}><div className="cms-payment-config-grid">
        {[["senderName", "Sender Display Name", "text"], ["replyTo", "Reply-To Email Address", "email"], ["testRecipient", "Test Email Recipient", "email"]].map(([key, label, inputType]) => <div className="cms-field" key={key}><label htmlFor={`payment-delivery-${key}`}>{label}</label><input id={`payment-delivery-${key}`} type={inputType} value={draft.delivery[key]} maxLength={254} onChange={event => change({ ...draft, delivery: { ...draft.delivery, [key]: event.target.value } })} /></div>)}
        <div className="cms-field"><label htmlFor="payment-delivery-recipients">Recipient Preferences</label><select id="payment-delivery-recipients" value={draft.delivery.recipients} onChange={event => change({ ...draft, delivery: { ...draft.delivery, recipients: event.target.value } })}><option value="student">Student</option><option value="parent">Parent / Guardian</option><option value="both">Both, where authorized</option></select></div>
      </div>
      {[["attachPdf", "Attach PDF Receipt to Successful Payment Email"], ["pending", "Enable Pending Verification Email"], ["rejected", "Enable Payment Rejected Email"], ["reminder", "Enable Payment Reminder Email"]].map(([key, label]) => <label className="cms-payment-config-toggle" key={key}><input type="checkbox" checked={draft.delivery[key]} onChange={event => change({ ...draft, delivery: { ...draft.delivery, [key]: event.target.checked } })} />{label}</label>)}
      </fieldset>
      <p className="cms-payment-config-note">These are proposed delivery preferences only. Test sending requires an authorized server endpoint using TEST-labelled sample data. No email is sent from this browser, and no SMTP secrets are collected.</p>
      {unavailableActions(["Save Delivery Settings", "Send Test Email"])}
    </section>}
    <div className="cms-payment-template-actions">
      {section !== "delivery" && <button type="button" className="cms-btn cms-btn-primary" onClick={() => setPreview(value => !value)}>{preview ? "Hide Preview" : "Live Preview"}</button>}
      <button type="button" className="cms-btn cms-btn-ghost" disabled={!editable} onClick={() => setRestore(true)}>Restore Default</button>
    </div>
    {restore && <ConfirmDialog title="Restore local sample?" message={`Reset only this ${section === "email" ? PAYMENT_EMAIL_TYPES.find(([id]) => id === type)[1] + " email" : section} draft to its sample values? This discards its local edits. Backend inherited/default templates are unavailable; published settings will not change.`} confirmLabel="Reset Local Sample" onCancel={() => setRestore(false)} onConfirm={restoreLocal} />}
    {preview && section === "email" && <article className="cms-payment-template-preview" aria-label="Sample email preview">
      <p className="cms-payment-template-sample">SAMPLE DATA · Unpublished preview · No email sent</p>
      <p><strong>Subject:</strong> {sampleText(email.subject)}</p><h3>{sampleText(email.heading)}</h3>
      <TemplateText value={sampleText(email.body)} /><TemplateText value={sampleText(email.closing)} /><TemplateText value={sampleText(email.signature)} />
    </article>}
    {preview && section === "receipt" && <article className="cms-payment-template-preview cms-payment-template-receipt" aria-label="Sample receipt preview" style={{ "--receipt-accent": /^#[0-9a-f]{6}$/i.test(receipt.accentColor) ? receipt.accentColor : "#6941a5" }}>
      <p className="cms-payment-template-sample">SAMPLE DATA · DESIGN PREVIEW ONLY · Not an official receipt</p>
      <div className={`cms-payment-template-receipt-head ${receipt.layout === "centered" ? "is-centered" : ""}`}><div><h3>{receipt.collegeName}</h3>{receipt.visibility.campusName && <p>{receipt.campusName}</p>}<TemplateText value={receipt.address} /></div><h4>{receipt.title}</h4></div>
      <dl className="cms-payment-template-details">{[["Receipt No", sample.receiptNumber], ["Student", sample.studentName], ["Admission No", sample.admissionNumber], ["Payment Date", sample.paymentDate], ["Payment Status", "Payment Successful"], ["Amount Paid", sample.amountPaid], ...(receipt.visibility.academicYear ? [["Academic Year", sample.academicYear]] : []), ...(receipt.visibility.paymentMethod ? [["Payment Method", sample.paymentMethod]] : []), ...(receipt.visibility.transactionReference ? [["Transaction Reference", sample.transactionReference]] : []), ...(receipt.visibility.installments ? [["Fee Installment", "Sample installment 1"]] : []), ...(receipt.visibility.remainingBalance ? [["Remaining Balance", sample.remainingBalance]] : [])].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {receipt.visibility.contact && <p>{[receipt.phone, receipt.email, receipt.website].filter(Boolean).join(" · ") || "Sample contact details not configured"}</p>}
      <TemplateText value={receipt.instructions} /><TemplateText value={receipt.footer} /><p><strong>{receipt.signatureName}</strong><br />{receipt.signatureDesignation}</p>
    </article>}
  </div>;
}

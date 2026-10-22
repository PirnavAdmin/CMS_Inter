import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Check, ChevronLeft, ChevronRight, Edit3, Lock, Save, X } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { env } from "@/config/env.js";
import { maskProfileValue, profileCollections, profileDate, profileDocumentUrl, profileValue as value, validateProfileDocument } from "../accountantProfileData.js";
import "../AccountantProfile.css";
import AccountantProfilePhotoEditor from "./AccountantProfilePhotoEditor.jsx";
import AccountantProfilePhotoActions from "./AccountantProfilePhotoActions.jsx";

const steps = ["Personal Info", "Bank Info", "Address Info", "Experience", "Documents", "Preview"];
const titles = ["Personal Information", "Bank Details", "Address Information", "Experience Details", "Documents", "Review & Confirmation"];
function ReadField({ label, text }) {
  const id = useId();
  return <div className="acct-profile-field"><label htmlFor={id}>{label}</label><input id={id} value={String(text ?? "") || "Not available"} readOnly disabled /></div>;
}

export default function AccountantProfileContent({ staff, staffId, display, initials, photoUrl, photoUploading, photoSuccess, photoError, fileInputRef, onPhotoSelect, loading, notices, editing, savingProfile, form, onChange, onEdit, onCancel, onSave, securityForm, passwordLoading, passwordSuccess, resetPassword, onDocumentsChanged, EditableField }) {
  const [step, setStep] = useState(0);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [documentType, setDocumentType] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [documentBusy, setDocumentBusy] = useState(false);
  const [documentMessage, setDocumentMessage] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoSelectionError, setPhotoSelectionError] = useState("");
  const [photoActionsOpen, setPhotoActionsOpen] = useState(false);
  const documentLock = useRef(false);
  const dialogRef = useRef(null);
  const busyRef = useRef(passwordLoading);
  busyRef.current = passwordLoading;
  const { documents } = profileCollections(staff);
  const experience = form.experience;
  const classification = String(value(staff, "staffType", "facultyType") || "");
  const staffClassification = classification && !/staff/i.test(classification) ? `${classification} Staff` : classification;
  const selectPhoto = event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setPhotoSelectionError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoSelectionError("Please select a valid image file."); return; }
    if (!file.size || file.size > 5 * 1024 * 1024) { setPhotoSelectionError("Choose a non-empty image of 5 MB or smaller."); return; }
    setPhotoFile(file);
  };
  const closePassword = () => {
    if (passwordLoading) return;
    resetPassword();
    setPasswordOpen(false);
  };
  useEffect(() => {
    if (passwordSuccess) setPasswordOpen(false);
  }, [passwordSuccess]);
  useEffect(() => {
    if (!passwordOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector("input")?.focus();
    const onKey = event => {
      if (event.key === "Escape" && !busyRef.current) { resetPassword(); setPasswordOpen(false); }
      if (event.key !== "Tab") return;
      const controls = [...(dialogRef.current?.querySelectorAll("button:not(:disabled), input:not(:disabled)") || [])];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, [passwordOpen, resetPassword]);

  const personal = [
    ["Employee / Staff ID", display.employeeId], ["Middle Name", value(staff, "middleName")],
    ["Date of Birth", profileDate(value(staff, "dateOfBirth", "dob"))], ["Gender", value(staff, "gender")],
    ["Marital Status", form.personal.maritalStatus], ["Department", display.department], ["Designation", display.designation],
    ["Blood Group", value(staff, "bloodGroup")], ["Date of Joining", profileDate(value(staff, "joiningDate", "dateOfJoining"))],
    ["Aadhaar Number", maskProfileValue(form.personal.aadhaar)], ["PAN Number", maskProfileValue(form.personal.panNumber)],
    ["Campus", display.campus], ["Username", display.username], ["Assigned Role", display.role], ["Account Status", display.status],
  ];
  const bankLabels = [["Bank Name", "bankName"], ["Account Holder Name", "accountHolderName"], ["Account Number", "accountNumber"], ["IFSC Code", "ifscCode"], ["Branch", "branch"], ["Account Type", "accountType"]];
  const banking = bankLabels.map(([label, key]) => [label, key === "accountNumber" ? maskProfileValue(form.bank[key]) : form.bank[key]]);
  const address = ["currentAddress", "permanentAddress", "city", "district", "state", "pincode", "country"].map(key => [key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()), key in form.address ? form.address[key] : value(staff, key)]);
  const employment = [["Qualification", value(staff, "highestQualification", "qualification")], ["Employment Type", value(staff, "employmentType")], ["Total Experience", value(staff, "totalExperience", "experience")], ["Previous Institution / Employer", value(staff, "previousInstitution")], ["Previous Designation", value(staff, "previousDesignation")], ["From Date", profileDate(value(staff, "experienceFrom"))], ["To Date", profileDate(value(staff, "experienceTo"))]];
  const experienceRows = record => [["Employer", value(record, "institution", "organization", "employer")], ["Designation", value(record, "designation")], ["From", profileDate(value(record, "fromDate", "from"))], ["To", profileDate(value(record, "toDate", "to"))], ["Total Years", record.totalYears], ["Roles / Responsibilities", record.roles]];
  const fields = rows => rows.map(([label, text]) => <ReadField key={label} label={label} text={text} />);
  const previewGroup = (title, rows) => <section className="acct-profile-preview-group"><h3>{title}</h3><dl>{rows.map(([label, text]) => <div key={label}><dt>{label}</dt><dd>{String(text ?? "") || "Not available"}</dd></div>)}</dl></section>;
  const navigate = target => {
    if (editing && !document.getElementById("accountantProfileForm")?.reportValidity()) return;
    setStep(target);
  };
  const uploadDocument = async () => {
    if (documentLock.current || !staffId || !editing) return;
    const error = validateProfileDocument(documentFile, documentType);
    if (error) { setDocumentMessage({ error: true, text: error }); return; }
    documentLock.current = true;
    setDocumentBusy(true);
    setDocumentMessage(null);
    try {
      const payload = new FormData();
      payload.append("DocumentType", documentType.trim());
      payload.append("File", documentFile);
      const response = await apiClient.post(apiEndpoints.faculty.uploadDocument(staffId), payload);
      const body = response.data;
      if ((body?.status ?? body?.Status) === false) throw new Error(body?.message || body?.Message || "Document upload failed.");
      await onDocumentsChanged();
      setDocumentFile(null);
      setDocumentType("");
      setDocumentMessage({ error: false, text: "Document uploaded successfully." });
    } catch (error) { setDocumentMessage({ error: true, text: getApiErrorMessage(error) || "Document upload or refresh failed." }); }
    finally { documentLock.current = false; setDocumentBusy(false); }
  };
  const removeDocument = async type => {
    if (!editing || documentLock.current || !type || !window.confirm(`Remove ${type} from your profile?`)) return;
    documentLock.current = true; setDocumentBusy(true); setDocumentMessage(null);
    try {
      const response = await apiClient.delete(apiEndpoints.faculty.deleteDocument(staffId, type));
      if ((response.data?.status ?? response.data?.Status) === false) throw new Error(response.data.message || "Document removal failed.");
      await onDocumentsChanged();
      setDocumentMessage({ error: false, text: "Document removed successfully." });
    } catch (error) { setDocumentMessage({ error: true, text: getApiErrorMessage(error) || "Document removal or refresh failed." }); }
    finally { documentLock.current = false; setDocumentBusy(false); }
  };
  const documentList = <div className="acct-profile-documents">{documents.length ? documents.map((doc, index) => {
    const url = profileDocumentUrl(value(doc, "url", "path"), env.apiBaseUrl);
    return <div className="acct-profile-document" key={value(doc, "id") || index}><div><strong>{value(doc, "type", "name") || "Document"}</strong><small>{value(doc, "name")} {value(doc, "size")}</small></div>{url ? <a href={url} target="_blank" rel="noopener noreferrer">View / Download</a> : <span>Preview unavailable</span>}{editing && step === 4 && value(doc, "type") && <button type="button" className="cms-btn cms-btn-ghost" disabled={documentBusy} onClick={() => removeDocument(value(doc, "type"))}>Remove</button>}</div>;
  }) : <p className="acct-profile-note">No documents are available in your staff profile.</p>}</div>;

  return <div className="acct-profile-page">
    <header className="acct-profile-page-head"><div><h1>My Profile</h1><p>{editing ? "You can now edit your profile details" : "Complete your profile step by step"}</p></div><div className="acct-profile-actions">
      <button type="button" className="cms-btn cms-btn-ghost" onClick={() => { resetPassword(); setPasswordOpen(true); }}><Lock size={14} /> Change Password</button>
      {staff && (editing ? <button type="button" className="cms-btn cms-btn-ghost" disabled={savingProfile} onClick={onCancel}><X size={14} /> Cancel Edit</button> : <button type="button" className="cms-btn cms-btn-primary" onClick={onEdit}><Edit3 size={14} /> Edit</button>)}
    </div></header>
    {notices}
    {passwordSuccess && <div className="acct-profile-feedback" role="status">{passwordSuccess}</div>}
    <section className="cms-card acct-profile-summary-card"><div className="acct-profile-header-inline">
      <div className="acct-profile-avatar-wrap"><div className="acct-profile-avatar">{photoUrl ? <img src={photoUrl} alt={`${display.fullName} profile`} /> : <span>{initials}</span>}</div><button type="button" className="acct-profile-photo-edit" aria-label="Change profile photo" title="Change profile photo" disabled={!staffId || photoUploading || loading} onClick={() => setPhotoActionsOpen(true)}><Camera size={12} /></button><input ref={fileInputRef} type="file" accept="image/*" hidden onChange={selectPhoto} /></div>
      <div className="acct-profile-meta"><strong>{display.fullName}</strong>{[display.designation, display.department, display.employeeId ? `ID: ${display.employeeId}` : "", staffClassification, value(staff, "boardName", "board", "boardCode")].filter(Boolean).map((text, index) => <span key={index}>{text}</span>)}</div>
    </div><small className="acct-profile-note">{photoUploading ? "Uploading photo..." : "Choose an image up to 5 MB. Cropped photos are saved as JPEG."}</small>{photoSuccess && <p role="status" className="acct-profile-feedback">{photoSuccess}</p>}{(photoSelectionError || photoError) && <p role="alert" className="acct-profile-error">{photoSelectionError || photoError}</p>}</section>
    <nav className="acct-profile-stepper" aria-label="Profile steps">{steps.map((title, index) => <button type="button" key={title} className={`acct-profile-step ${step === index ? "active" : ""} ${step > index ? "completed" : ""}`} aria-current={step === index ? "step" : undefined} disabled={loading || savingProfile} onClick={() => navigate(index)}><span className="acct-profile-step-number">{step > index ? <Check size={14} /> : index + 1}</span><span>{title}</span></button>)}</nav>
    <form id="accountantProfileForm" onSubmit={onSave} className="cms-card acct-profile-form-card">
      <div className="acct-profile-section-head"><h2>{titles[step]}</h2><span>Step {step + 1} of 6</span></div>
      {loading ? <p role="status">Loading accountant profile...</p> : <>
        {step === 0 && <div className="acct-profile-fields">
          <EditableField label="First Name" value={form.firstName} editing={editing && !savingProfile} onChange={onChange("firstName")} required />
          <EditableField label="Last Name" value={form.lastName} editing={editing && !savingProfile} onChange={onChange("lastName")} required />
          <EditableField label="Email Address" type="email" value={form.email} editing={editing && !savingProfile} onChange={onChange("email")} />
          <EditableField label="Contact Phone Number" value={form.mobile} editing={editing && !savingProfile} onChange={onChange("mobile")} required />
          {personal.map(([label, text]) => {
            const key = { "Marital Status": "maritalStatus", "Aadhaar Number": "aadhaar", "PAN Number": "panNumber" }[label];
            return key ? <EditableField key={label} label={label} value={editing ? form.personal[key] : text} editing={editing && !savingProfile} onChange={onChange(`personal.${key}`)} /> : <ReadField key={label} label={label} text={text} />;
          })}
        </div>}
        {step === 1 && <div className="acct-profile-fields">{bankLabels.map(([label, key]) => <EditableField key={key} label={label} value={!editing && key === "accountNumber" ? maskProfileValue(form.bank[key]) : form.bank[key]} editing={editing && !savingProfile} onChange={onChange(`bank.${key}`)} />)}</div>}
        {step === 2 && <div className="acct-profile-fields">{address.map(([label, text], index) => <EditableField key={label} label={label} value={text} editing={editing && !savingProfile} onChange={onChange(`address.${["currentAddress", "permanentAddress", "city", "district", "state", "pincode", "country"][index]}`)} />)}</div>}
        {step === 3 && <><div className="acct-profile-fields">{fields(employment)}</div>{experience.map((record, index) => <section className="acct-profile-record" key={index}><h3>Experience {index + 1}</h3><div className="acct-profile-fields">{[["Employer", "organization"], ["Designation", "designation"], ["From", "fromDate", "date"], ["To", "toDate", "date"], ["Total Years", "totalYears", "number"], ["Roles / Responsibilities", "roles"]].map(([label, key, type]) => <EditableField key={key} label={`${label} (${index + 1})`} type={type} value={record[key]} editing={editing && !savingProfile} onChange={event => onChange("experience")({ target: { value: experience.map((entry, position) => position === index ? { ...entry, [key]: event.target.value } : entry) } })} />)}</div>{editing && <button type="button" className="cms-btn cms-btn-ghost" disabled={savingProfile} onClick={() => onChange("experience")({ target: { value: experience.filter((_, position) => position !== index) } })}>Remove Experience</button>}</section>)}{editing && <button type="button" className="cms-btn cms-btn-primary" disabled={savingProfile} onClick={() => onChange("experience")({ target: { value: [...experience, { organization: "", designation: "", fromDate: "", toDate: "", totalYears: 0, roles: "" }] } })}>Add Experience</button>}</>}
        {step === 4 && <><div className="acct-profile-document-upload"><div className="acct-profile-field"><label htmlFor="accountant-document-type">Document Type</label><input id="accountant-document-type" value={documentType} disabled={documentBusy || !staffId || !editing} placeholder="Document type or title" onChange={e => setDocumentType(e.target.value)} /></div><div className="acct-profile-field"><label htmlFor="accountant-document-file">PDF or image, up to 10 MB</label><input id="accountant-document-file" type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={documentBusy || !staffId || !editing} onChange={e => { setDocumentFile(e.target.files?.[0] || null); e.target.value = ""; }} />{documentFile && <small>{documentFile.name}</small>}</div><button type="button" className="cms-btn cms-btn-primary" disabled={documentBusy || !staffId || !editing} onClick={uploadDocument}>{documentBusy ? "Uploading..." : "Upload Document"}</button></div>{documentMessage && <p role={documentMessage.error ? "alert" : "status"} className={documentMessage.error ? "acct-profile-error" : "acct-profile-feedback"}>{documentMessage.text}</p>}{documentList}</>}
        {step === 5 && <div className="acct-profile-preview">{previewGroup("Personal Information", [["First Name", form.firstName], ["Last Name", form.lastName], ["Email", form.email], ["Mobile", form.mobile], ...personal])}{previewGroup("Bank Details", banking)}{previewGroup("Address", address)}{previewGroup("Employment", employment)}{experience.map((record, index) => <div key={value(record, "id") || index}>{previewGroup(`Experience ${index + 1}`, experienceRows(record))}</div>)}<section className="acct-profile-preview-group"><h3>Documents</h3>{documentList}</section></div>}
      </>}
      <footer className="acct-profile-footer"><button type="button" className="cms-btn cms-btn-ghost" disabled={step === 0 || savingProfile || loading} onClick={() => navigate(step - 1)}><ChevronLeft size={14} /> Previous</button><div>{editing && <button type="submit" className="cms-btn cms-btn-primary" disabled={savingProfile || loading}><Save size={14} /> {savingProfile ? "Saving..." : "Save Changes"}</button>}{step < 5 && <button type="button" className="cms-btn cms-btn-primary" disabled={savingProfile || loading} onClick={() => navigate(step + 1)}>Next <ChevronRight size={14} /></button>}</div></footer>
    </form>
    {photoActionsOpen && <AccountantProfilePhotoActions photoUrl={photoUrl} name={display.fullName} subtitle={[display.designation, display.department].filter(Boolean).join(" · ")} initials={initials} onClose={() => setPhotoActionsOpen(false)} onUpload={() => fileInputRef.current?.click()} onCapture={file => { setPhotoActionsOpen(false); setPhotoFile(file); }} />}
    {photoFile && <AccountantProfilePhotoEditor file={photoFile} onApply={onPhotoSelect} onClose={() => setPhotoFile(null)} />}
    {passwordOpen && createPortal(<div className="acct-profile-password-overlay" onMouseDown={e => e.target === e.currentTarget && closePassword()}><section ref={dialogRef} className="acct-profile-password-modal" role="dialog" aria-modal="true" aria-labelledby="accountant-password-title"><header><div><h2 id="accountant-password-title">Account Security</h2><p>Update your login password</p></div><button type="button" className="cms-action-btn" aria-label="Close password dialog" disabled={passwordLoading} onClick={closePassword}><X size={18} /></button></header><fieldset disabled={passwordLoading}>{securityForm}</fieldset><footer><button type="button" className="cms-btn cms-btn-ghost" disabled={passwordLoading} onClick={closePassword}>Cancel</button></footer></section></div>, document.body)}
  </div>;
}

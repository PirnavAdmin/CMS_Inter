import { useEffect, useState } from "react";
import { UserRound, Landmark, MapPin, Briefcase, FileText, Eye, Pencil, Save } from "lucide-react";
import api, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { getAuthUser } from "@/features/authStorage.js";
import Page from "../layout/ExamCellPageLayout.jsx";
import { payload } from "./Dashboard.jsx";

const sections = [
  { name: "Personal", label: "Personal Info", icon: UserRound, key: "personal", fields: [["firstName", "First Name", "text", true], ["middleName", "Middle Name"], ["lastName", "Last Name", "text", true], ["gender", "Gender"], ["dateOfBirth", "Date of Birth", "date"], ["maritalStatus", "Marital Status"], ["nationality", "Nationality"], ["aadhaar", "Aadhaar"], ["panNumber", "PAN Number"], ["bloodGroup", "Blood Group"]] },
  { name: "Bank", label: "Bank Info", icon: Landmark, key: "bank", fields: [["bankName", "Bank Name"], ["accountHolderName", "Account Holder Name"], ["accountNumber", "Account Number"], ["ifscCode", "IFSC Code"], ["branch", "Branch"], ["accountType", "Account Type"]] },
  { name: "Address", label: "Address Info", icon: MapPin, key: "address", fields: [["currentAddress", "Current Address"], ["permanentAddress", "Permanent Address"], ["city", "City"], ["district", "District"], ["state", "State"], ["pincode", "Pincode"], ["country", "Country"]] },
  { name: "Experience", label: "Experience", icon: Briefcase },
  { name: "Documents", label: "Documents", icon: FileText },
  { name: "Preview", label: "Preview", icon: Eye },
];
const aliases = { dateOfBirth: "dob", aadhaar: "aadhaarNumber", panNumber: "pan", accountHolderName: "accountHolder", ifscCode: "ifsc", pincode: "pin" };
const value = (profile, section, key) => profile?.[section.key]?.[key] ?? (section.key === "bank" ? profile?.bankDetails?.[key] : undefined) ?? profile?.[key] ?? profile?.[aliases[key]] ?? "";
const experienceFields = [["organization", "Organization"], ["designation", "Designation"], ["fromDate", "From Date", "date"], ["toDate", "To Date", "date"], ["totalYears", "Total Years", "number"], ["roles", "Roles"]];

export default function Profile() {
  const [user] = useState(() => getAuthUser() || {});
  const [profile, setProfile] = useState(user);
  const identifier = user.staffId || user.staff?.id || user.employeeId;
  const staffId = profile.staffId || user.staffId;
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [experienceDraft, setExperienceDraft] = useState([]);
  const [documentType, setDocumentType] = useState("Resume");
  const [documentFile, setDocumentFile] = useState(null);
  const section = sections[step];
  useEffect(() => {
    let active = true;
    if (!identifier) return;
    setBusy(true);
    api.get(apiEndpoints.faculty.getProfileByIdentifier(identifier)).then((res) => { const fetched = payload(res); if (active) setProfile({ ...user, ...fetched, staffId: fetched.staffId || fetched.id }); }).catch((error) => { if (active) setError(getApiErrorMessage(error) || "Unable to load your staff profile."); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [identifier, user]);
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.fullName || profile.name || "Exam Cell";
  const beginEdit = () => { setDraft(Object.fromEntries(section.fields.map(([key]) => [key, value(profile, section, key)]))); setEditing(true); setError(""); setNotice(""); };
  const save = async (event) => {
    event.preventDefault();
    if (!staffId || !section.key) return;
    setBusy(true); setError("");
    try {
      // Existing section contract: do not overwrite unrelated employment or account fields.
      const response = await api.post(apiEndpoints.faculty.saveProfileDraft(staffId), { sectionName: section.name, [section.key]: { ...draft, ...(section.key === "personal" ? { dateOfBirth: draft.dateOfBirth || null } : {}) } });
      const returned = payload(response);
      setProfile((current) => ({ ...current, ...(returned && typeof returned === "object" ? returned : {}), [section.key]: { ...current[section.key], ...draft } }));
      setEditing(false); setNotice(`${section.label} saved successfully.`);
    } catch (error) { setError(getApiErrorMessage(error) || "Unable to save profile details."); }
    finally { setBusy(false); }
  };
  const renderFields = (entry) => <dl className="ec-profile-fields">{entry.fields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{String(value(profile, entry, key) || "—")}</dd></div>)}</dl>;
  const experience = profile.experienceList || (Array.isArray(profile.experience) ? profile.experience : []);
  const documentMap = profile.documentsMap || profile.documents;
  const documents = documentMap && !Array.isArray(documentMap) && typeof documentMap === "object" ? Object.entries(documentMap) : [];
  const saveExperience = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const entries = experienceDraft.map((item) => Object.fromEntries(experienceFields.map(([key]) => [key, key === "totalYears" ? Number(item[key] || 0) : item[key] || null])));
      await api.post(apiEndpoints.faculty.saveProfileDraft(staffId), { sectionName: "Experience", experience: entries });
      setProfile((current) => ({ ...current, experienceList: entries })); setEditing(false); setNotice("Experience saved successfully.");
    } catch (err) { setError(getApiErrorMessage(err) || "Unable to save experience."); }
    finally { setBusy(false); }
  };
  const uploadDocument = async (event) => {
    event.preventDefault(); if (!staffId || !documentFile) return; setBusy(true); setError("");
    try {
      const form = new FormData(); form.append("file", documentFile); form.append("documentType", documentType);
      await api.post(apiEndpoints.faculty.uploadDocument(staffId), form, { headers: { "Content-Type": "multipart/form-data" } });
      const response = await api.get(apiEndpoints.faculty.getProfileByIdentifier(staffId));
      setProfile({ ...user, ...payload(response), staffId }); setDocumentFile(null); setNotice("Document uploaded successfully."); event.target.reset();
    } catch (err) { setError(getApiErrorMessage(err) || "Unable to upload document."); }
    finally { setBusy(false); }
  };
  const submitProfile = async () => {
    if (!staffId || !window.confirm("Submit your staff profile for review?")) return;
    setBusy(true); setError("");
    try { await api.post(apiEndpoints.faculty.submitProfile(staffId)); setNotice("Profile submitted for review."); }
    catch (err) { setError(getApiErrorMessage(err) || "Unable to submit profile."); }
    finally { setBusy(false); }
  };
  return <Page title="My Profile" subtitle="View and update your Exam Cell staff profile.">
    <section className="ec-card ec-profile-header"><span className="ec-profile-avatar">{displayName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}</span><div><h2>{displayName}</h2><p>{profile.designation || "Exam Cell"} · {profile.departmentName || profile.department || "—"}</p><small>Employee ID: {profile.employeeId || profile.employeeCode || "—"} · Campus: {profile.campusName || "—"}</small><p>{profile.email || "—"} · {profile.mobile || "—"}</p></div>{section.fields && <button className="ec-primary" disabled={!staffId || busy || editing} onClick={beginEdit}><Pencil size={16} />Edit Profile</button>}</section>
    {!staffId && <p className="ec-muted">Your login does not include a staff ID. Profile details are displayed from authentication data; editing needs the linked staff profile.</p>}
    {error && <p className="ec-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <nav className="ec-profile-tabs" aria-label="Profile sections">{sections.map((entry, index) => <button disabled={editing} aria-current={step === index ? "step" : undefined} className={step === index ? "is-active" : ""} key={entry.name} onClick={() => setStep(index)}><entry.icon size={19} />{entry.label}</button>)}</nav>
    <section className="ec-card ec-padding"><h2>{section.label}</h2>
      {section.fields ? editing ? <form onSubmit={save}><div className="ec-form-grid">{section.fields.map(([key, label, type = "text", required]) => <label key={key}>{label}{required ? " *" : ""}<input type={type} required={required} maxLength={key === "aadhaar" ? 20 : 150} value={type === "date" ? String(draft[key] || "").slice(0, 10) : draft[key] ?? ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></label>)}</div><div className="ec-actions"><button type="button" disabled={busy} onClick={() => setEditing(false)}>Cancel</button><button className="ec-primary" disabled={busy}><Save size={16} />{busy ? "Saving…" : "Save Changes"}</button></div></form> : renderFields(section) : null}
      {section.name === "Experience" && (editing ? <form onSubmit={saveExperience}>{experienceDraft.map((item, index) => <div className="ec-form-grid" key={index}>{experienceFields.map(([key, label, type = "text"]) => <label key={key}>{label}<input type={type} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.1" : undefined} required={key === "organization" || key === "designation"} value={item[key] ?? ""} onChange={(event) => setExperienceDraft((current) => current.map((entry, position) => position === index ? { ...entry, [key]: event.target.value } : entry))} /></label>)}<button type="button" onClick={() => setExperienceDraft((current) => current.filter((_, position) => position !== index))}>Remove Entry</button></div>)}<div className="ec-actions"><button type="button" disabled={busy} onClick={() => setExperienceDraft([...experienceDraft, {}])}>Add Experience</button><button type="button" disabled={busy} onClick={() => setEditing(false)}>Cancel</button><button className="ec-primary" disabled={busy}>Save Experience</button></div></form> : <><dl className="ec-profile-fields">{[["Qualification", profile.qualification || profile.highestQualification], ["Total Experience", profile.totalExperience ?? (typeof profile.experience === "number" ? profile.experience : null)], ["Previous Institution", profile.previousInstitution], ["Previous Designation", profile.previousDesignation]].map(([label, data]) => <div key={label}><dt>{label}</dt><dd>{data ?? "—"}</dd></div>)}</dl>{experience.map((item, index) => <p key={index}>{item.organization || item.institutionName || item.institution} · {item.designation} · {item.fromDate} – {item.toDate || "Present"}</p>)}<button className="ec-primary" disabled={!staffId || busy} onClick={() => { setExperienceDraft(experience.map((item) => ({ ...item }))); setEditing(true); }}>Edit Experience</button></>)}
      {section.name === "Documents" && <>{documents.length ? <dl className="ec-profile-fields">{documents.map(([key, document]) => <div key={key}><dt>{key}</dt><dd>{typeof document === "string" && document ? "Uploaded" : "Not uploaded"}</dd></div>)}</dl> : <p>No documents returned by the staff profile API.</p>}<form className="ec-form-grid" onSubmit={uploadDocument}><label>Document Type<select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>{["Resume", "Aadhaar", "PAN", "Qualification Certificate", "Experience Certificate", "Bank Proof", "Other"].map((type) => <option key={type}>{type}</option>)}</select></label><label>File<input required type="file" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} /></label><button className="ec-primary" disabled={!staffId || busy || !documentFile}>Upload Document</button></form></>}
      {section.name === "Preview" && <>{sections.filter((entry) => entry.fields).map((entry) => <section key={entry.name}><h3>{entry.label}</h3>{renderFields(entry)}</section>)}<button className="ec-primary" disabled={!staffId || busy} onClick={submitProfile}>Submit Profile for Review</button></>}
    </section>
  </Page>;
}

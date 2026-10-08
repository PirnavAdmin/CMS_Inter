import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, KeyRound, Upload, Download, Eye, FileText, LayoutGrid, List, Search, RefreshCw, FolderOpen, Trash2, UserRound, House, Landmark, GraduationCap, LockKeyhole, Pencil, Save, CalendarDays, Phone, Mail, MapPin, Building2, Globe, BookOpen, Users, Hash, Layers, Percent, Heart, Fingerprint } from "lucide-react";
import { getApiErrorMessage } from "@/api/axios.js";
import { ConfirmDialog, Modal, SkeletonPage, Toast } from "@/components/common/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import {
  changeCurrentStudentPassword,
  updateCurrentStudentProfile,
  uploadCurrentStudentDocument,
  uploadCurrentStudentPhoto,
  removeCurrentStudentPhoto,
  getStudentDocumentUrl,
  getCurrentStudentDocumentFile,
} from "../services/studentAcademicService.js";

const editableFields = [
  "mobileNumber", "email", "address", "city", "district", "state", "pincode", "bloodGroup", "aadhaarNumber", "nationality", "religion",
  "previousSchool", "previousHallTicketNumber", "previousBoard", "previousYearOfPassing", "previousPercentage", "fatherMobile",
  "motherMobile", "guardianMobile", "parentGuardianEmail",
];
const labels = {
  mobileNumber: "Mobile Number", email: "Email", address: "Address", city: "City", district: "District", state: "State", pincode: "Pincode",
  bloodGroup: "Blood Group", aadhaarNumber: "Aadhaar Number", nationality: "Nationality", religion: "Religion", previousSchool: "Previous School",
  previousHallTicketNumber: "Hall Ticket Number", previousBoard: "Previous Board", previousYearOfPassing: "Year of Passing", previousPercentage: "Previous Percentage",
  fatherMobile: "Father Mobile", motherMobile: "Mother Mobile", guardianMobile: "Guardian Mobile", parentGuardianEmail: "Parent / Guardian Email",
  gender: "Gender", dateOfBirth: "Date of Birth",
};
const groups = [
  ["personal", "Personal Details", UserRound, ["gender", "dateOfBirth", "mobileNumber", "email", "bloodGroup", "aadhaarNumber", "nationality", "religion"]],
  ["contact", "Contact & Address", House, ["address", "city", "district", "state", "pincode", "fatherMobile", "motherMobile", "guardianMobile", "parentGuardianEmail"]],
  ["previousSchool", "Previous School", Landmark, ["previousSchool", "previousHallTicketNumber", "previousBoard", "previousYearOfPassing", "previousPercentage"]],
];
const documents = [
  ["Birth Certificate", "BirthCertificate", "birthCertificate"], ["Transfer Certificate", "TransferCertificate", "transferCertificate"],
  ["Study Certificate", "StudyCertificate", "studyCertificate"], ["Aadhaar Document", "AadhaarDocument", "aadhaarDocument"],
  ["Community Certificate", "CommunityCertificate", "communityCertificate"], ["Income Certificate", "IncomeCertificate", "incomeCertificate"],
  ["Caste Certificate", "CasteCertificate", "casteCertificate"], ["Tenth Certificate", "TenthCertificate", "tenthCertificate"],
  ["Marks Memo", "MarksMemo", "marksMemo"],
];
const documentCategories = { BirthCertificate: "Identity", AadhaarDocument: "Identity", TransferCertificate: "Academic", StudyCertificate: "Academic", TenthCertificate: "Academic", MarksMemo: "Academic", IncomeCertificate: "Financial", CommunityCertificate: "Other", CasteCertificate: "Other" };
const documentFileName = (url) => {
  try { return decodeURIComponent(new URL(url).pathname.split("/").pop()); } catch { return ""; }
};
const academicRows = [
  [["Board", "boardName", Landmark], ["Academic Year", "academicYearName", CalendarDays], ["Academic Level", "academicLevelName", Layers], ["Group", "groupName", Users]],
  [["Programme", "programName", BookOpen], ["Section", "sectionName", Users], ["Roll Number", "rollNo", Hash], ["Admission Number", "admissionNo", FileText], ["Admission Date", "admissionDate", CalendarDays]],
];
const fieldIcons = { gender: UserRound, dateOfBirth: CalendarDays, mobileNumber: Phone, email: Mail, bloodGroup: Heart, aadhaarNumber: Fingerprint, nationality: Globe, religion: Landmark, address: MapPin, city: Building2, district: MapPin, state: Globe, pincode: Hash, previousSchool: Landmark, previousHallTicketNumber: Hash, previousBoard: GraduationCap, previousYearOfPassing: CalendarDays, previousPercentage: Percent, fatherMobile: Phone, motherMobile: Phone, guardianMobile: Phone, parentGuardianEmail: Mail };
const buildProfilePayload = (profile, draft, fields) => Object.fromEntries(editableFields.map((key) => {
  if (!fields.includes(key)) return [key, profile?.[key] ?? null];
  const value = String(draft[key] ?? "").trim();
  return [key, ["previousYearOfPassing", "previousPercentage"].includes(key) ? value === "" ? null : Number(value) : value];
}));
const emails = new Set(["email", "parentGuardianEmail"]);
const mobiles = new Set(["mobileNumber", "fatherMobile", "motherMobile", "guardianMobile"]);
const names = new Set(["nationality", "religion", "city", "district", "state"]);
const bloodGroups = new Set(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);
const display = (value, assignment = false) => value === null || value === undefined || value === "" ? (assignment ? "Not Assigned" : "Not Provided") : String(value);
const dateDisplay = (value) => value ? new Date(value).toLocaleDateString("en-IN") : "Not Provided";

const validateField = (name, rawValue) => {
  const value = String(rawValue ?? "").trim();
  if (!value) return "";
  if (name === "bloodGroup" && !bloodGroups.has(value)) return "Select a valid blood group.";
  if (name === "aadhaarNumber" && !/^\d{12}$/.test(value)) return "Aadhaar number must contain exactly 12 digits.";
  if (mobiles.has(name) && !/^\d{10}$/.test(value)) return "Mobile number must contain exactly 10 digits.";
  if (emails.has(name) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address.";
  if (names.has(name) && (!/^[A-Za-z ]+$/.test(value) || value.length > 60)) return "Use letters and spaces only (maximum 60 characters).";
  if (name === "pincode" && !/^\d{6}$/.test(value)) return "Pincode must contain exactly 6 digits.";
  if (name === "address" && value.length > 250) return "Address must not exceed 250 characters.";
  if (["previousSchool", "previousBoard"].includes(name) && value.length > 120) return "Value must not exceed 120 characters.";
  if (name === "previousHallTicketNumber" && !/^[A-Za-z0-9\-/ ]+$/.test(value)) return "Use letters, numbers, spaces, hyphens or slashes only.";
  if (name === "previousYearOfPassing" && (!/^\d{4}$/.test(value) || Number(value) > new Date().getFullYear())) return "Enter a valid, non-future 4-digit year.";
  if (name === "previousPercentage" && (!/^\d+(\.\d+)?$/.test(value) || Number(value) < 0 || Number(value) > 100)) return "Percentage must be between 0 and 100.";
  return "";
};

export default function StudentProfile() {
  const { profile, loading, error, refreshProfile, photoUrl, photoError, photoLoading, applyPhotoRemoval } = useStudentProfile();
  const [draft, setDraft] = useState({});
  const [editingSection, setEditingSection] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwords, setPasswords] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const photoRef = useRef(null);
  const videoRef = useRef(null);
  const cameraSessionRef = useRef(0);
  const [photoMode, setPhotoMode] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoCandidateUrl, setPhotoCandidateUrl] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [removePhotoOpen, setRemovePhotoOpen] = useState(false);
  const [photoFlowError, setPhotoFlowError] = useState("");
  const [failedPhotoUrl, setFailedPhotoUrl] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [candidateFailed, setCandidateFailed] = useState(false);

  useEffect(() => {
    if (!photoFile) { setPhotoCandidateUrl(""); return; }
    const url = URL.createObjectURL(photoFile);
    setPhotoCandidateUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  useEffect(() => {
    if (photoMode !== "camera" || photoFile) return;
    const session = ++cameraSessionRef.current;
    let stream;
    let cancelled = false;
    setCameraReady(false);
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access is unavailable. Use HTTPS or localhost, or upload a photo instead.");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (cancelled || cameraSessionRef.current !== session) { stream.getTracks().forEach((track) => track.stop()); return; }
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      } catch (cameraError) {
        if (stream) stream.getTracks().forEach((track) => track.stop());
        if (!cancelled) setPhotoFlowError(cameraError.name === "NotAllowedError" ? "Camera permission was denied. Allow camera access in your browser or upload a photo." : cameraError.name === "NotFoundError" ? "No camera was found. Upload a photo instead." : cameraError.name === "NotReadableError" ? "The camera is busy or unavailable. Close other camera apps and try again." : cameraError.message || "Unable to start the camera. Upload a photo instead.");
      }
    };
    start();
    return () => { cancelled = true; cameraSessionRef.current += 1; if (stream) stream.getTracks().forEach((track) => track.stop()); };
  }, [photoMode, photoFile]);
  const documentInputRef = useRef(null);
  const [documentFilter, setDocumentFilter] = useState("All");
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentView, setDocumentView] = useState("grid");
  const [documentBusy, setDocumentBusy] = useState("");
  const [documentError, setDocumentError] = useState("");
  const [uploadType, setUploadType] = useState(documents[0][1]);
  const [documentPreview, setDocumentPreview] = useState(null);
  useEffect(() => () => { if (documentPreview?.url) URL.revokeObjectURL(documentPreview.url); }, [documentPreview]);

  const initials = useMemo(() => String(profile?.studentName || "Student").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(), [profile]);
  const notify = (message, type = "success") => setToast({ message, type });
  const sectionFields = groups.find(([id]) => id === editingSection)?.[3].filter((key) => editableFields.includes(key)) ?? [];
  const beginEdit = (id) => {
    if (editingSection || saving) return;
    setDraft(Object.fromEntries(editableFields.map((key) => [key, profile?.[key] ?? ""])));
    setErrors({}); setEditingSection(id);
  };
  const cancelEdit = () => { if (!saving) { setDraft({}); setErrors({}); setEditingSection(null); } };
  const change = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: validateField(key, value) }));
  };
  const save = async () => {
    if (!editingSection || saving) return;
    const nextErrors = Object.fromEntries(sectionFields.map((key) => [key, validateField(key, draft[key])]).filter(([, message]) => message));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { notify("Please correct the highlighted profile fields.", "warning"); return; }
    const payload = buildProfilePayload(profile, draft, sectionFields);
    setSaving(true);
    try {
      await updateCurrentStudentProfile(payload);
      setEditingSection(null); setDraft({}); setErrors({});
      try { await refreshProfile(); notify("Profile updated successfully."); }
      catch (requestError) { notify(`Changes saved, but the profile could not be refreshed. ${getApiErrorMessage(requestError)}`, "warning"); }
    }
    catch (requestError) { notify(getApiErrorMessage(requestError), "error"); }
    finally { setSaving(false); }
  };
  const photoAvailable = Boolean(photoUrl && failedPhotoUrl !== photoUrl);
  const openPhotoMenu = () => { setPhotoFlowError(""); setPhotoFile(null); setPhotoMode("menu"); };
  const closePhotoFlow = () => { if (!photoBusy) { setPhotoMode(null); setPhotoFile(null); setPhotoFlowError(""); } };
  const selectPhoto = (event) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    const validation = !file.size ? "Select a non-empty image file." : !/\.(jpe?g|png|webp)$/i.test(file.name) ? "Only JPG, JPEG, PNG, and WEBP photos are supported." : file.size > 5 * 1024 * 1024 ? "Photo file size cannot exceed 5 MB." : "";
    setPhotoFlowError(validation);
    if (validation) return;
    setCandidateFailed(false); setPhotoFile(file); setPhotoMode("upload");
  };
  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    const session = cameraSessionRef.current;
    const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) { setPhotoFlowError("Unable to capture a photo. Please upload an image instead."); return; }
    context.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (session !== cameraSessionRef.current) return;
      if (!blob) { setPhotoFlowError("Unable to capture the photo. Please try again."); return; }
      setCandidateFailed(false); setPhotoFile(new File([blob], "profile-photo.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };
  const uploadPhoto = async () => {
    if (!photoFile || photoBusy || candidateFailed) return;
    if (photoFile.size > 5 * 1024 * 1024) { setPhotoFlowError("Photo file size cannot exceed 5 MB."); return; }
    setPhotoBusy(true); setPhotoFlowError("");
    try {
      await uploadCurrentStudentPhoto(photoFile);
      setPhotoMode("menu"); setPhotoFile(null);
      try { await refreshProfile(); notify("Photo uploaded successfully."); }
      catch (requestError) { setPhotoFlowError(`Photo saved, but the profile could not be refreshed. ${getApiErrorMessage(requestError)}`); }
    }
    catch (requestError) { const message = getApiErrorMessage(requestError); setPhotoFlowError(message); notify(message, "error"); }
    finally { setPhotoBusy(false); }
  };
  const removePhoto = async () => {
    if (photoBusy) return;
    setPhotoBusy(true); setPhotoFlowError("");
    try {
      await removeCurrentStudentPhoto();
      applyPhotoRemoval();
      setRemovePhotoOpen(false); setPhotoMode("menu");
      notify("Profile photo removed successfully.");
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setRemovePhotoOpen(false); setPhotoMode("menu"); setPhotoFlowError(message); notify(message, "error");
    } finally { setPhotoBusy(false); }
  };
  const uploadDocument = async (type, file) => {
    if (documentBusy) return;
    setDocumentError("");
    const validation = !file?.size ? "Select a valid, non-empty document." : !/\.(pdf|jpe?g|png)$/i.test(file.name) ? "Only PDF, JPG, JPEG, and PNG documents are supported." : file.size > 10 * 1024 * 1024 ? "Document file size cannot exceed 10 MB." : "";
    if (validation) { setDocumentError(validation); return; }
    setDocumentBusy(type);
    try { await uploadCurrentStudentDocument(type, file); await refreshProfile(); notify("Document uploaded successfully."); }
    catch (requestError) { const message = getApiErrorMessage(requestError); setDocumentError(message); notify(message, "error"); }
    finally { setDocumentBusy(""); }
  };
  const chooseDocument = (type) => { setUploadType(type); setDocumentError(""); documentInputRef.current?.click(); };
  const openDocument = async (label, type, path, download = false) => {
    if (documentBusy) return;
    setDocumentBusy(type); setDocumentError("");
    try {
      const blob = await getCurrentStudentDocumentFile(path);
      const url = URL.createObjectURL(blob);
      if (download) {
        const link = document.createElement("a"); link.href = url; link.download = documentFileName(getStudentDocumentUrl(path));
        document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else setDocumentPreview({ label, url, image: /\.(png|jpe?g)(\?|$)/i.test(path) });
    } catch (requestError) { const message = getApiErrorMessage(requestError); setDocumentError(message); notify(message, "error"); }
    finally { setDocumentBusy(""); }
  };
  const changePassword = async () => {
    if (!passwords.oldPassword || !passwords.newPassword || passwords.newPassword !== passwords.confirmPassword) { notify("Enter your current password and ensure the new passwords match.", "warning"); return; }
    setPasswordSaving(true);
    try { await changeCurrentStudentPassword(passwords); setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" }); setPasswordOpen(false); await refreshProfile(); notify("Password changed successfully."); }
    catch (requestError) { notify(getApiErrorMessage(requestError), "error"); }
    finally { setPasswordSaving(false); }
  };

  if (error && !profile) return <div className="sp-page"><StudentEmptyState title="Unable to load profile" text={error}/></div>;
  if (loading && !profile) return <div className="sp-page"><SkeletonPage variant="form" rows={8}/></div>;
  return <>
    <div className="sp-page sp-profile-page">
      <StudentPageHeader title="My Profile" subtitle="Review and maintain your permitted student information." action={<div className="sp-actions"><button className="sp-btn" onClick={() => setPasswordOpen(true)}><KeyRound size={15}/> Change Password</button><button className="sp-btn primary" disabled={Boolean(editingSection) || saving} title={editingSection ? "Save or cancel the current section first" : "Edit personal details"} onClick={() => beginEdit("personal")}><Pencil size={15}/> Edit Profile</button></div>}/>
      <section className="sp-profile-hero"><div className="sp-photo-control"><button className="sp-photo-avatar-button" onClick={openPhotoMenu} aria-label="Open profile photo options" title="Profile photo">{photoAvailable ? <img className="sp-profile-photo" src={photoUrl} alt={profile?.studentName} onError={() => setFailedPhotoUrl(photoUrl)}/> : <span className="sp-avatar is-xl">{initials}</span>}</button><button className="sp-photo-camera-button" onClick={openPhotoMenu} aria-label="Change profile photo" title="Change profile photo"><Camera size={16}/></button></div><div><h2>{profile?.studentName}</h2><p>Student ID: {profile?.studentId} • Roll No: {display(profile?.rollNo, true)} • {display(profile?.sectionName, true)}</p></div><input ref={photoRef} type="file" accept=".jpg,.jpeg,.png,.webp" hidden onChange={selectPhoto}/></section>
      <div className={`sp-profile-sections ${editingSection ? "has-editing" : ""}`}>
        {groups.map(([id, title, SectionIcon, fields]) => {
          const active = editingSection === id;
          const renderField = (key) => {
            const Icon = fieldIcons[key] || FileText;
            const permitted = editableFields.includes(key);
            const value = key === "dateOfBirth" ? dateDisplay(profile?.[key]) : key === "previousPercentage" && profile?.[key] != null ? `${profile[key]}%` : display(profile?.[key]);
            if (!active || !permitted) return <div className={`sp-profile-value ${key === "address" ? "is-address" : ""}`} key={key}><span className="sp-profile-field-icon"><Icon size={18}/></span><div><small>{labels[key]}{active && !permitted ? <LockKeyhole size={11} title="College managed"/> : null}</small><strong>{value}</strong></div></div>;
            const inputProps = { id: `profile-${key}`, value: draft[key] ?? "", disabled: saving, className: errors[key] ? "is-invalid" : "", "aria-invalid": Boolean(errors[key]), "aria-describedby": errors[key] ? `profile-${key}-error` : undefined, onChange: (event) => change(key, event.target.value), onBlur: () => setErrors((current) => ({ ...current, [key]: validateField(key, draft[key]) })) };
            return <label className={`sp-profile-input ${key === "address" ? "is-address" : ""}`} key={key}><span>{labels[key]}</span>{key === "bloodGroup" ? <select {...inputProps}><option value="">Not Provided</option>{[...bloodGroups].map((group) => <option key={group}>{group}</option>)}</select> : key === "address" ? <textarea {...inputProps} rows={2}/> : <input {...inputProps} type={emails.has(key) ? "email" : mobiles.has(key) ? "tel" : ["previousYearOfPassing", "previousPercentage"].includes(key) ? "number" : "text"} step={key === "previousPercentage" ? "any" : undefined} inputMode={mobiles.has(key) || ["pincode", "aadhaarNumber", "previousYearOfPassing"].includes(key) ? "numeric" : undefined}/>}{errors[key] ? <small className="sp-field-error" id={`profile-${key}-error`}>{errors[key]}</small> : null}</label>;
          };
          const primaryFields = id === "contact" ? fields.slice(0, 5) : fields;
          return <StudentCard key={id} className={`sp-profile-section section-${id} ${active ? "is-editing" : ""}`} title={<><SectionIcon size={20}/>{title}</>} action={active ? <div className="sp-actions"><button className="sp-btn" disabled={saving} onClick={cancelEdit}>Cancel</button><button className="sp-btn primary" disabled={saving} onClick={save}><Save size={14}/>{saving ? "Saving..." : "Save Changes"}</button></div> : <button className="sp-profile-edit" disabled={Boolean(editingSection)} title={editingSection ? "Save or cancel the current section first" : `Edit ${title}`} aria-label={`Edit ${title}`} onClick={() => beginEdit(id)}><Pencil size={13}/> Edit</button>}>
            <div className={`sp-profile-fields ${id === "contact" ? "sp-profile-address-fields" : ""} ${active ? "is-form" : ""}`}>{primaryFields.map(renderField)}</div>
            {id === "contact" ? <div className="sp-profile-parent"><h3>Parent / Guardian</h3><div className={`sp-profile-fields ${active ? "is-form" : ""}`}>{fields.slice(5).map(renderField)}</div></div> : null}
          </StudentCard>;
        })}
      </div>
      <StudentCard className="sp-profile-academic" title={<><GraduationCap size={21}/>Academic Information</>} action={<span className="sp-college-managed"><LockKeyhole size={13}/> College Managed</span>}>
        {academicRows.map((row, index) => <div className="sp-profile-academic-row" key={index}>{row.map(([label, key, Icon]) => <div className="sp-profile-value" key={key}><span className="sp-profile-field-icon"><Icon size={20}/></span><div><small>{label}</small><strong>{key === "admissionDate" ? dateDisplay(profile?.[key]) : display(profile?.[key], ["rollNo", "sectionName"].includes(key))}</strong></div></div>)}</div>)}
      </StudentCard>
      <StudentCard className="sp-documents" title="Student Documents" subtitle="Upload or replace documents stored against your student record.">
        <input ref={documentInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) uploadDocument(uploadType, file); }}/>
        <div className="sp-doc-toolbar">
          <div className="sp-doc-filters" role="group" aria-label="Document categories">{["All", "Academic", "Identity", "Financial", "Other"].map((category) => <button key={category} aria-pressed={documentFilter === category} className={documentFilter === category ? "is-active" : ""} onClick={() => setDocumentFilter(category)}>{category} ({documents.filter(([, type]) => category === "All" || documentCategories[type] === category).length})</button>)}</div>
          <div className="sp-doc-controls"><div className="sp-doc-view" role="group" aria-label="Document view">{[["grid", LayoutGrid], ["list", List]].map(([view, Icon]) => <button key={view} title={`${view} view`} aria-label={`${view} view`} aria-pressed={documentView === view} className={`sp-icon-action ${documentView === view ? "is-active" : ""}`} onClick={() => setDocumentView(view)}><Icon size={17}/></button>)}</div><label className="sp-doc-search"><Search size={17}/><input aria-label="Search documents" placeholder="Search documents..." value={documentSearch} onChange={(event) => setDocumentSearch(event.target.value)}/></label></div>
        </div>
        {documentError || error ? <p className="sp-doc-error" role="alert">{documentError || error}</p> : null}
        <div className={`sp-doc-grid ${documentView === "list" ? "is-list" : ""}`} aria-busy={Boolean(documentBusy) || loading}>
          {documents.filter(([label, type]) => (documentFilter === "All" || documentCategories[type] === documentFilter) && `${label} ${type}`.toLowerCase().includes(documentSearch.trim().toLowerCase())).map(([label, type, key]) => {
            const path = profile?.[key]; const url = getStudentDocumentUrl(path); const available = Boolean(path); const category = documentCategories[type];
            const filename = documentFileName(url);
            return <article className={`sp-doc-card ${available ? "is-uploaded" : "is-missing"}`} key={type}>
              <div className="sp-doc-thumbnail"><FileText size={30}/>{url && /\.(png|jpe?g)(\?|$)/i.test(url) ? <img key={url} src={url} alt={`${label} thumbnail`} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }}/> : null}</div>
              <div className="sp-doc-info"><h3>{label}</h3><span className="sp-doc-category">{category}</span><p>{documentBusy === type ? "Processing..." : available ? "Available" : "Not Uploaded"}</p></div>
              <div className="sp-doc-footer"><div className="sp-doc-filename">{filename ? <><FileText size={16}/><span title={filename}>{filename}</span></> : <span>{available ? "Document uploaded" : "Awaiting upload"}</span>}</div><div className="sp-doc-actions">
                {available && url ? <><button className="sp-icon-action" title={`View ${label}`} aria-label={`View ${label}`} disabled={Boolean(documentBusy)} onClick={() => openDocument(label, type, path)}><Eye size={16}/></button><button className="sp-icon-action" title={`Download ${label}`} aria-label={`Download ${label}`} disabled={Boolean(documentBusy)} onClick={() => openDocument(label, type, path, true)}><Download size={16}/></button></> : null}
                <button className="sp-icon-action" title={`${available ? "Replace" : "Upload"} ${label}`} aria-label={`${available ? "Replace" : "Upload"} ${label}`} disabled={Boolean(documentBusy)} onClick={() => chooseDocument(type)}>{available ? <RefreshCw size={15}/> : <Upload size={16}/>}</button>
              </div></div>
            </article>;
          })}
        </div>
        {!documents.some(([label, type]) => (documentFilter === "All" || documentCategories[type] === documentFilter) && `${label} ${type}`.toLowerCase().includes(documentSearch.trim().toLowerCase())) ? <p className="sp-doc-empty">No documents match your search.</p> : null}
      </StudentCard>
    </div>
    {passwordOpen ? <Modal title="Change Password" onClose={() => setPasswordOpen(false)} footer={<><button className="cms-btn" onClick={() => setPasswordOpen(false)}>Cancel</button><button className="cms-btn cms-btn-primary" disabled={passwordSaving} onClick={changePassword}>{passwordSaving ? "Changing..." : "Change Password"}</button></>}><div className="sp-password-form">{[["oldPassword", "Current Password"], ["newPassword", "New Password"], ["confirmPassword", "Confirm New Password"]].map(([key, label]) => <label key={key}><span>{label}</span><input type="password" value={passwords[key]} onChange={(event) => setPasswords((current) => ({ ...current, [key]: event.target.value }))}/></label>)}</div></Modal> : null}
    {documentPreview ? <Modal className="sp-doc-modal" title={documentPreview.label} onClose={() => setDocumentPreview(null)}>{documentPreview.image ? <img className="sp-doc-preview-image" src={documentPreview.url} alt={documentPreview.label}/> : <iframe className="sp-doc-preview-frame" title={documentPreview.label} src={documentPreview.url}/>}</Modal> : null}
    {photoMode && !removePhotoOpen ? <Modal className={`sp-photo-modal ${photoMode === "view" ? "is-preview" : ""}`} title={photoMode === "camera" ? "Take Photo" : photoMode === "upload" ? "Upload Photo" : "Profile Photo"} onClose={closePhotoFlow} closeOnOverlay={!photoBusy} footer={photoMode === "camera" || photoMode === "upload" ? <><button className="cms-btn" disabled={photoBusy} onClick={() => { setPhotoFile(null); setPhotoFlowError(""); setPhotoMode("menu"); }}>Cancel</button>{photoMode === "camera" && photoFile ? <button className="cms-btn" disabled={photoBusy} onClick={() => { setPhotoFile(null); setCandidateFailed(false); setPhotoFlowError(""); }}>Retake</button> : null}{photoMode === "camera" && !photoFile ? <button className="cms-btn cms-btn-primary" disabled={!cameraReady || Boolean(photoFlowError)} onClick={capturePhoto}><Camera size={15}/> Capture</button> : <button className="cms-btn cms-btn-primary" disabled={photoBusy || !photoCandidateUrl || candidateFailed} onClick={uploadPhoto}>{photoBusy ? "Saving..." : photoMode === "camera" ? "Use Photo" : "Save Photo"}</button>}</> : photoMode === "view" ? <button className="cms-btn" onClick={() => setPhotoMode("menu")}>Back</button> : null}>
      {photoMode === "menu" ? <><div className="sp-photo-summary">{photoAvailable ? <img src={photoUrl} alt={profile?.studentName} onError={() => setFailedPhotoUrl(photoUrl)}/> : <span className="sp-photo-initials">{initials}</span>}<h3>{profile?.studentName || "Student"}</h3><p>Roll No: {display(profile?.rollNo, true)} • {display(profile?.sectionName, true)}</p></div><div className="sp-photo-menu"><button disabled={!photoAvailable || photoLoading || photoBusy} onClick={() => setPhotoMode("view")}><Eye size={20}/> View photo</button><button disabled={photoBusy} onClick={() => { setPhotoFlowError(""); setPhotoFile(null); setPhotoMode("camera"); }}><Camera size={20}/> Take photo</button><button disabled={photoBusy} onClick={() => { setPhotoFlowError(""); photoRef.current?.click(); }}><FolderOpen size={20}/> Upload photo</button><div className="sp-photo-menu-divider"/><button className="is-danger" disabled={!profile?.photo || photoBusy} onClick={() => setRemovePhotoOpen(true)}><Trash2 size={20}/> Remove photo</button></div></> : null}
      {photoMode === "view" ? photoAvailable ? <img className="sp-photo-large-preview" src={photoUrl} alt={`${profile?.studentName || "Student"} profile photo`} onError={() => setFailedPhotoUrl(photoUrl)}/> : <p className="sp-photo-message">The current photo is unavailable.</p> : null}
      {photoMode === "camera" && !photoFile ? <div className="sp-photo-capture"><video ref={videoRef} autoPlay playsInline muted aria-label="Live camera preview" onLoadedData={() => setCameraReady(true)}/>{!cameraReady && !photoFlowError ? <p role="status">Starting camera...</p> : null}</div> : null}
      {(photoMode === "upload" || photoMode === "camera") && photoCandidateUrl ? <img className="sp-photo-large-preview" src={photoCandidateUrl} alt="Selected photo preview" onLoad={() => setCandidateFailed(false)} onError={() => { setCandidateFailed(true); setPhotoFlowError("This file could not be opened as an image. Select another photo."); }}/> : null}
      {photoMode === "upload" ? <p className="sp-photo-message">JPG, JPEG, PNG or WEBP · Maximum 5 MB.<br/>Your photo will be saved when you select Save Photo.</p> : null}
      {photoLoading && photoMode === "menu" ? <p className="sp-photo-message" role="status">Loading photo...</p> : null}
      {photoFlowError || (photoMode === "menu" && photoError) ? <p className="sp-photo-error" role="alert">{photoFlowError || "The current photo could not be loaded. You can upload a replacement."}</p> : null}
    </Modal> : null}
    {removePhotoOpen ? <ConfirmDialog title="Remove profile photo?" message="Are you sure you want to remove your profile photo?" confirmLabel="Remove Photo" loadingLabel="Removing..." danger loading={photoBusy} onCancel={() => { if (!photoBusy) setRemovePhotoOpen(false); }} onConfirm={removePhoto}/> : null}
    <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })}/>
  </>;
}

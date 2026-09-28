import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, KeyRound, Upload } from "lucide-react";
import { getApiErrorMessage } from "@/api/axios.js";
import { Modal, SkeletonPage, Toast } from "@/components/common/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import {
  changeCurrentStudentPassword,
  updateCurrentStudentProfile,
  uploadCurrentStudentDocument,
  uploadCurrentStudentPhoto,
} from "../services/studentAcademicService.js";

const editableFields = [
  "mobileNumber", "email", "address", "city", "district", "state", "pincode", "bloodGroup", "aadhaarNumber", "nationality", "religion",
  "previousSchool", "previousHallTicketNumber", "previousBoard", "previousYearOfPassing", "previousPercentage", "fatherMobile", "fatherEmail",
  "motherMobile", "motherEmail", "guardianMobile", "guardianEmail",
];
const labels = {
  mobileNumber: "Mobile Number", email: "Email", address: "Address", city: "City", district: "District", state: "State", pincode: "Pincode",
  bloodGroup: "Blood Group", aadhaarNumber: "Aadhaar Number", nationality: "Nationality", religion: "Religion", previousSchool: "Previous School",
  previousHallTicketNumber: "Hall Ticket Number", previousBoard: "Previous Board", previousYearOfPassing: "Year of Passing", previousPercentage: "Previous Percentage",
  fatherMobile: "Father Mobile", fatherEmail: "Father Email", motherMobile: "Mother Mobile", motherEmail: "Mother Email", guardianMobile: "Guardian Mobile", guardianEmail: "Guardian Email",
};
const groups = [
  ["Personal Details", ["bloodGroup", "aadhaarNumber", "nationality", "religion"]],
  ["Contact & Address", ["mobileNumber", "email", "address", "city", "district", "state", "pincode"]],
  ["Parent / Guardian", ["fatherMobile", "fatherEmail", "motherMobile", "motherEmail", "guardianMobile", "guardianEmail"]],
  ["Previous School", ["previousSchool", "previousHallTicketNumber", "previousBoard", "previousYearOfPassing", "previousPercentage"]],
];
const documents = [
  ["Birth Certificate", "BirthCertificate", "birthCertificate"], ["Transfer Certificate", "TransferCertificate", "transferCertificate"],
  ["Study Certificate", "StudyCertificate", "studyCertificate"], ["Aadhaar Document", "AadhaarDocument", "aadhaarDocument"],
  ["Community Certificate", "CommunityCertificate", "communityCertificate"], ["Income Certificate", "IncomeCertificate", "incomeCertificate"],
  ["Caste Certificate", "CasteCertificate", "casteCertificate"], ["Tenth Certificate", "TenthCertificate", "tenthCertificate"],
  ["Marks Memo", "MarksMemo", "marksMemo"],
];
const managedFields = [
  ["Student ID", "studentId"], ["Student Name", "studentName"], ["Gender", "gender"], ["Date of Birth", "dateOfBirth"],
  ["Admission Number", "admissionNo"], ["Admission Date", "admissionDate"], ["Board", "boardName"], ["Academic Year", "academicYearName"],
  ["Academic Level", "academicLevelName"], ["Group", "groupName"], ["Program", "programName"], ["Section", "sectionName"],
  ["Roll Number", "rollNo"], ["Student Status", "status"], ["Active", "isActive"],
];
const emails = new Set(["email", "fatherEmail", "motherEmail", "guardianEmail"]);
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
  const { profile, loading, error, refreshProfile } = useStudentProfile();
  const [draft, setDraft] = useState({});
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwords, setPasswords] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const photoRef = useRef(null);

  useEffect(() => {
    if (!profile) return;
    setDraft(Object.fromEntries(editableFields.map((key) => [key, profile[key] ?? ""])));
  }, [profile]);

  const initials = useMemo(() => String(profile?.studentName || "Student").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(), [profile]);
  const notify = (message, type = "success") => setToast({ message, type });
  const validateAll = () => Object.fromEntries(editableFields.map((key) => [key, validateField(key, draft[key])]).filter(([, message]) => message));
  const change = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: validateField(key, value) }));
  };
  const save = async () => {
    const nextErrors = validateAll();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { notify("Please correct the highlighted profile fields.", "warning"); return; }
    const payload = Object.fromEntries(editableFields.map((key) => {
      const value = String(draft[key] ?? "").trim();
      return [key, ["previousYearOfPassing", "previousPercentage"].includes(key) ? Number(value || 0) : value];
    }));
    setSaving(true);
    try { await updateCurrentStudentProfile(payload); await refreshProfile(); setEditing(false); notify("Profile updated successfully."); }
    catch (requestError) { notify(getApiErrorMessage(requestError), "error"); }
    finally { setSaving(false); }
  };
  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || !file.size || !file.type.startsWith("image/")) { notify("Select a valid, non-empty image file.", "error"); return; }
    try { await uploadCurrentStudentPhoto(file); await refreshProfile(); notify("Photo uploaded successfully."); }
    catch (requestError) { notify(getApiErrorMessage(requestError), "error"); }
  };
  const uploadDocument = async (type, event) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || !file.size) { notify("Select a valid, non-empty document.", "error"); return; }
    try { await uploadCurrentStudentDocument(type, file); await refreshProfile(); notify("Document uploaded successfully."); }
    catch (requestError) { notify(getApiErrorMessage(requestError), "error"); }
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
    <div className="sp-page">
      <StudentPageHeader title="My Profile" subtitle="Review and maintain your permitted student information." action={<div className="sp-actions"><button className="sp-btn" onClick={() => setPasswordOpen(true)}><KeyRound size={15}/> Change Password</button>{editing ? <><button className="sp-btn" onClick={() => { setEditing(false); setErrors({}); setDraft(Object.fromEntries(editableFields.map((key) => [key, profile?.[key] ?? ""]))); }}>Cancel</button><button className="sp-btn primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button></> : <button className="sp-btn primary" onClick={() => setEditing(true)}>Edit Profile</button>}</div>}/>
      <section className="sp-profile-hero">{profile?.photo ? <img className="sp-profile-photo" src={profile.photo} alt={profile.studentName}/> : <span className="sp-avatar is-xl">{initials}</span>}<div><h2>{profile?.studentName}</h2><p>Student ID: {profile?.studentId} • Roll No: {display(profile?.rollNo, true)} • {display(profile?.sectionName, true)}</p></div><button className="sp-icon-action" onClick={() => photoRef.current?.click()} title="Upload photo"><Camera size={17}/></button><input ref={photoRef} type="file" accept="image/*" hidden onChange={uploadPhoto}/></section>
      {groups.map(([title, fields]) => <StudentCard key={title} title={title} subtitle={editing ? "You can update these details." : "Student-editable information"}><div className="sp-form-grid">{fields.map((key) => <label key={key}><span>{labels[key]}</span><input className={errors[key] ? "is-invalid" : ""} value={draft[key] ?? ""} disabled={!editing} onBlur={() => editing && setErrors((current) => ({ ...current, [key]: validateField(key, draft[key]) }))} onChange={(event) => change(key, event.target.value)}/>{editing && errors[key] ? <small className="sp-field-error">{errors[key]}</small> : null}</label>)}</div></StudentCard>)}
      <StudentCard title="College-Managed Academic Information" subtitle="Contact the college office if a correction is required."><div className="sp-managed-grid">{managedFields.map(([label, key]) => <div key={key}><span>{label}</span><strong title={String(profile?.[key] ?? "")}>{["dateOfBirth", "admissionDate"].includes(key) ? dateDisplay(profile?.[key]) : key === "isActive" ? (profile?.isActive ? "Yes" : "No") : display(profile?.[key], ["rollNo", "sectionName"].includes(key))}</strong></div>)}</div></StudentCard>
      <StudentCard title="Student Documents" subtitle="Upload or replace documents stored against your student record."><div className="sp-document-grid">{documents.map(([label, type, key]) => <label key={type}><span><small>{label}</small><strong>{profile?.[key] ? "Available" : "Not Uploaded"}</strong></span><input type="file" hidden onChange={(event) => uploadDocument(type, event)}/><i><Upload size={16}/></i></label>)}</div></StudentCard>
    </div>
    {passwordOpen ? <Modal title="Change Password" onClose={() => setPasswordOpen(false)} footer={<><button className="cms-btn" onClick={() => setPasswordOpen(false)}>Cancel</button><button className="cms-btn cms-btn-primary" disabled={passwordSaving} onClick={changePassword}>{passwordSaving ? "Changing..." : "Change Password"}</button></>}><div className="sp-password-form">{[["oldPassword", "Current Password"], ["newPassword", "New Password"], ["confirmPassword", "Confirm New Password"]].map(([key, label]) => <label key={key}><span>{label}</span><input type="password" value={passwords[key]} onChange={(event) => setPasswords((current) => ({ ...current, [key]: event.target.value }))}/></label>)}</div></Modal> : null}
    <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })}/>
  </>;
}

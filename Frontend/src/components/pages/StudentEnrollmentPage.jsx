import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { env } from "@/config/env.js";
import "./StudentManagementPage.css";

const emptyForm = () => ({ admissionId: "", admissionNo: "", admissionNumber: "", admissionDate: "", admissionType: "", admissionQuota: "", medium: "", secondLanguage: "", studentName: "", photo: "", gender: "", dateOfBirth: "", bloodGroup: "", email: "", mobileNumber: "", aadhaarNumber: "", nationality: "", religion: "", category: "", address: "", city: "", district: "", state: "", pincode: "", boardId: "", academicYearId: "", academicLevelId: "", groupId: "", programId: "", sectionId: "", rollNo: "", rollNumber: "", feeStructureId: "", paymentPlan: "", previousSchool: "", previousHallTicketNumber: "", previousBoard: "", previousYearOfPassing: "", previousPercentage: "", studentCategory: "", scholarshipStatus: "", scholarshipAmount: "", fatherName: "", fatherOccupation: "", fatherMobile: "", fatherEmail: "", motherName: "", motherOccupation: "", motherMobile: "", motherEmail: "", guardianName: "", guardianMobile: "", guardianEmail: "", annualIncome: "", remarks: "" });
const valueOf = (record, ...keys) => keys.map((key) => record?.[key]).find((value) => value !== undefined && value !== null) ?? "";
const asList = (value) => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : Array.isArray(value?.Data) ? value.Data : Array.isArray(value?.items) ? value.items : Array.isArray(value?.Items) ? value.Items : Array.isArray(value?.results) ? value.results : Array.isArray(value?.Results) ? value.Results : [];
const optionsFrom = (response, idKeys, labelKeys) => asList(response).map((item) => ({
  value: String(valueOf(item, ...idKeys)),
  label: String(valueOf(item, ...labelKeys)),
})).filter((item) => item.value && item.label);
const asDateInput = (value) => value ? String(value).slice(0, 10) : "";
const stringValue = (value) => String(value ?? "");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const personNamePattern = /^[\p{L}][\p{L} .'-]*$/u;
const placePattern = /^[\p{L}][\p{L} .,'()-]*$/u;
const digitsOnly = (value, maximum) => String(value).replace(/\D/g, "").slice(0, maximum);
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const mediumOptions = ["Telugu", "English", "Hindi"];
const secondLanguageOptions = ["Sanskrit", "Telugu", "Hindi", "French"];
const genderOptions = ["Male", "Female", "Other"];
const categoryOptions = ["General", "OBC", "SC", "ST", "EWS"];
const imageUrl = (value) => {
  const path = String(value ?? "").trim();
  if (!path || /^(?:https?:|blob:|data:)/i.test(path)) return path;
  return `${env.apiBaseUrl.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
};
const initialsOf = (name) => String(name ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ST";
const fieldKeys = ["admissionNo", "admissionNumber", "admissionDate", "studentName", "gender", "dateOfBirth", "email", "mobileNumber", "aadhaarNumber", "nationality", "address", "city", "district", "state", "pincode", "rollNo", "rollNumber", "previousYearOfPassing", "previousPercentage", "fatherName", "fatherOccupation", "fatherMobile", "fatherEmail", "motherName", "motherOccupation", "motherMobile", "motherEmail", "guardianName", "guardianMobile", "guardianEmail"];
const studentUpdateError = (error) => {
  const response = error?.response?.data ?? error?.data ?? {};
  const details = String(response?.details ?? response?.Details ?? "");
  if (/UX_Students_AadhaarNumber|duplicate entry.*aadhaar/i.test(details)) return "This Aadhaar number is already assigned to another student.";
  return getApiErrorMessage(error) || "Unable to update the student profile.";
};
const unwrapStudent = (payload) => {
  let current = payload;
  for (let index = 0; index < 4 && current && typeof current === "object" && !Array.isArray(current); index += 1) {
    const next = current.data ?? current.Data ?? current.result ?? current.Result;
    if (!next || typeof next !== "object" || next === current) break;
    current = next;
  }
  return current;
};
const numberOrZero = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formFromStudent = (record) => {
  const nested = record?.student ?? record?.Student ?? record?.profile ?? record?.Profile ?? {};
  const admission = record?.admission ?? record?.Admission ?? {};
  const academic = record?.academicDetails ?? record?.AcademicDetails ?? record?.academic ?? record?.Academic ?? {};
  const source = { ...record, ...admission, ...academic, ...nested };
  const text = (...keys) => stringValue(valueOf(source, ...keys));
  return {
    admissionId: text("admissionId", "AdmissionId"), admissionNo: text("admissionNo", "AdmissionNo"), admissionNumber: text("admissionNumber", "AdmissionNumber"), admissionDate: asDateInput(valueOf(source, "admissionDate", "AdmissionDate")), admissionType: text("admissionType", "AdmissionType"), admissionQuota: text("admissionQuota", "AdmissionQuota"), medium: text("medium", "Medium"), secondLanguage: text("secondLanguage", "SecondLanguage"),
    studentName: text("studentName", "StudentName", "fullName", "FullName", "name", "Name"), photo: text("photoUrl", "PhotoUrl", "profilePhotoUrl", "ProfilePhotoUrl", "photo", "Photo", "photoPath", "PhotoPath", "profilePhoto", "ProfilePhoto"), gender: text("gender", "Gender"), dateOfBirth: asDateInput(valueOf(source, "dateOfBirth", "DateOfBirth", "dob", "DOB")), bloodGroup: text("bloodGroup", "BloodGroup"), email: text("email", "Email", "studentEmail", "StudentEmail"), mobileNumber: text("mobileNumber", "MobileNumber", "studentMobileNumber", "StudentMobileNumber", "mobile", "Mobile"), aadhaarNumber: text("aadhaarNumber", "AadhaarNumber", "aadhaar", "Aadhaar"), nationality: text("nationality", "Nationality"), religion: text("religion", "Religion"), category: text("category", "Category"), address: text("address", "Address", "addressLine1", "AddressLine1"), city: text("city", "City"), district: text("district", "District"), state: text("state", "State"), pincode: text("pincode", "Pincode", "pinCode", "PinCode"),
    boardId: text("boardId", "BoardId"), academicYearId: text("academicYearId", "AcademicYearId"), academicLevelId: text("academicLevelId", "AcademicLevelId"), groupId: text("groupId", "GroupId"), programId: text("programId", "ProgramId"), sectionId: text("sectionId", "SectionId"), rollNo: text("rollNo", "RollNo"), rollNumber: text("rollNumber", "RollNumber"), feeStructureId: text("feeStructureId", "FeeStructureId"), paymentPlan: text("paymentPlan", "PaymentPlan"),
    previousSchool: text("previousSchool", "PreviousSchool"), previousHallTicketNumber: text("previousHallTicketNumber", "PreviousHallTicketNumber"), previousBoard: text("previousBoard", "PreviousBoard"), previousYearOfPassing: text("previousYearOfPassing", "PreviousYearOfPassing"), previousPercentage: text("previousPercentage", "PreviousPercentage"), studentCategory: text("studentCategory", "StudentCategory"), scholarshipStatus: text("scholarshipStatus", "ScholarshipStatus"), scholarshipAmount: text("scholarshipAmount", "ScholarshipAmount"),
    fatherName: text("fatherName", "FatherName"), fatherOccupation: text("fatherOccupation", "FatherOccupation"), fatherMobile: text("fatherMobile", "FatherMobile"), fatherEmail: text("fatherEmail", "FatherEmail"), motherName: text("motherName", "MotherName"), motherOccupation: text("motherOccupation", "MotherOccupation"), motherMobile: text("motherMobile", "MotherMobile"), motherEmail: text("motherEmail", "MotherEmail"), guardianName: text("guardianName", "GuardianName"), guardianMobile: text("guardianMobile", "GuardianMobile"), guardianEmail: text("guardianEmail", "GuardianEmail"), annualIncome: text("annualIncome", "AnnualIncome"), remarks: text("remarks", "Remarks"),
  };
};

const validate = (form) => {
  const errors = {};
  const person = (key, label, required = false) => {
    const value = form[key].trim();
    if (required && !value) errors[key] = "Student name is required.";
    else if (value && value.length > 100) errors[key] = `${label} cannot exceed 100 characters.`;
    else if (value && !personNamePattern.test(value)) errors[key] = required ? "Enter a valid student name." : `Enter a valid ${label.toLowerCase()}.`;
  };
  const mobile = (key, label) => { if (form[key].trim() && !/^\d{10}$/.test(form[key].trim())) errors[key] = `${label} must be exactly 10 digits.`; };
  person("studentName", "Student name", true);
  if (!form.gender) errors.gender = "Gender is required.";
  if (!form.dateOfBirth) errors.dateOfBirth = "Date of birth is required.";
  else if (new Date(`${form.dateOfBirth}T00:00:00`) > new Date()) errors.dateOfBirth = "Date of birth cannot be in the future.";
  if (form.email.trim() && !emailPattern.test(form.email.trim())) errors.email = "Enter a valid email address.";
  mobile("mobileNumber", "Mobile number");
  if (form.aadhaarNumber.trim() && !/^\d{12}$/.test(form.aadhaarNumber.trim())) errors.aadhaarNumber = "Aadhaar number must be exactly 12 digits.";
  if (form.nationality.trim() && (form.nationality.trim().length > 100 || !/^[\p{L} ]+$/u.test(form.nationality.trim()))) errors.nationality = "Enter a valid nationality.";
  if (form.address.trim().length > 250) errors.address = "Address cannot exceed 250 characters.";
  [["city", "city"], ["district", "district"], ["state", "state"]].forEach(([key, label]) => { const value = form[key].trim(); if (value && (value.length > 100 || !placePattern.test(value))) errors[key] = `Enter a valid ${label}.`; });
  if (form.pincode.trim() && !/^\d{6}$/.test(form.pincode.trim())) errors.pincode = "Pincode must be exactly 6 digits.";
  person("fatherName", "Father name"); person("motherName", "Mother name"); person("guardianName", "Guardian name");
  [["fatherOccupation", "Father occupation"], ["motherOccupation", "Mother occupation"]].forEach(([key, label]) => { if (form[key].trim().length > 100) errors[key] = `${label} cannot exceed 100 characters.`; });
  mobile("fatherMobile", "Father mobile number"); mobile("motherMobile", "Mother mobile number"); mobile("guardianMobile", "Guardian mobile number");
  if (form.fatherEmail.trim() && !emailPattern.test(form.fatherEmail.trim())) errors.fatherEmail = "Enter a valid father email address.";
  if (form.motherEmail.trim() && !emailPattern.test(form.motherEmail.trim())) errors.motherEmail = "Enter a valid mother email address.";
  if (form.guardianEmail.trim() && !emailPattern.test(form.guardianEmail.trim())) errors.guardianEmail = "Enter a valid guardian email address.";
  if (form.previousYearOfPassing && (!/^\d{4}$/.test(form.previousYearOfPassing) || Number(form.previousYearOfPassing) > new Date().getFullYear())) errors.previousYearOfPassing = "Enter a valid passing year.";
  if (form.previousPercentage && (Number(form.previousPercentage) < 0 || Number(form.previousPercentage) > 100)) errors.previousPercentage = "Percentage must be between 0 and 100.";
  return errors;
};

export default function StudentEnrollmentPage({ id }) {
  const navigate = useNavigate();
  const redirectTimer = useRef(null);
  const photoInputRef = useRef(null);
  const [student, setStudent] = useState(null), [form, setForm] = useState(emptyForm), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [loadError, setLoadError] = useState(""), [errors, setErrors] = useState({}), [touched, setTouched] = useState({}), [message, setMessage] = useState(""), [photoFile, setPhotoFile] = useState(null), [photoPreview, setPhotoPreview] = useState(""), [savedPhotoPreview, setSavedPhotoPreview] = useState(""), [photoError, setPhotoError] = useState(""), [lookups, setLookups] = useState({ boards: [], years: [], levels: [], groups: [], programs: [], sections: [] });
  const loadStudent = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      if (!/^\d+$/.test(String(id))) throw new Error("Invalid student ID.");
      const [studentResult, profileResult] = await Promise.allSettled([
        apiClient.get(apiEndpoints.students.getById(id)),
        apiClient.get(apiEndpoints.students.getProfile(id)),
      ]);
      if (studentResult.status === "rejected" && profileResult.status === "rejected") throw studentResult.reason;
      const studentRecord = studentResult.status === "fulfilled" ? unwrapStudent(studentResult.value.data) : {};
      const profileRecord = profileResult.status === "fulfilled" ? unwrapStudent(profileResult.value.data) : {};
      const record = { ...studentRecord };
      Object.entries(profileRecord || {}).forEach(([key, fieldValue]) => {
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== "") record[key] = fieldValue;
      });
      if (!record || typeof record !== "object") throw new Error("Student record was not found.");
      const nested = record.student ?? record.Student ?? record.profile ?? record.Profile ?? {};
      const admission = record.admission ?? record.Admission ?? {};
      const academic = record.academicDetails ?? record.AcademicDetails ?? record.academic ?? record.Academic ?? {};
      const source = { ...record, ...admission, ...academic, ...nested };
      setStudent({ name: stringValue(valueOf(source, "studentName", "StudentName", "fullName", "name")) || "Student", rollNo: stringValue(valueOf(source, "rollNo", "RollNo", "rollNumber", "RollNumber")) || "—", admissionNo: stringValue(valueOf(source, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")) || "-" });
      const nextForm = formFromStudent(record);
      try {
        const uploadedPhoto = sessionStorage.getItem(`cms_student_photo_${id}`);
        if (uploadedPhoto) nextForm.photo = uploadedPhoto;
      } catch { /* Storage may be unavailable. */ }
      setForm(nextForm); setErrors({}); setTouched({}); setPhotoFile(null); setPhotoPreview(""); setPhotoError("");
    } catch (error) { setLoadError(getApiErrorMessage(error) || "Unable to load the student profile."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { loadStudent(); }, [loadStudent]);
  useEffect(() => {
    let active = true;
    const loadLookups = async () => {
      const results = await Promise.allSettled([
        apiClient.get(apiEndpoints.boards.list), apiClient.get(apiEndpoints.academicYears.list), apiClient.get(apiEndpoints.academicLevels.list),
        apiClient.get(apiEndpoints.groups.list), apiClient.get(apiEndpoints.programs.list), apiClient.get(apiEndpoints.sections.list),
      ]);
      if (!active) return;
      const data = results.map((result) => result.status === "fulfilled" ? result.value.data : []);
      setLookups({
        boards: optionsFrom(data[0], ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name"]),
        years: optionsFrom(data[1], ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name"]),
        levels: optionsFrom(data[2], ["academicLevelId", "AcademicLevelId", "id", "Id"], ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name"]),
        groups: optionsFrom(data[3], ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name"]),
        programs: optionsFrom(data[4], ["programId", "ProgramId", "programmeId", "ProgrammeId", "id", "Id"], ["programName", "ProgramName", "programmeName", "ProgrammeName", "name", "Name"]),
        sections: optionsFrom(data[5], ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"]),
      });
    };
    loadLookups();
    return () => { active = false; };
  }, []);
  useEffect(() => () => window.clearTimeout(redirectTimer.current), []);
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setSavedPhotoPreview("");
    if (!form.photo || photoFile) return () => { active = false; };
    const resolved = imageUrl(form.photo);
    if (/^(?:blob:|data:)/i.test(resolved)) {
      setSavedPhotoPreview(resolved);
      return () => { active = false; };
    }
    apiClient.get(resolved, {
      responseType: "blob",
      headers: { Accept: "image/*" },
      skipGlobalLoader: true,
    }).then((response) => {
      if (!active) return;
      const contentType = String(response.headers?.["content-type"] ?? response.data?.type ?? "").toLowerCase();
      if (!contentType.startsWith("image/")) return;
      objectUrl = URL.createObjectURL(response.data);
      setSavedPhotoPreview(objectUrl);
    }).catch(() => { /* Keep the initials fallback when a saved photo is unavailable. */ });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [form.photo, photoFile]);
  const updateField = (key, value) => setForm((current) => {
    const next = { ...current, [key]: value };
    if (touched[key]) setErrors((currentErrors) => ({ ...currentErrors, [key]: validate(next)[key] || "" }));
    return next;
  });
  const change = (key) => (event) => updateField(key, event.target.value);
  const numericChange = (key, maximum) => (event) => updateField(key, digitsOnly(event.target.value, maximum));
  const choosePhoto = (event) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setPhotoFile(null); setPhotoPreview(""); setPhotoError("Only JPG, JPEG and PNG images are allowed."); event.target.value = "";
      return;
    }
    setPhotoError(""); setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file));
  };
  const blur = (key) => () => { setTouched((current) => ({ ...current, [key]: true })); setErrors((current) => ({ ...current, [key]: validate(form)[key] || "" })); };
  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setTouched(Object.fromEntries(fieldKeys.map((key) => [key, true]))); setErrors(nextErrors);
    const firstInvalid = fieldKeys.find((key) => nextErrors[key]);
    if (firstInvalid) {
      window.requestAnimationFrame(() => document.querySelector(".student-profile-edit .cms-field.is-invalid input, .student-profile-edit .cms-field.is-invalid select, .student-profile-edit .cms-field.is-invalid textarea")?.focus());
      return;
    }
    const optionalEmail = (value) => value.trim() || null;
    const payload = {
      admissionId: numberOrZero(form.admissionId), admissionNo: form.admissionNo.trim(), admissionNumber: form.admissionNumber.trim(), admissionDate: form.admissionDate || null, admissionType: form.admissionType.trim(), admissionQuota: form.admissionQuota.trim(), medium: form.medium.trim(), secondLanguage: form.secondLanguage.trim(),
      studentName: form.studentName.trim(), photo: form.photo.trim(), gender: form.gender, dateOfBirth: form.dateOfBirth || null, bloodGroup: form.bloodGroup, email: optionalEmail(form.email), mobileNumber: form.mobileNumber.trim(), aadhaarNumber: form.aadhaarNumber.trim(), nationality: form.nationality.trim(), religion: form.religion.trim(), category: form.category.trim(), address: form.address.trim(), city: form.city.trim(), district: form.district.trim(), state: form.state.trim(), pincode: form.pincode.trim(),
      boardId: numberOrZero(form.boardId), academicYearId: numberOrZero(form.academicYearId), academicLevelId: numberOrZero(form.academicLevelId), groupId: numberOrZero(form.groupId), programId: numberOrZero(form.programId), sectionId: numberOrZero(form.sectionId), rollNo: form.rollNo.trim(), rollNumber: form.rollNumber.trim(), feeStructureId: numberOrZero(form.feeStructureId), paymentPlan: form.paymentPlan.trim(),
      previousSchool: form.previousSchool.trim(), previousHallTicketNumber: form.previousHallTicketNumber.trim(), previousBoard: form.previousBoard.trim(), previousYearOfPassing: numberOrZero(form.previousYearOfPassing), previousPercentage: numberOrZero(form.previousPercentage), studentCategory: form.studentCategory.trim(), scholarshipStatus: form.scholarshipStatus.trim(), scholarshipAmount: numberOrZero(form.scholarshipAmount),
      fatherName: form.fatherName.trim(), fatherOccupation: form.fatherOccupation.trim(), fatherMobile: form.fatherMobile.trim(), fatherEmail: optionalEmail(form.fatherEmail), motherName: form.motherName.trim(), motherOccupation: form.motherOccupation.trim(), motherMobile: form.motherMobile.trim(), motherEmail: optionalEmail(form.motherEmail), guardianName: form.guardianName.trim(), guardianMobile: form.guardianMobile.trim(), guardianEmail: optionalEmail(form.guardianEmail), annualIncome: numberOrZero(form.annualIncome), remarks: form.remarks.trim(),
    };
    if (import.meta.env.DEV) console.info("Student profile update payload:", payload);
    setSaving(true);
    let saved = false;
    try {
      await apiClient.put(apiEndpoints.students.update(id), payload);
      if (photoFile) {
        const photoData = new FormData();
        photoData.append("file", photoFile);
        const photoResponse = await apiClient.post(apiEndpoints.students.uploadPhoto(id), photoData, { headers: { "Content-Type": "multipart/form-data" } });
        const photoResult = unwrapStudent(photoResponse.data);
        const uploadedPhotoUrl = stringValue(valueOf(photoResult, "photoUrl", "PhotoUrl", "photo", "Photo", "photoPath", "PhotoPath")).trim();
        if (uploadedPhotoUrl) {
          try { sessionStorage.setItem(`cms_student_photo_${id}`, uploadedPhotoUrl); } catch { /* Storage may be unavailable. */ }
        }
      }
      saved = true;
      setMessage(photoFile ? "Student profile and photo updated successfully." : "Student profile updated successfully.");
      redirectTimer.current = window.setTimeout(() => navigate(`/dashboard/students/${id}`), 1400);
    }
    catch (error) { setMessage(studentUpdateError(error)); }
    finally { if (!saved) setSaving(false); }
  };
  const field = (key, props = {}) => ({ ...props, error: errors[key], onBlur: blur(key) });
  if (loading) return <DashboardLayout title="EDIT STUDENT PROFILE" breadcrumb={["People", "Students"]}><div className="cms-card"><div className="cms-empty">Loading student profile...</div></div></DashboardLayout>;
  if (!student) return <DashboardLayout title="EDIT STUDENT PROFILE" breadcrumb={["People", "Students"]}><div className="cms-card"><div className="cms-empty">{loadError || "Student record was not found."}</div></div></DashboardLayout>;
  return <DashboardLayout title="EDIT STUDENT PROFILE" subtitle="Update student personal and family information." breadcrumb={["People", "Students"]}><form onSubmit={submit} className="cms-card student-profile-edit" noValidate>
    <div className="student-profile-edit-summary"><span><small>Student Name</small><b>{student.name}</b></span><span><small>Roll No.</small><b>{student.rollNo}</b></span><span><small>Admission No.</small><b>{student.admissionNo}</b></span></div>
    <ProfileSection title="Admission Details">
      <Field label="Admission No." {...field("admissionNo")}><input value={form.admissionNo} onChange={change("admissionNo")} /></Field><Field label="Admission Number" {...field("admissionNumber")}><input value={form.admissionNumber} onChange={change("admissionNumber")} /></Field><Field label="Admission Date" {...field("admissionDate")}><input type="date" value={form.admissionDate} onChange={change("admissionDate")} /></Field><Field label="Medium"><select value={form.medium} onChange={change("medium")}><option value="">Select medium</option>{mediumOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field><Field label="Second Language"><select value={form.secondLanguage} onChange={change("secondLanguage")}><option value="">Select second language</option>{secondLanguageOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
    </ProfileSection>
    <ProfileSection title="Personal Information">
      <Field label="Student Name *" {...field("studentName")}><input value={form.studentName} onChange={change("studentName")} maxLength="100" /></Field>
      <Field label="Photo" error={photoError}><div className="student-profile-photo-upload"><div className="student-profile-photo-preview">{photoPreview || savedPhotoPreview ? <img src={photoPreview || savedPhotoPreview} alt={`${student.name}'s profile`} /> : <span>{initialsOf(student.name)}</span>}</div><input ref={photoInputRef} className="student-profile-photo-input" type="file" accept="image/jpeg,image/jpg,image/png" onChange={choosePhoto} /><button className="cms-btn cms-btn-ghost" type="button" onClick={() => photoInputRef.current?.click()}>{form.photo || photoPreview ? "Replace Photo" : "Upload Photo"}</button><small>JPG, JPEG or PNG</small></div></Field>
      <Field label="Gender *" {...field("gender")}><select value={form.gender} onChange={change("gender")}><option value="">Select gender</option>{genderOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field><Field label="Date of Birth *" {...field("dateOfBirth")}><input type="date" value={form.dateOfBirth} onChange={change("dateOfBirth")} /></Field><Field label="Blood Group"><select value={form.bloodGroup} onChange={change("bloodGroup")}><option value="">Select Blood Group</option>{bloodGroups.map((group) => <option key={group} value={group}>{group}</option>)}</select></Field><Field label="Nationality" {...field("nationality")}><input value={form.nationality} onChange={change("nationality")} maxLength="100" /></Field><Field label="Religion"><input value={form.religion} onChange={change("religion")} /></Field><Field label="Category"><select value={form.category} onChange={change("category")}><option value="">Select category</option>{categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
    </ProfileSection>
    <ProfileSection title="Contact Information"><Field label="Email" {...field("email")}><input type="email" value={form.email} onChange={change("email")} maxLength="254" /></Field><Field label="Mobile Number" {...field("mobileNumber")}><input type="tel" inputMode="numeric" maxLength="10" value={form.mobileNumber} onChange={numericChange("mobileNumber", 10)} /></Field><Field label="Aadhaar Number" {...field("aadhaarNumber")}><input type="text" inputMode="numeric" maxLength="12" value={form.aadhaarNumber} onChange={numericChange("aadhaarNumber", 12)} /></Field></ProfileSection>
    <ProfileSection title="Academic Placement">
      <SelectField label="Board" value={form.boardId} onChange={change("boardId")} options={lookups.boards} placeholder="Select board" /><SelectField label="Academic Year" value={form.academicYearId} onChange={change("academicYearId")} options={lookups.years} placeholder="Select academic year" /><SelectField label="Academic Level" value={form.academicLevelId} onChange={change("academicLevelId")} options={lookups.levels} placeholder="Select academic level" /><SelectField label="Group" value={form.groupId} onChange={change("groupId")} options={lookups.groups} placeholder="Select group" /><SelectField label="Program" value={form.programId} onChange={change("programId")} options={lookups.programs} placeholder="Select program" /><SelectField label="Section" value={form.sectionId} onChange={change("sectionId")} options={lookups.sections} placeholder="Select section" /><Field label="Roll No." {...field("rollNo")}><input value={form.rollNo} onChange={change("rollNo")} /></Field><Field label="Roll Number" {...field("rollNumber")}><input value={form.rollNumber} onChange={change("rollNumber")} /></Field>
    </ProfileSection>
    <ProfileSection title="Previous Education">
      <Field label="Previous School"><input value={form.previousSchool} onChange={change("previousSchool")} /></Field><Field label="Previous Hall Ticket Number"><input value={form.previousHallTicketNumber} onChange={change("previousHallTicketNumber")} /></Field><Field label="Previous Board"><input value={form.previousBoard} onChange={change("previousBoard")} /></Field><Field label="Previous Year of Passing" {...field("previousYearOfPassing")}><input type="number" min="1900" max={new Date().getFullYear()} value={form.previousYearOfPassing} onChange={change("previousYearOfPassing")} /></Field><Field label="Previous Percentage" {...field("previousPercentage")}><input type="number" min="0" max="100" step="0.01" value={form.previousPercentage} onChange={change("previousPercentage")} /></Field>
    </ProfileSection>
    <ProfileSection title="Address"><Field label="Address" className="student-profile-full" {...field("address")}><textarea value={form.address} onChange={change("address")} rows="3" maxLength="250" /></Field><Field label="City" {...field("city")}><input value={form.city} onChange={change("city")} maxLength="100" /></Field><Field label="District" {...field("district")}><input value={form.district} onChange={change("district")} maxLength="100" /></Field><Field label="State" {...field("state")}><input value={form.state} onChange={change("state")} maxLength="100" /></Field><Field label="Pincode" {...field("pincode")}><input type="text" inputMode="numeric" maxLength="6" value={form.pincode} onChange={numericChange("pincode", 6)} /></Field></ProfileSection>
    <ProfileSection title="Father Details"><Field label="Father Name" {...field("fatherName")}><input value={form.fatherName} onChange={change("fatherName")} maxLength="100" /></Field><Field label="Occupation" {...field("fatherOccupation")}><input value={form.fatherOccupation} onChange={change("fatherOccupation")} maxLength="100" /></Field><Field label="Mobile Number" {...field("fatherMobile")}><input type="tel" inputMode="numeric" maxLength="10" value={form.fatherMobile} onChange={numericChange("fatherMobile", 10)} /></Field><Field label="Email" {...field("fatherEmail")}><input type="email" value={form.fatherEmail} onChange={change("fatherEmail")} maxLength="254" /></Field></ProfileSection>
    <ProfileSection title="Mother Details"><Field label="Mother Name" {...field("motherName")}><input value={form.motherName} onChange={change("motherName")} maxLength="100" /></Field><Field label="Occupation" {...field("motherOccupation")}><input value={form.motherOccupation} onChange={change("motherOccupation")} maxLength="100" /></Field><Field label="Mobile Number" {...field("motherMobile")}><input type="tel" inputMode="numeric" maxLength="10" value={form.motherMobile} onChange={numericChange("motherMobile", 10)} /></Field><Field label="Email" {...field("motherEmail")}><input type="email" value={form.motherEmail} onChange={change("motherEmail")} maxLength="254" /></Field></ProfileSection>
    <ProfileSection title="Guardian Details"><Field label="Guardian Name" {...field("guardianName")}><input value={form.guardianName} onChange={change("guardianName")} maxLength="100" /></Field><Field label="Mobile Number" {...field("guardianMobile")}><input type="tel" inputMode="numeric" maxLength="10" value={form.guardianMobile} onChange={numericChange("guardianMobile", 10)} /></Field><Field label="Email" {...field("guardianEmail")}><input type="email" value={form.guardianEmail} onChange={change("guardianEmail")} maxLength="254" /></Field></ProfileSection>
    <div className="student-profile-edit-actions"><Link to={`/dashboard/students/${id}`} className="cms-btn cms-btn-ghost">Cancel</Link><button className="cms-btn cms-btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button></div>
  </form><Toast message={message} onClose={() => setMessage("")} /></DashboardLayout>;
}

function ProfileSection({ title, children }) { return <section className="student-profile-section"><h2>{title}</h2><div className="cms-form-grid student-profile-form-grid">{children}</div></section>; }
function Field({ label, error, className = "", children, onBlur }) { return <label className={`cms-field ${className}${error ? " is-invalid" : ""}`} onBlur={onBlur}><span>{label}</span>{children}{error ? <small className="cms-field-error">{error}</small> : null}</label>; }
function SelectField({ label, value, onChange, options, placeholder }) {
  const selected = String(value ?? "");
  const hasSelectedOption = options.some((option) => option.value === selected);
  return <label className="cms-field"><span>{label}</span><select value={selected} onChange={onChange}><option value="">{placeholder}</option>{selected && !hasSelectedOption ? <option value={selected}>Loading {label.toLowerCase()}…</option> : null}{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

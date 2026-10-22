import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Camera, CheckCircle2, Edit3, Eye, EyeOff, Lock, RefreshCw, Save, X } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { getAuthUser } from "@/features/authStorage.js";
import "@/components/pages/AdminProfilePage.css";

import { getRows } from "../services/accountantService.js";
import { useId } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { env } from "@/config/env.js";
import { maskProfileValue, profileCollections, profileDate, profileDocumentUrl, profileValue as value, validateProfileDocument, editableProfileFields, profileContactPayload, profileDraftRequests, updateProfileField, validateProfileDraft } from "../utils/accountantProfileData.js";
import AccountantProfilePhotoEditor from "../components/AccountantProfilePhotoEditor.jsx";
import AccountantProfilePhotoActions from "../components/AccountantProfilePhotoActions.jsx";
import "../components/AccountantProfile.css";

export function AccountantProfile() {
  const profileReadRef = useRef(null);
  const profileSaveLock = useRef(false);
  const photoUploadLock = useRef(false);
  const passwordLock = useRef(false);
  const user = useMemo(() => getAuthUser() || {}, []);
  const requestSeq = useRef(0);
  const photoObjectUrl = useRef("");
  const fileInputRef = useRef(null);
  const [profileState, setProfileState] = useState({
    loading: true,
    staffError: "",
    accountError: "",
    lookupError: "",
    photoError: "",
    staff: null,
    account: null,
    lookups: { campuses: [], departments: [], designations: [] },
  });
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState("");
  const [photoUploadError, setPhotoUploadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [form, setForm] = useState(createEmptyProfileForm());
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const staff = profileState.staff;
  const account = profileState.account;
  const staffId = getNumericId(readAny(staff, ["id", "Id", "staffId", "StaffId"]));
  const display = useMemo(() => normalizeAccountantProfile(staff, account, user, profileState.lookups), [staff, account, user, profileState.lookups]);
  const initials = getInitials(display.fullName || "Accountant");

  const cleanupPhotoUrl = useCallback(() => {
    if (photoObjectUrl.current) {
      URL.revokeObjectURL(photoObjectUrl.current);
      photoObjectUrl.current = "";
    }
  }, []);

  const loadPhoto = useCallback(async (targetStaffId, seq = requestSeq.current) => {
    if (!targetStaffId) return;
    cleanupPhotoUrl();
    setPhotoUrl("");
    setProfileState((state) => ({ ...state, photoError: "" }));
    try {
      const response = await apiClient.get(apiEndpoints.faculty.getPhoto(targetStaffId), {
        responseType: "blob",
        skipGlobalLoader: true,
        skipErrorLog: true,
      });
      if (seq !== requestSeq.current) return;
      const type = response?.data?.type || "";
      if (!response?.data || (type && !type.startsWith("image/"))) throw new Error("Profile photo response was not an image.");
      const nextUrl = URL.createObjectURL(response.data);
      photoObjectUrl.current = nextUrl;
      setPhotoUrl(nextUrl);
    } catch (error) {
      if (seq !== requestSeq.current) return;
      setProfileState((state) => ({ ...state, photoError: getApiErrorMessage(error) || "Unable to load profile photo." }));
    }
  }, [cleanupPhotoUrl]);

  const loadProfile = useCallback(async () => {
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    cleanupPhotoUrl();
    setPhotoUrl("");
    setPhotoSuccess("");
    setPhotoUploadError("");
    setProfileSuccess("");
    setProfileError("");
    setProfileState((state) => ({ ...state, loading: true, staffError: "", accountError: "", lookupError: "", photoError: "" }));

    const sessionIdentity = getSessionIdentity(user);
    if (!profileReadRef.current) {
      const accountPromise = sessionIdentity.userId
        ? apiClient.get(apiEndpoints.auth.userById(sessionIdentity.userId), { skipErrorLog: true }).then((response) => unwrapApiData(response.data))
        : Promise.resolve(null);
      const lookupsPromise = Promise.allSettled([
        apiClient.get(apiEndpoints.campuses.list, { params: { isActive: true }, skipErrorLog: true }).then((response) => getRows(response.data)),
        apiClient.get(apiEndpoints.faculty.lookupDepartments, { params: { staffType: "Non-Teaching" }, skipErrorLog: true }).then((response) => getRows(response.data)),
        apiClient.get(apiEndpoints.faculty.lookupDesignations, { params: { staffType: "Non-Teaching" }, skipErrorLog: true }).then((response) => getRows(response.data)),
      ]);
      const initialStaffPromise = sessionIdentity.staffIdentifier
        ? loadStaffByIdentifier(sessionIdentity.staffIdentifier)
        : Promise.resolve(null);

      profileReadRef.current = Promise.allSettled([accountPromise, initialStaffPromise, lookupsPromise]);
    }
    const pending = profileReadRef.current;
    const [accountResult, initialStaffResult, lookupResults] = await pending;
    if (profileReadRef.current === pending) profileReadRef.current = null;
    if (seq !== requestSeq.current) return;

    const accountData = accountResult.status === "fulfilled" ? accountResult.value : null;
    const accountIdentity = getSessionIdentity(accountData || {});
    const staffIdentifier = sessionIdentity.staffIdentifier || accountIdentity.staffIdentifier;
    let staffData = initialStaffResult.status === "fulfilled" ? initialStaffResult.value : null;
    let staffError = initialStaffResult.status === "rejected" ? getApiErrorMessage(initialStaffResult.reason) : "";

    if (!staffData && !sessionIdentity.staffIdentifier && staffIdentifier) {
      try {
        staffData = await loadStaffByIdentifier(staffIdentifier);
      } catch (error) {
        staffError = getApiErrorMessage(error);
      }
    }

    const lookups = lookupResults.status === "fulfilled" ? {
      campuses: lookupResults.value[0].status === "fulfilled" ? lookupResults.value[0].value : [],
      departments: lookupResults.value[1].status === "fulfilled" ? lookupResults.value[1].value : [],
      designations: lookupResults.value[2].status === "fulfilled" ? lookupResults.value[2].value : [],
    } : { campuses: [], departments: [], designations: [] };
    const lookupError = lookupResults.status === "rejected" || lookupResults.value?.some((result) => result.status === "rejected")
      ? "Some profile labels could not be resolved from lookup APIs."
      : "";
    const accountError = accountResult.status === "rejected" ? getApiErrorMessage(accountResult.reason) : "";
    if (!staffIdentifier && !staffData) staffError = "This session does not include a staff ID or employee identifier for the signed-in accountant.";

    setProfileState({
      loading: false,
      staffError,
      accountError,
      lookupError,
      photoError: "",
      staff: staffData,
      account: accountData,
      lookups,
    });
    setForm(createProfileForm(staffData));
    setEditing(false);
    const loadedStaffId = getNumericId(readAny(staffData, ["id", "Id", "staffId", "StaffId"]));
    if (loadedStaffId) loadPhoto(loadedStaffId, seq);
  }, [cleanupPhotoUrl, loadPhoto, user]);

  useEffect(() => {
    loadProfile();
    return () => {
      requestSeq.current += 1;
      cleanupPhotoUrl();
    };
  }, [cleanupPhotoUrl, loadProfile]);

  const handleProfileChange = (field) => (event) => {
    setProfileSuccess("");
    setProfileError("");
    setForm((current) => updateProfileField(current, field, event.target.value));
  };

  const handleCancelProfile = () => {
    setForm(createProfileForm(staff));
    setEditing(false);
    setProfileError("");
    setProfileSuccess("");
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (profileSaveLock.current) return;
    setProfileError("");
    setProfileSuccess("");
    if (!staffId) {
      setProfileError("Staff profile ID is required before saving.");
      return;
    }
    const contactChanged = form.mobile.trim() !== String(readAny(staff, ["mobile", "Mobile"])).trim() || form.email.trim() !== String(readAny(staff, ["email", "Email"])).trim();
    const validation = (!form.firstName.trim() || !form.lastName.trim() ? "First and last name are required." : "") || (contactChanged ? validateProfileForm(form) || (!form.email.trim() ? "Email is required when updating contact information." : "") : "") || validateProfileDraft(staff, form);
    if (validation) {
      setProfileError(validation);
      return;
    }
    profileSaveLock.current = true;
    setSavingProfile(true);
    let writes = 0;
    try {
      const requests = profileDraftRequests(staff, form);
      if (contactChanged) {
        // This existing self-service contract resolves staff from authentication and
        // does not require unrelated official-record fields or staff-management access.
        const response = await apiClient.put(apiEndpoints.faculty.updateProfileSettings, profileContactPayload(staff, form));
        if ((response.data?.success ?? response.data?.Success) === false) throw new Error(response.data.message || "Contact update failed.");
        writes += 1;
        // The settings endpoint splits fullName at the first space. Preserve the
        // original first/last-name boundaries, including compound first names.
        const personalRequest = requests.find(request => request.sectionName === "Personal");
        if (personalRequest) Object.assign(personalRequest.personal, { firstName: form.firstName.trim(), lastName: form.lastName.trim() });
        else requests.unshift({ sectionName: "Personal", personal: { firstName: form.firstName.trim(), lastName: form.lastName.trim() } });
      }
      for (const payload of requests) {
        const response = await apiClient.post(apiEndpoints.faculty.saveProfileDraft(staffId), payload);
        if ((response.data?.status ?? response.data?.Status) === false) throw new Error(response.data.message || "Profile section update failed.");
        writes += 1;
      }
      const updated = await loadStaffByIdentifier(staffId);
      if (getNumericId(readAny(updated, ["id", "Id", "staffId", "StaffId"])) !== staffId) throw new Error("Profile update completed, but the staff record could not be verified. Please refresh before making further changes.");
      setProfileState((state) => ({ ...state, staff: updated, staffError: "" }));
      setForm(createProfileForm(updated));
      setEditing(false);
      setProfileSuccess("Profile details updated successfully.");
    } catch (error) {
      if (writes) {
        const saved = await loadStaffByIdentifier(staffId).catch(() => null);
        if (getNumericId(readAny(saved, ["id", "Id", "staffId", "StaffId"])) === staffId) setProfileState(state => ({ ...state, staff: saved }));
      }
      setProfileError(`${writes ? "Some changes reached the server. Your draft is retained; review and retry the remaining changes. " : ""}${getApiErrorMessage(error) || "Failed to update profile details."}`);
    } finally {
      profileSaveLock.current = false;
      setSavingProfile(false);
    }
  };

  const handlePhotoSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setPhotoSuccess("");
    setPhotoUploadError("");
    if (!file || photoUploadLock.current) return;
    if (!staffId) {
      setPhotoUploadError("Staff profile ID is required before uploading a photo.");
      return;
    }
    const extension = `.${String(file.name || "").split(".").pop() || ""}`.toLowerCase();
    if (![".jpg", ".jpeg", ".png"].includes(extension) || !["image/jpeg", "image/png"].includes(file.type)) {
      setPhotoUploadError("Only JPEG and PNG photos are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoUploadError("Photo size must be 5 MB or smaller.");
      return;
    }
    const formData = new FormData();
    formData.append("StaffId", String(staffId));
    formData.append("Photo", file);
    photoUploadLock.current = true;
    setPhotoUploading(true);
    try {
      const response = await apiClient.post(apiEndpoints.faculty.uploadPhoto, formData);
      if ((response.data?.status ?? response.data?.Status) === false) throw new Error(response.data.message || "Photo upload failed.");
      setPhotoSuccess("Profile photo updated successfully.");
      await loadPhoto(staffId);
      const updatedStaff = await loadStaffByIdentifier(staffId).catch(() => null);
      if (updatedStaff) setProfileState((state) => ({ ...state, staff: updatedStaff }));
    } catch (error) {
      setPhotoUploadError(getApiErrorMessage(error) || "Failed to upload profile photo.");
      throw error;
    } finally {
      photoUploadLock.current = false;
      setPhotoUploading(false);
    }
  };

  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    if (passwordLock.current) return;
    setPasswordSuccess("");
    setPasswordError("");
    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }
    passwordLock.current = true;
    setPasswordLoading(true);
    try {
      await apiClient.post(apiEndpoints.auth.changePassword, { oldPassword: currentPassword, newPassword, confirmNewPassword: confirmPassword });
      setPasswordSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError(getApiErrorMessage(error) || "Failed to update password.");
    } finally {
      passwordLock.current = false;
      setPasswordLoading(false);
    }
  };

  const resetPasswordForm = useCallback(() => {
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    setShowCurrentPassword(false); setShowNewPassword(false); setShowConfirmPassword(false);
    setPasswordError(""); setPasswordSuccess("");
  }, []);
  const refreshDocuments = async () => {
    const updated = await loadStaffByIdentifier(staffId);
    const updatedId = getNumericId(readAny(updated, ["id", "Id", "staffId", "StaffId"]));
    if (updatedId !== staffId) throw new Error("Updated documents did not match your staff profile.");
    setProfileState(state => ({ ...state, staff: updated }));
  };

  return <AccountantProfileContent
    staff={staff} staffId={staffId} display={display} initials={initials}
    loading={profileState.loading} photoUrl={photoUrl} photoUploading={photoUploading}
    photoSuccess={photoSuccess} photoError={photoUploadError} fileInputRef={fileInputRef} onPhotoSelect={handlePhotoSelect}
    editing={editing} savingProfile={savingProfile} form={form} onChange={handleProfileChange}
    onEdit={() => setEditing(true)} onCancel={handleCancelProfile} onSave={handleSaveProfile}
    EditableField={ProfileField} onDocumentsChanged={refreshDocuments}
    passwordLoading={passwordLoading} passwordSuccess={passwordSuccess} resetPassword={resetPasswordForm}
    notices={<>
      {profileState.staffError && <ProfileNotice type="error" message={profileState.staffError} onRetry={loadProfile} />}
      {profileState.accountError && <ProfileNotice type="warning" message={`Account details could not be loaded. ${profileState.accountError}`} />}
      {profileState.lookupError && <ProfileNotice type="warning" message={profileState.lookupError} />}
      {profileState.photoError && !photoUrl && <ProfileNotice type="warning" message={profileState.photoError} />}
      {profileSuccess && <div className="admin-feedback-msg success" role="status"><CheckCircle2 size={16} /> {profileSuccess}</div>}
      {profileError && <div className="admin-feedback-msg error" role="alert"><AlertCircle size={16} /> {profileError}</div>}
    </>}
    securityForm={<>
      {passwordError && <div className="admin-feedback-msg error" role="alert"><AlertCircle size={16} /> {passwordError}</div>}
      <form onSubmit={handleUpdatePassword} className="admin-security-form">
        <PasswordField id="accountantCurrentPassword" label="Current Password" value={currentPassword} setValue={setCurrentPassword} visible={showCurrentPassword} setVisible={setShowCurrentPassword} />
        <PasswordField id="accountantNewPassword" label="New Password" value={newPassword} setValue={setNewPassword} visible={showNewPassword} setVisible={setShowNewPassword} placeholder="At least 6 characters" />
        <PasswordField id="accountantConfirmPassword" label="Confirm New Password" value={confirmPassword} setValue={setConfirmPassword} visible={showConfirmPassword} setVisible={setShowConfirmPassword} placeholder="Re-enter new password" />
        <button type="submit" className="admin-btn-update-password" disabled={passwordLoading}><Lock size={15} /> {passwordLoading ? "Updating..." : "Update Password"}</button>
      </form>
    </>}
  />;
}

const unwrapApiData = (payload) => payload?.data ?? payload?.Data ?? payload;

const readAny = (source, keys, fallback = "") => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return fallback;
};

const getNumericId = (value) => {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
};

const getInitials = (name) => String(name || "")
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join("")
  .toUpperCase() || "AC";

const getSessionIdentity = (source = {}) => {
  const staffId = getNumericId(readAny(source, ["staffId", "StaffId", "staffID", "StaffID"]));
  const employeeId = String(readAny(source, ["employeeId", "EmployeeId", "employeeCode", "EmployeeCode"])).trim();
  const userId = getNumericId(readAny(source, ["id", "Id", "userId", "UserId"]));
  return {
    userId,
    staffId,
    employeeId: employeeId || "",
    staffIdentifier: staffId || employeeId || "",
  };
};

const loadStaffByIdentifier = async (identifier) => {
  const response = Number.isInteger(Number(identifier)) && Number(identifier) > 0
    ? await apiClient.get(apiEndpoints.faculty.getById(Number(identifier)), { skipErrorLog: true })
    : await apiClient.get(apiEndpoints.faculty.getProfileByIdentifier(identifier), { skipErrorLog: true });
  return unwrapApiData(response.data);
};

const labelFromLookup = (items, id, name, idKeys, nameKeys) => {
  const normalizedId = id !== undefined && id !== null && id !== "" ? String(id) : "";
  const normalizedName = String(name || "").trim().toLowerCase();
  const match = (items || []).find((item) => {
    const itemId = String(readAny(item, idKeys, ""));
    const itemName = String(readAny(item, nameKeys, "")).trim().toLowerCase();
    return (normalizedId && itemId === normalizedId) || (normalizedName && itemName === normalizedName);
  });
  return readAny(match, nameKeys, name) || name || "";
};

const normalizeAccountantProfile = (staff, account, sessionUser, lookups) => {
  const firstName = readAny(staff, ["firstName", "FirstName"]);
  const middleName = readAny(staff, ["middleName", "MiddleName"]);
  const lastName = readAny(staff, ["lastName", "LastName"]);
  const staffName = [firstName, middleName, lastName].filter(Boolean).join(" ").trim();
  const fullName = staffName || readAny(account, ["fullName", "FullName", "name", "Name"]) || readAny(sessionUser, ["fullName", "name"], "Accountant");
  const campusId = readAny(staff, ["campusId", "CampusId"]);
  const departmentId = readAny(staff, ["departmentId", "DepartmentId"]);
  const designationId = readAny(staff, ["designationId", "DesignationId"]);
  const staffStatus = readAny(staff, ["status", "Status"]);
  const accountStatus = readAny(account, ["status", "Status", "accountStatus", "AccountStatus"]);
  const isActive = readAny(account, ["isActive", "IsActive"], undefined);
  return {
    fullName,
    email: readAny(staff, ["email", "Email"]) || readAny(account, ["email", "Email"]) || readAny(sessionUser, ["email"]),
    mobile: readAny(staff, ["mobile", "Mobile", "phoneNumber", "PhoneNumber"]) || readAny(sessionUser, ["mobile", "phone"]),
    employeeId: readAny(staff, ["employeeId", "EmployeeId"]) || readAny(sessionUser, ["employeeId"]),
    department: labelFromLookup(lookups.departments, departmentId, readAny(staff, ["department", "Department"]), ["id", "Id", "departmentId", "DepartmentId"], ["name", "Name", "departmentName", "DepartmentName"]),
    designation: labelFromLookup(lookups.designations, designationId, readAny(staff, ["designation", "Designation"]), ["id", "Id", "designationId", "DesignationId"], ["name", "Name", "designationName", "DesignationName"]),
    campus: labelFromLookup(lookups.campuses, campusId, readAny(staff, ["campusName", "CampusName", "campus", "Campus"]), ["id", "Id", "campusId", "CampusId"], ["name", "Name", "campusName", "CampusName"]),
    username: readAny(account, ["username", "Username", "userName", "UserName", "email", "Email"]) || readAny(sessionUser, ["username", "userName", "email"]),
    role: readAny(account, ["role", "Role", "roleName", "RoleName"]) || readAny(sessionUser, ["role"], "Accountant"),
    status: accountStatus || (isActive === false ? "Inactive" : staffStatus || (isActive === true ? "Active" : "")),
  };
};

const createEmptyProfileForm = () => ({ firstName: "", lastName: "", email: "", mobile: "", ...editableProfileFields(null) });

const createProfileForm = (staff) => ({
  ...editableProfileFields(staff),
  firstName: String(readAny(staff, ["firstName", "FirstName"])),
  lastName: String(readAny(staff, ["lastName", "LastName"])),
  email: String(readAny(staff, ["email", "Email"])),
  mobile: String(readAny(staff, ["mobile", "Mobile"])),
});

const validateProfileForm = (form) => {
  if (!form.firstName.trim()) return "First name is required.";
  if (!form.lastName.trim()) return "Last name is required.";
  if (!form.mobile.trim()) return "Mobile number is required.";
  if (!/^[0-9+\-\s]{7,15}$/.test(form.mobile.trim())) return "Mobile number must be a valid contact format.";
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Please provide a valid email address.";
  return "";
};

function ProfileNotice({ type = "warning", message, onRetry }) {
  return (
    <div className={`admin-feedback-msg ${type === "error" ? "error" : "accountant-warning"}`}>
      <AlertCircle size={16} />
      <span>{message}</span>
      {onRetry ? <button type="button" className="sp-btn" onClick={onRetry}><RefreshCw size={14} /> Retry</button> : null}
    </div>
  );
}

function ProfileField({ label, value, editing, onChange, type = "text", required = false }) {
  const id = `accountant-profile-edit-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const displayValue = value === "" || value == null ? (["date", "number"].includes(type) ? "" : "Not available") : value;
  return (
    <div className="admin-form-group">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="admin-input" type={type} value={editing ? value : displayValue} step={type === "number" ? "any" : undefined} min={type === "number" ? 0 : undefined} onChange={onChange} readOnly={!editing} disabled={!editing} required={required} />
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="admin-form-group">
      <label>{label}</label>
      <input className="admin-input" type="text" value={value || "Not available"} readOnly disabled />
    </div>
  );
}

function PasswordField({ id, label, value, setValue, visible, setVisible, placeholder = "••••••••" }) {
  return (
    <div className="admin-form-group">
      <label htmlFor={id}>{label}</label>
      <div className="admin-password-input-wrap">
        <input id={id} type={visible ? "text" : "password"} className="admin-input" placeholder={placeholder} value={value} onChange={(event) => setValue(event.target.value)} />
        <button type="button" className="admin-password-toggle-btn" onClick={() => setVisible((show) => !show)} title={visible ? "Hide password" : "Show password"}>
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

const steps = ["Personal Info", "Bank Info", "Address Info", "Experience", "Documents", "Preview"];
const titles = ["Personal Information", "Bank Details", "Address Information", "Experience Details", "Documents", "Review & Confirmation"];
function ReadField({ label, text }) {
  const id = useId();
  return <div className="acct-profile-field"><label htmlFor={id}>{label}</label><input id={id} value={String(text ?? "") || "Not available"} readOnly disabled /></div>;
}

function AccountantProfileContent({ staff, staffId, display, initials, photoUrl, photoUploading, photoSuccess, photoError, fileInputRef, onPhotoSelect, loading, notices, editing, savingProfile, form, onChange, onEdit, onCancel, onSave, securityForm, passwordLoading, passwordSuccess, resetPassword, onDocumentsChanged, EditableField }) {
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

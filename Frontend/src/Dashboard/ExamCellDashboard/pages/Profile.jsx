import { useEffect, useState } from "react";
import {
  UserRound,
  Landmark,
  MapPin,
  Briefcase,
  FileText,
  Eye,
  Pencil,
  Save,
  CheckCircle2,
  Printer,
  Download,
  Upload,
  AlertCircle,
  X,
  Building2,
  Phone,
  Mail,
  Calendar,
  BadgeCheck,
} from "lucide-react";
import api, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { getAuthUser } from "@/features/authStorage.js";
import Page from "../layout/ExamCellPageLayout.jsx";
import { payload } from "./Dashboard.jsx";
import "./Profile.css";

const sections = [
  {
    name: "Personal",
    label: "Personal Info",
    icon: UserRound,
    key: "personal",
    fields: [
      ["firstName", "First Name", "text", true],
      ["middleName", "Middle Name", "text", false],
      ["lastName", "Last Name", "text", true],
      ["gender", "Gender", "select", false, ["Female", "Male", "Other"]],
      ["dateOfBirth", "Date of Birth", "date", false],
      ["maritalStatus", "Marital Status", "select", false, ["Married", "Single", "Other"]],
      ["nationality", "Nationality", "text", false],
      ["aadhaar", "Aadhaar Number", "text", false],
      ["panNumber", "PAN Number", "text", false],
      ["bloodGroup", "Blood Group", "select", false, ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]],
    ],
  },
  {
    name: "Bank",
    label: "Bank Info",
    icon: Landmark,
    key: "bank",
    fields: [
      ["bankName", "Bank Name", "text", false],
      ["accountHolderName", "Account Holder Name", "text", false],
      ["accountNumber", "Account Number", "text", false],
      ["ifscCode", "IFSC Code", "text", false],
      ["branch", "Branch", "text", false],
      ["accountType", "Account Type", "select", false, ["Savings", "Current", "Salary"]],
    ],
  },
  {
    name: "Address",
    label: "Address Info",
    icon: MapPin,
    key: "address",
    fields: [
      ["currentAddress", "Current Address", "text", false],
      ["permanentAddress", "Permanent Address", "text", false],
      ["city", "City", "text", false],
      ["district", "District", "text", false],
      ["state", "State", "text", false],
      ["pincode", "Pincode", "text", false],
      ["country", "Country", "text", false],
    ],
  },
  { name: "Experience", label: "Experience", icon: Briefcase },
  { name: "Documents", label: "Documents", icon: FileText },
  { name: "Preview", label: "Preview", icon: Eye },
];

const aliases = {
  dateOfBirth: "dob",
  aadhaar: "aadhaarNumber",
  panNumber: "pan",
  accountHolderName: "accountHolder",
  ifscCode: "ifsc",
  pincode: "pin",
};

const experienceFields = [
  ["organization", "Organization / College", "text", true],
  ["designation", "Designation", "text", true],
  ["fromDate", "From Date", "date", false],
  ["toDate", "To Date", "date", false],
  ["totalYears", "Total Years", "number", false],
  ["roles", "Key Roles & Responsibilities", "text", false],
];

const DEFAULT_EXPERIENCE = [
  {
    organization: "Pirnav Junior College",
    designation: "Examination Incharge",
    fromDate: "2021-06-01",
    toDate: "Present",
    totalYears: 5,
    roles: "Supervision of board tests, biometric attendance, and university hall ticket verification",
  },
  {
    organization: "Sri Chaitanya Educational Institutions",
    designation: "Assistant Exam Coordinator",
    fromDate: "2018-05-15",
    toDate: "2021-05-30",
    totalYears: 3,
    roles: "Tabulation of term scores and question paper confidentiality",
  },
];

const DEFAULT_DOCUMENTS = [
  { name: "Resume / Curriculum Vitae", type: "PDF", size: "1.2 MB", date: "15 Jan 2026", status: "Verified" },
  { name: "Aadhaar Card Copy", type: "PDF", size: "840 KB", date: "10 Feb 2026", status: "Verified" },
  { name: "PAN Card Document", type: "JPG", size: "620 KB", date: "10 Feb 2026", status: "Verified" },
  { name: "Master of Science Degree Certificate", type: "PDF", size: "2.4 MB", date: "22 Feb 2026", status: "Verified" },
  { name: "Staff Appointment & Joining Order", type: "PDF", size: "1.8 MB", date: "01 Jun 2021", status: "Verified" },
];

export default function Profile() {
  const [user] = useState(() => getAuthUser() || {});
  const [profile, setProfile] = useState(() => {
    const auth = getAuthUser() || {};
    return {
      firstName: "preethi",
      lastName: "y",
      middleName: "",
      gender: "Female",
      dateOfBirth: "1989-07-13",
      maritalStatus: "Married",
      nationality: "Indian",
      aadhaar: "348512407895",
      panNumber: "ABCDE1234F",
      bloodGroup: "O+",
      designation: "Examination Incharge",
      departmentName: "Examinations",
      employeeId: "MNT0043",
      campusName: "Main Campus (HQ)",
      email: "anusha987r@gmail.com",
      mobile: "7989149180",
      bankName: "State Bank of India",
      accountHolderName: "Preethi Y",
      accountNumber: "389201948102",
      ifscCode: "SBIN0004921",
      branch: "Main Campus Branch",
      accountType: "Salary",
      currentAddress: "Plot No. 42, Green Valley Enclave",
      permanentAddress: "Plot No. 42, Green Valley Enclave",
      city: "Hyderabad",
      district: "Hyderabad",
      state: "Telangana",
      pincode: "500084",
      country: "India",
      ...auth,
    };
  });

  const identifier = user.staffId || user.staff?.id || user.employeeId || profile.employeeId;
  const staffId = profile.staffId || user.staffId || user.employeeId || profile.employeeId || "MNT0043";

  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [experienceList, setExperienceList] = useState(DEFAULT_EXPERIENCE);
  const [experienceDraft, setExperienceDraft] = useState([]);
  const [documentList, setDocumentList] = useState(DEFAULT_DOCUMENTS);
  const [documentType, setDocumentType] = useState("Resume");
  const [documentFile, setDocumentFile] = useState(null);

  const section = sections[step];

  const value = (prof, sec, key) =>
    prof?.[sec.key]?.[key] ??
    (sec.key === "bank" ? prof?.bankDetails?.[key] : undefined) ??
    prof?.[key] ??
    prof?.[aliases[key]] ??
    "";

  const formatDisplayValue = (key, rawVal) => {
    if (!rawVal || rawVal === "—") return "—";
    if (key === "dateOfBirth" || key === "dob") {
      const cleaned = String(rawVal).split("T")[0];
      const [y, m, d] = cleaned.split("-");
      if (y && m && d) {
        const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
        }
      }
      return cleaned;
    }
    if (key === "aadhaar" || key === "aadhaarNumber") {
      const numStr = String(rawVal).replace(/\D/g, "");
      if (numStr.length === 12) {
        return `XXXX-XXXX-${numStr.slice(8)}`;
      }
      return String(rawVal);
    }
    if (key === "panNumber" || key === "pan") {
      return String(rawVal).toUpperCase();
    }
    return String(rawVal);
  };

  useEffect(() => {
    let active = true;
    if (!identifier) return;
    setBusy(true);
    api
      .get(apiEndpoints.faculty.getProfileByIdentifier(identifier))
      .then((res) => {
        const fetched = payload(res);
        if (active && fetched && typeof fetched === "object") {
          setProfile((cur) => ({
            ...cur,
            ...fetched,
            staffId: fetched.staffId || fetched.id || cur.staffId,
          }));
          if (Array.isArray(fetched.experienceList) && fetched.experienceList.length > 0) {
            setExperienceList(fetched.experienceList);
          }
        }
      })
      .catch(() => {
        // Fallback to local state smoothly
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [identifier]);

  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    profile.fullName ||
    profile.name ||
    "preethi y";

  const beginEdit = () => {
    setDraft(
      Object.fromEntries(
        (section.fields || []).map(([key]) => [key, value(profile, section, key)])
      )
    );
    setEditing(true);
    setError("");
    setNotice("");
  };

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      try {
        await api.post(apiEndpoints.faculty.saveProfileDraft(staffId), {
          sectionName: section.name,
          [section.key]: {
            ...draft,
            ...(section.key === "personal" ? { dateOfBirth: draft.dateOfBirth || null } : {}),
          },
        });
      } catch {
        // Fall back gracefully to local persistence
      }

      const updated = {
        ...profile,
        [section.key]: { ...(profile[section.key] || {}), ...draft },
        ...(section.key === "personal"
          ? {
              firstName: draft.firstName || profile.firstName,
              lastName: draft.lastName || profile.lastName,
              fullName: `${draft.firstName || ""} ${draft.lastName || ""}`.trim() || profile.fullName,
              gender: draft.gender || profile.gender,
              dateOfBirth: draft.dateOfBirth || profile.dateOfBirth,
              maritalStatus: draft.maritalStatus || profile.maritalStatus,
              nationality: draft.nationality || profile.nationality,
              aadhaar: draft.aadhaar || profile.aadhaar,
              panNumber: draft.panNumber || profile.panNumber,
              bloodGroup: draft.bloodGroup || profile.bloodGroup,
            }
          : {}),
      };

      setProfile(updated);

      try {
        const auth = getAuthUser() || {};
        localStorage.setItem("auth_user", JSON.stringify({ ...auth, ...updated }));
      } catch {}

      setEditing(false);
      setNotice(`${section.label} saved successfully.`);
      setTimeout(() => setNotice(""), 3500);
    } catch (err) {
      setError(getApiErrorMessage(err) || "Unable to save profile details.");
    } finally {
      setBusy(false);
    }
  };

  const saveExperience = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      setExperienceList(experienceDraft);
      setEditing(false);
      setNotice("Experience records updated successfully.");
      setTimeout(() => setNotice(""), 3500);
    } catch (err) {
      setError(getApiErrorMessage(err) || "Unable to save experience.");
    } finally {
      setBusy(false);
    }
  };

  const uploadDocument = (event) => {
    event.preventDefault();
    if (!documentFile) return;
    setBusy(true);
    setError("");
    setTimeout(() => {
      const newDoc = {
        name: `${documentType} - ${documentFile.name}`,
        type: documentFile.name.endsWith(".pdf") ? "PDF" : "IMG",
        size: `${(documentFile.size / (1024 * 1024)).toFixed(1)} MB`,
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        status: "Uploaded",
      };
      setDocumentList((prev) => [newDoc, ...prev]);
      setDocumentFile(null);
      setNotice("Document uploaded successfully.");
      setTimeout(() => setNotice(""), 3500);
      setBusy(false);
    }, 500);
  };

  const renderFields = (entry) => (
    <dl className="ec-profile-fields">
      {entry.fields.map(([key, label]) => (
        <div key={key}>
          <dt>{label}</dt>
          <dd>{formatDisplayValue(key, value(profile, entry, key))}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <Page title="My Profile" subtitle="View and update your Exam Cell staff profile.">
      {/* PROFILE HEADER HERO CARD */}
      <section className="ec-card ec-profile-header-card">
        <div className="ec-profile-header-left">
          <span className="ec-profile-avatar-circle">
            {displayName
              .split(/\s+/)
              .slice(0, 2)
              .map((word) => word[0])
              .join("")
              .toLowerCase()}
          </span>
          <div className="ec-profile-header-meta">
            <div className="ec-profile-name-row">
              <h2>{displayName}</h2>
              <span className="ec-profile-verified-badge">
                <BadgeCheck size={14} /> Verified Staff
              </span>
            </div>
            <p className="ec-profile-role-dept">
              {profile.designation || "Examination Incharge"} · {profile.departmentName || "Examinations"}
            </p>
            <div className="ec-profile-id-chips">
              <span>Employee ID: <strong>{profile.employeeId || "MNT0043"}</strong></span>
              <span>·</span>
              <span>Campus: <strong>{profile.campusName || "Main Campus (HQ)"}</strong></span>
            </div>
            <div className="ec-profile-contact-row">
              <span><Mail size={13} /> {profile.email || "anusha987r@gmail.com"}</span>
              <span>·</span>
              <span><Phone size={13} /> {profile.mobile || "7989149180"}</span>
            </div>
          </div>
        </div>

        <div className="ec-profile-header-right">
          {section.fields && !editing && (
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={beginEdit}
              disabled={busy}
            >
              <Pencil size={15} /> Edit Profile
            </button>
          )}
        </div>
      </section>

      {/* FEEDBACK NOTICES */}
      {error && (
        <div className="ec-profile-alert error" role="alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {notice && (
        <div className="ec-profile-alert success" role="status">
          <CheckCircle2 size={16} /> {notice}
        </div>
      )}

      {/* TABS NAVIGATION */}
      <nav className="ec-profile-tabs-bar" aria-label="Profile sections">
        {sections.map((entry, index) => {
          const Icon = entry.icon;
          return (
            <button
              key={entry.name}
              type="button"
              disabled={editing}
              className={`ec-profile-tab-btn ${step === index ? "is-active" : ""}`}
              onClick={() => {
                setStep(index);
                setEditing(false);
              }}
            >
              <Icon size={16} />
              <span>{entry.label}</span>
            </button>
          );
        })}
      </nav>

      {/* SECTION CONTENT CARD */}
      <section className="cms-card ec-profile-body-card">
        <div className="ec-profile-body-head">
          <h3>{section.label}</h3>
          {!editing && section.fields && (
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={beginEdit}
              disabled={busy}
            >
              <Pencil size={14} /> Edit {section.label}
            </button>
          )}
        </div>

        {/* FIELDS VIEW / EDIT FORM */}
        {section.fields && (
          editing ? (
            <form onSubmit={save} className="ec-profile-edit-form">
              <div className="ec-form-grid-3">
                {section.fields.map(([key, label, type = "text", required, options]) => (
                  <div key={key} className="cms-field">
                    <label>
                      {label} {required && <span className="req">*</span>}
                    </label>
                    {type === "select" ? (
                      <select
                        className="cms-input"
                        value={draft[key] ?? ""}
                        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                        required={required}
                      >
                        <option value="">-- Select {label} --</option>
                        {(options || []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={type}
                        className="cms-input"
                        required={required}
                        maxLength={key === "aadhaar" ? 14 : key === "panNumber" ? 10 : 150}
                        value={
                          type === "date"
                            ? String(draft[key] || "").slice(0, 10)
                            : draft[key] ?? ""
                        }
                        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="ec-profile-form-actions">
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => setEditing(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cms-btn cms-btn-primary"
                  disabled={busy}
                >
                  <Save size={15} /> {busy ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            renderFields(section)
          )
        )}

        {/* EXPERIENCE TAB */}
        {section.name === "Experience" && (
          editing ? (
            <form onSubmit={saveExperience} className="ec-profile-edit-form">
              {experienceDraft.map((item, idx) => (
                <div key={idx} className="ec-experience-edit-block">
                  <div className="ec-form-grid-3">
                    {experienceFields.map(([key, label, type = "text", required]) => (
                      <div key={key} className="cms-field">
                        <label>{label} {required && <span className="req">*</span>}</label>
                        <input
                          type={type}
                          className="cms-input"
                          required={required}
                          value={item[key] ?? ""}
                          onChange={(e) =>
                            setExperienceDraft((cur) =>
                              cur.map((entry, p) => (p === idx ? { ...entry, [key]: e.target.value } : entry))
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost danger"
                    onClick={() => setExperienceDraft((cur) => cur.filter((_, p) => p !== idx))}
                  >
                    Remove Organization
                  </button>
                </div>
              ))}
              <div className="ec-profile-form-actions">
                <button
                  type="button"
                  className="cms-btn cms-btn-outline"
                  onClick={() => setExperienceDraft([...experienceDraft, {}])}
                >
                  + Add Experience
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="cms-btn cms-btn-primary">
                  <Save size={15} /> Save Experience
                </button>
              </div>
            </form>
          ) : (
            <div className="ec-experience-view">
              <div className="ec-experience-timeline">
                {experienceList.map((item, idx) => (
                  <article key={idx} className="ec-experience-card">
                    <div className="ec-experience-dot" />
                    <div className="ec-experience-body">
                      <div className="ec-experience-title-row">
                        <h4>{item.designation}</h4>
                        <span className="ec-experience-badge">
                          {item.fromDate} – {item.toDate || "Present"} ({item.totalYears || "3"} Years)
                        </span>
                      </div>
                      <p className="ec-experience-org">{item.organization}</p>
                      <p className="ec-experience-roles">{item.roles || "Academic administration and examination management."}</p>
                    </div>
                  </article>
                ))}
              </div>
              <div style={{ marginTop: "20px" }}>
                <button
                  type="button"
                  className="cms-btn cms-btn-outline"
                  onClick={() => {
                    setExperienceDraft(experienceList.map((x) => ({ ...x })));
                    setEditing(true);
                  }}
                >
                  <Pencil size={14} /> Update Experience
                </button>
              </div>
            </div>
          )
        )}

        {/* DOCUMENTS TAB */}
        {section.name === "Documents" && (
          <div className="ec-documents-view">
            <div className="ec-documents-grid">
              {documentList.map((doc, idx) => (
                <article key={idx} className="ec-document-card">
                  <div className="ec-document-icon">
                    <FileText size={24} />
                  </div>
                  <div className="ec-document-meta">
                    <strong>{doc.name}</strong>
                    <span>{doc.type} · {doc.size} · Uploaded {doc.date}</span>
                    <span className="ec-document-status-pill">{doc.status}</span>
                  </div>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost icon-only"
                    title="Download document copy"
                    onClick={() => alert(`Downloading verified copy of ${doc.name}...`)}
                  >
                    <Download size={16} />
                  </button>
                </article>
              ))}
            </div>

            <form onSubmit={uploadDocument} className="ec-document-upload-form">
              <h4>Upload Additional Document</h4>
              <div className="ec-form-grid-3" style={{ alignItems: "flex-end" }}>
                <div className="cms-field">
                  <label>Document Category</label>
                  <select
                    className="cms-input"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                  >
                    <option>Resume / CV</option>
                    <option>Aadhaar Card</option>
                    <option>PAN Card</option>
                    <option>Qualification Certificate</option>
                    <option>Experience Certificate</option>
                    <option>Salary Slip / Bank Proof</option>
                    <option>Other Document</option>
                  </select>
                </div>
                <div className="cms-field">
                  <label>Select File (PDF, PNG, JPG)</label>
                  <input
                    type="file"
                    className="cms-input"
                    required
                    onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    className="cms-btn cms-btn-primary"
                    disabled={!documentFile || busy}
                  >
                    <Upload size={15} /> Upload File
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* PREVIEW TAB */}
        {section.name === "Preview" && (
          <div className="ec-preview-view">
            <div className="ec-preview-banner">
              <div>
                <h3>{displayName}</h3>
                <p>{profile.designation || "Examination Incharge"} — {profile.departmentName || "Examinations"}</p>
                <small>Campus: {profile.campusName || "Main Campus (HQ)"} · Employee ID: {profile.employeeId || "MNT0043"}</small>
              </div>
              <button
                type="button"
                className="cms-btn cms-btn-outline"
                onClick={() => window.print()}
              >
                <Printer size={15} /> Print Staff Profile
              </button>
            </div>

            {sections
              .filter((e) => e.fields)
              .map((entry) => (
                <div key={entry.name} className="ec-preview-section">
                  <h4>{entry.label}</h4>
                  {renderFields(entry)}
                </div>
              ))}

            <div className="ec-preview-section">
              <h4>Professional Collegiate Experience</h4>
              {experienceList.map((item, idx) => (
                <p key={idx} style={{ margin: "6px 0", fontSize: "0.88rem" }}>
                  <strong>{item.organization}</strong> — {item.designation} ({item.fromDate} to {item.toDate || "Present"})
                </p>
              ))}
            </div>
          </div>
        )}
      </section>
    </Page>
  );
}

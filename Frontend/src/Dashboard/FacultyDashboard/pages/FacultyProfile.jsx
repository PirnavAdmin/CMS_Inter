import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Check,
  Edit3,
  Download,
  Camera,
  Loader2,
  Trash2,
  UploadCloud,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  User,
} from "lucide-react";
import { useFaculty } from "../FacultyContext.jsx";
import { facultyMockData } from "../data/facultyMockData.js";
import apiClient from "@/api/apiClient.js";
import apiEndpoints from "@/api/apiEndpoints.js";
import "../styles/FacultyProfile.css";

const PIN_LOOKUP = {
  "522": { district: "Guntur", state: "Andhra Pradesh", country: "India" },
  "520": { district: "NTR (Krishna)", state: "Andhra Pradesh", country: "India" },
  "521": { district: "Krishna", state: "Andhra Pradesh", country: "India" },
  "523": { district: "Prakasam", state: "Andhra Pradesh", country: "India" },
  "524": { district: "SPSR Nellore", state: "Andhra Pradesh", country: "India" },
  "517": { district: "Tirupati / Chittoor", state: "Andhra Pradesh", country: "India" },
  "518": { district: "Kurnool", state: "Andhra Pradesh", country: "India" },
  "515": { district: "Anantapur", state: "Andhra Pradesh", country: "India" },
  "516": { district: "YSR Kadapa", state: "Andhra Pradesh", country: "India" },
  "530": { district: "Visakhapatnam", state: "Andhra Pradesh", country: "India" },
  "531": { district: "Anakapalli", state: "Andhra Pradesh", country: "India" },
  "532": { district: "Srikakulam", state: "Andhra Pradesh", country: "India" },
  "533": { district: "Kakinada / East Godavari", state: "Andhra Pradesh", country: "India" },
  "534": { district: "Eluru / West Godavari", state: "Andhra Pradesh", country: "India" },
  "535": { district: "Vizianagaram", state: "Andhra Pradesh", country: "India" },
  "500": { district: "Hyderabad", state: "Telangana", country: "India" },
  "501": { district: "Ranga Reddy", state: "Telangana", country: "India" },
  "502": { district: "Sangareddy / Medak", state: "Telangana", country: "India" },
  "505": { district: "Karimnagar", state: "Telangana", country: "India" },
  "506": { district: "Warangal", state: "Telangana", country: "India" },
  "560": { district: "Bengaluru", state: "Karnataka", country: "India" },
  "600": { district: "Chennai", state: "Tamil Nadu", country: "India" },
  "110": { district: "New Delhi", state: "Delhi", country: "India" },
  "400": { district: "Mumbai", state: "Maharashtra", country: "India" },
};

export const PROFILE_STEPS = [
  { id: 1, title: "Personal Info", subtitle: "Personal Information" },
  { id: 2, title: "Bank Info", subtitle: "Bank Details" },
  { id: 3, title: "Address Info", subtitle: "Address Information" },
  { id: 4, title: "Experience", subtitle: "Experience Details" },
  { id: 5, title: "Documents", subtitle: "Upload Documents" },
  { id: 6, title: "Preview", subtitle: "Review & Confirmation" },
];

function SelectInput({ value, onChange, options = [], disabled = false, placeholder = "Select..." }) {
  const safeOpts = useMemo(() => (Array.isArray(options) ? options : []), [options]);

  return (
    <div className="cms-select-wrap">
      <select
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {safeOpts.map((opt) => {
          const val = typeof opt === "object" ? opt.value : opt;
          const lbl = typeof opt === "object" ? opt.label : opt;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
      <ChevronDown className="cms-select-caret" size={13} />
    </div>
  );
}

function SearchSelectInput({
  label = "",
  placeholder = "",
  options = [],
  value = "",
  onChange,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");
  const ref = useRef(null);

  const safeOpts = useMemo(() => (Array.isArray(options) ? options : []), [options]);

  const getOptValue = (o) => (o && typeof o === "object" ? String(o.value ?? o.label ?? o.name ?? "") : String(o ?? ""));
  const getOptLabel = (o) => (o && typeof o === "object" ? String(o.label ?? o.name ?? o.value ?? "") : String(o ?? ""));

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOpts = useMemo(() => {
    const withoutOther = safeOpts.filter((o) => {
      const s = getOptLabel(o).toLowerCase().trim();
      return s !== "other" && s !== "others";
    });
    const q = (search || "").toLowerCase().trim();
    if (!q) return withoutOther;

    const currentSelected = (getOptLabel(value) || "").toLowerCase().trim();
    if (q === currentSelected) {
      return withoutOther;
    }

    return withoutOther.filter((o) => {
      const lbl = getOptLabel(o).toLowerCase();
      const val = getOptValue(o).toLowerCase();
      return lbl.includes(q) || val.includes(q);
    });
  }, [safeOpts, search, value]);

  const handleSelect = (opt) => {
    const optVal = getOptValue(opt);
    const optLbl = getOptLabel(opt);
    setSearch(optLbl);
    if (typeof onChange === "function") onChange(optVal);
    setOpen(false);
  };

  const defaultPlaceholder = placeholder || `Search or select ${String(label || "").toLowerCase()}...`;

  if (disabled) {
    return (
      <div className="staff-custom-search-select" ref={ref}>
        <div className="staff-search-input-wrap disabled" style={{ cursor: "default", background: "var(--cms-subtle, #f8f9fa)" }}>
          <Search className="staff-search-icon" size={13} aria-hidden="true" />
          <input
            type="text"
            value={value || ""}
            disabled
            readOnly
            placeholder={defaultPlaceholder}
            style={{ cursor: "default", background: "transparent" }}
          />
          <ChevronDown className="staff-dropdown-caret" size={13} />
        </div>
      </div>
    );
  }

  return (
    <div className="staff-custom-search-select" ref={ref}>
      <div
        className="staff-search-input-wrap"
        onClick={() => {
          setOpen((prev) => !prev);
          const inputEl = ref.current?.querySelector("input");
          if (inputEl) inputEl.focus();
        }}
      >
        <Search className="staff-search-icon" size={13} aria-hidden="true" />
        <input
          type="text"
          value={search}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            if (typeof onChange === "function") onChange(e.target.value);
            setOpen(true);
          }}
          placeholder={defaultPlaceholder}
          autoComplete="off"
        />
        <ChevronDown
          className="staff-dropdown-caret"
          size={13}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((prev) => !prev);
            const inputEl = ref.current?.querySelector("input");
            if (inputEl) inputEl.focus();
          }}
        />
      </div>

      {open && (
        <div className="staff-search-dropdown-menu">
          {filteredOpts.length > 0 ? (
            filteredOpts.map((o, idx) => {
              const optVal = getOptValue(o);
              const optLbl = getOptLabel(o);
              const isSelected = value === optVal || value === optLbl;
              return (
                <div
                  key={`${optVal}-${idx}`}
                  className={`staff-search-dropdown-item ${isSelected ? "is-selected" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(o);
                  }}
                >
                  {optLbl}
                </div>
              );
            })
          ) : (
            <div className="staff-search-dropdown-empty">No options found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FacultyProfile() {
  const {
    profileData,
    setProfileData,
    persistStaffProfile,
    isEditingProfile,
    setIsEditingProfile,
    profileStep,
    setProfileStep,
    initials,
    notify,
  } = useFaculty();

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isFetchingPin, setIsFetchingPin] = useState(false);

  const avatarRef = useRef(null);
  const docFileRef = useRef(null);

  const [availableSubjects, setAvailableSubjects] = useState(facultyMockData.subjects || []);
  useEffect(() => {
    if (facultyMockData.subjects) setAvailableSubjects(facultyMockData.subjects);
  }, []);

  const [newExp, setNewExp] = useState({
    institution: "",
    designation: "",
    fromDate: "",
    toDate: "",
    subjectsTeached: "",
    totalExp: "",
  });

  const [newDoc, setNewDoc] = useState({
    type: "Aadhaar Card Copy",
    title: "",
    file: null,
  });

  const handlePincodeChange = (val) => {
    const clean = val.replace(/\D/g, "").slice(0, 6);
    setProfileData((prev) => ({ ...prev, pin: clean, pincode: clean }));

    if (clean.length === 6) {
      const pfx = clean.slice(0, 3);
      if (PIN_LOOKUP[pfx]) {
        const item = PIN_LOOKUP[pfx];
        setProfileData((prev) => ({
          ...prev,
          pin: clean,
          pincode: clean,
          district: item.district,
          state: item.state,
          country: item.country,
        }));
      }
      setIsFetchingPin(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Please select a valid image file (PNG, JPG, JPEG).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (base64) {
        setProfileData((prev) => {
          const updated = { ...prev, photoUrl: base64 };
          persistStaffProfile(updated);
          return updated;
        });
        notify("Profile photo updated successfully!");
      }
    };
    reader.readAsDataURL(file);
  };

  const hasVal = (val) => {
    if (val === null || val === undefined) return false;
    if (typeof val === "string") return val.trim().length > 0;
    if (typeof val === "number") return true;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "object") return Object.keys(val).length > 0;
    return Boolean(val);
  };

  const profileCompletion = useMemo(() => {
    const checklist = [
      hasVal(profileData.firstName),
      hasVal(profileData.lastName),
      hasVal(profileData.dob),
      hasVal(profileData.gender),
      hasVal(profileData.maritalStatus),
      hasVal(profileData.mobile),
      hasVal(profileData.email),
      hasVal(profileData.aadhaar),
      hasVal(profileData.pan),
      hasVal(profileData.department),
      hasVal(profileData.designation),
      hasVal(profileData.dateOfJoining),
      hasVal(profileData.bloodGroup),
      hasVal(profileData.photoUrl),

      hasVal(profileData.bankName),
      hasVal(profileData.accountHolder),
      hasVal(profileData.accountNumber),
      hasVal(profileData.ifsc),
      hasVal(profileData.branch),
      hasVal(profileData.accountType),
      hasVal(profileData.uanNumber || profileData.pfNumber),

      hasVal(profileData.houseNumber || profileData.address),
      hasVal(profileData.street || profileData.streetArea),
      hasVal(profileData.city || profileData.cityVillage),
      hasVal(profileData.pin || profileData.pincode),
      hasVal(profileData.district),
      hasVal(profileData.state),

      hasVal(profileData.experience),
      hasVal(profileData.documents),
    ];

    const filledCount = checklist.filter(Boolean).length;
    return Math.min(100, Math.round((filledCount / checklist.length) * 100));
  }, [profileData]);

  const handleDownloadProfile = async () => {
    try {
      setIsDownloadingPdf(true);
      notify("Generating official profile PDF...", "info");

      const [{ default: jsPDFModule, jsPDF: jsPDFNamed }, { default: autoTableModule, autoTable: autoTableNamed }] =
        await Promise.all([import("jspdf"), import("jspdf-autotable")]);

      const jsPDF = jsPDFNamed || (typeof jsPDFModule === "function" ? jsPDFModule : jsPDFModule.jsPDF);
      const autoTable = autoTableNamed || autoTableModule.default || autoTableModule;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      // 1. Top Olive Banner
      doc.setFillColor(111, 132, 0);
      doc.roundedRect(36, 20, 523, 46, 4, 4, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("PIRNAV JUNIOR COLLEGES", 48, 39);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(235, 240, 210);
      doc.text("OFFICIAL STAFF PROFILE & SERVICE RECORD", 48, 52);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`ACADEMIC YEAR: ${profileData.academicYear || "2025-2026"}`, 547, 39, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(235, 240, 210);
      doc.text(
        `BOARD: ${profileData.board || "BIEAP"}  |  STATUS: ${(profileData.status || "ACTIVE").toUpperCase()}`,
        547,
        52,
        { align: "right" }
      );

      // 2. Staff Identity Summary Card
      doc.setFillColor(248, 250, 242);
      doc.setDrawColor(218, 224, 195);
      doc.setLineWidth(0.75);
      doc.roundedRect(36, 74, 523, 62, 4, 4, "FD");

      let photoRendered = false;
      if (profileData.photoUrl && typeof profileData.photoUrl === "string" && profileData.photoUrl.startsWith("data:image/")) {
        try {
          const match = profileData.photoUrl.match(/data:image\/([a-zA-Z]+);base64,/);
          const format = match ? match[1].toUpperCase() : "JPEG";
          doc.addImage(profileData.photoUrl, format, 46, 81, 48, 48);
          photoRendered = true;
        } catch {
          photoRendered = false;
        }
      }

      if (!photoRendered) {
        doc.setFillColor(111, 132, 0);
        doc.circle(70, 105, 24, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text(initials, 70, 110, { align: "center" });
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text(profileData.fullName || "Staff Member", 106, 96);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(80, 95, 110);
      doc.text(
        `${profileData.designation || "Faculty"}  ·  Department of ${profileData.department || "Academics"}`,
        106,
        110
      );
      doc.text(
        `EMP ID: ${profileData.employeeId || "—"}  |  Joined: ${profileData.dateOfJoining || "—"}  |  Mobile: ${profileData.mobile || "—"}`,
        106,
        123
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated: ${new Date().toLocaleDateString("en-IN")} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        547,
        123,
        { align: "right" }
      );

      const labelCell = (text) => ({
        content: text,
        styles: { fontStyle: "bold", fillColor: [246, 248, 240], textColor: [70, 80, 50], fontSize: 8 },
      });
      const valCell = (text, colSpan = 1) => ({
        content: text || "—",
        colSpan,
        styles: { textColor: [20, 25, 30], fontSize: 8 },
      });

      const aadhaarFmt = profileData.aadhaar
        ? profileData.aadhaar.length >= 12
          ? `XXXX XXXX ${profileData.aadhaar.slice(-4)}`
          : profileData.aadhaar
        : "—";

      const fullAddr = [
        profileData.houseNumber || profileData.address,
        profileData.street || profileData.streetArea,
        profileData.city || profileData.cityVillage,
        profileData.district,
        profileData.state,
        profileData.country || "India",
        profileData.pin || profileData.pincode ? `PIN: ${profileData.pin || profileData.pincode}` : null,
      ]
        .filter(Boolean)
        .join(", ");

      const baseTableStyles = {
        theme: "plain",
        tableWidth: 523,
        styles: {
          lineColor: [218, 224, 195],
          lineWidth: 0.5,
          cellPadding: { top: 3.5, bottom: 3.5, left: 6, right: 6 },
        },
        columnStyles: {
          0: { cellWidth: 95 },
          1: { cellWidth: 166.5 },
          2: { cellWidth: 95 },
          3: { cellWidth: 166.5 },
        },
        margin: { left: 36, right: 36.28 },
      };

      // SECTION 1: Personal & Contact Information
      autoTable(doc, {
        ...baseTableStyles,
        startY: 144,
        head: [
          [
            {
              content: "1. PERSONAL & CONTACT INFORMATION",
              colSpan: 4,
              styles: { fillColor: [111, 132, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
            },
          ],
        ],
        body: [
          [labelCell("Employee ID"), valCell(profileData.employeeId), labelCell("Full Name"), valCell(profileData.fullName)],
          [labelCell("Date of Birth"), valCell(profileData.dob), labelCell("Gender"), valCell(profileData.gender)],
          [labelCell("Marital Status"), valCell(profileData.maritalStatus), labelCell("Blood Group"), valCell(profileData.bloodGroup)],
          [labelCell("Mobile Number"), valCell(profileData.mobile), labelCell("Official Email"), valCell(profileData.email)],
          [labelCell("Aadhaar Number"), valCell(aadhaarFmt), labelCell("PAN Card Number"), valCell(profileData.pan)],
          [labelCell("Department"), valCell(profileData.department), labelCell("Designation"), valCell(profileData.designation)],
          [labelCell("Date of Joining"), valCell(profileData.dateOfJoining), labelCell("Staff Type"), valCell(`${profileData.staffType || "Teaching"} Staff`)],
          [labelCell("Residential Address"), valCell(fullAddr, 3)],
        ],
      });

      // SECTION 2: Bank Details
      const maskedAcc = profileData.accountNumber
        ? profileData.accountNumber.length > 4
          ? `••••••••${profileData.accountNumber.slice(-4)}`
          : profileData.accountNumber
        : "—";

      autoTable(doc, {
        ...baseTableStyles,
        startY: doc.lastAutoTable.finalY + 12,
        head: [
          [
            {
              content: "2. BANK & SALARY ACCOUNT DETAILS",
              colSpan: 4,
              styles: { fillColor: [111, 132, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
            },
          ],
        ],
        body: [
          [labelCell("Bank Name"), valCell(profileData.bankName), labelCell("Account Holder"), valCell(profileData.accountHolder)],
          [labelCell("Account Number"), valCell(maskedAcc), labelCell("Account Type"), valCell(profileData.accountType || "Salary Account")],
          [labelCell("IFSC Code"), valCell(profileData.ifsc), labelCell("Branch Name"), valCell(profileData.branch)],
          [labelCell("PF / UAN Number"), valCell(profileData.uanNumber || profileData.pfNumber || "—", 3)],
        ],
      });

      // SECTION 3: Address Information
      autoTable(doc, {
        ...baseTableStyles,
        startY: doc.lastAutoTable.finalY + 12,
        head: [
          [
            {
              content: "3. ADDRESS INFORMATION",
              colSpan: 4,
              styles: { fillColor: [111, 132, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
            },
          ],
        ],
        body: [
          [labelCell("House / Flat No."), valCell(profileData.houseNumber || profileData.address), labelCell("Street / Area"), valCell(profileData.street || profileData.streetArea)],
          [labelCell("City / Village"), valCell(profileData.city || profileData.cityVillage), labelCell("Pincode"), valCell(profileData.pin || profileData.pincode)],
          [labelCell("District"), valCell(profileData.district), labelCell("State"), valCell(profileData.state)],
          [labelCell("Country"), valCell(profileData.country || "India", 3)],
        ],
      });

      // SECTION 4: Professional Academic Experience
      const expRows =
        profileData.experience && profileData.experience.length > 0
          ? profileData.experience.map((e, idx) => [
              { content: String(idx + 1), styles: { halign: "center" } },
              e.institution || "—",
              e.designation || "—",
              `${e.fromDate || "—"} to ${e.toDate || "—"}`,
              e.subjectsTeached || e.subjectsTaught || "—",
              { content: e.totalExp || "—", styles: { halign: "center" } },
            ])
          : [
              [
                { content: "—", styles: { halign: "center" } },
                {
                  content: "No prior experience records provided.",
                  colSpan: 5,
                  styles: { halign: "center", fontStyle: "italic", textColor: [120, 120, 120] },
                },
              ],
            ];

      autoTable(doc, {
        theme: "plain",
        tableWidth: 523,
        startY: doc.lastAutoTable.finalY + 12,
        margin: { left: 36, right: 36.28 },
        styles: {
          lineColor: [218, 224, 195],
          lineWidth: 0.5,
          cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
          fontSize: 8,
          textColor: [20, 25, 30],
        },
        head: [
          [
            {
              content: "4. PROFESSIONAL ACADEMIC & TEACHING EXPERIENCE",
              colSpan: 6,
              styles: { fillColor: [111, 132, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
            },
          ],
          [
            { content: "#", styles: { halign: "center", cellWidth: 25 } },
            { content: "Institution / College", styles: { cellWidth: 135 } },
            { content: "Designation", styles: { cellWidth: 100 } },
            { content: "Period (From – To)", styles: { cellWidth: 85 } },
            { content: "Subjects Teached", styles: { cellWidth: 118 } },
            { content: "Total Exp", styles: { halign: "center", cellWidth: 60 } },
          ],
        ],
        headStyles: {
          fillColor: [246, 248, 240],
          textColor: [70, 80, 50],
          fontStyle: "bold",
          fontSize: 8,
        },
        body: expRows,
      });

      // SECTION 5: Uploaded Documents
      const docRows =
        profileData.documents && profileData.documents.length > 0
          ? profileData.documents.map((d, idx) => [
              { content: String(idx + 1), styles: { halign: "center" } },
              d.name || "—",
              d.type || "—",
              { content: d.format || d.type || "PDF", styles: { halign: "center" } },
              { content: d.size || "—", styles: { halign: "center" } },
              { content: d.status || "Verified", styles: { halign: "center", textColor: [34, 139, 34], fontStyle: "bold" } },
            ])
          : [
              [
                { content: "—", styles: { halign: "center" } },
                {
                  content: "No documents uploaded.",
                  colSpan: 5,
                  styles: { halign: "center", fontStyle: "italic", textColor: [120, 120, 120] },
                },
              ],
            ];

      autoTable(doc, {
        theme: "plain",
        tableWidth: 523,
        startY: doc.lastAutoTable.finalY + 12,
        margin: { left: 36, right: 36.28 },
        styles: {
          lineColor: [218, 224, 195],
          lineWidth: 0.5,
          cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
          fontSize: 8,
          textColor: [20, 25, 30],
        },
        head: [
          [
            {
              content: "5. UPLOADED VERIFICATION DOCUMENTS",
              colSpan: 6,
              styles: { fillColor: [111, 132, 0], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
            },
          ],
          [
            { content: "#", styles: { halign: "center", cellWidth: 25 } },
            { content: "Document Title", styles: { cellWidth: 155 } },
            { content: "Document Category", styles: { cellWidth: 140 } },
            { content: "Format", styles: { halign: "center", cellWidth: 55 } },
            { content: "File Size", styles: { halign: "center", cellWidth: 65 } },
            { content: "Status", styles: { halign: "center", cellWidth: 83 } },
          ],
        ],
        headStyles: {
          fillColor: [246, 248, 240],
          textColor: [70, 80, 50],
          fontStyle: "bold",
          fontSize: 8,
        },
        body: docRows,
      });

      const safeFileName = (profileData.fullName || "Staff").replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeEmpId = (profileData.employeeId || "Staff").replace(/[^a-zA-Z0-9_-]/g, "_");
      doc.save(`Staff_Profile_${safeEmpId}_${safeFileName}.pdf`);

      notify("Staff Profile PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF generation error:", err);
      notify("Failed to generate PDF. Please try again.", "error");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const validateCurrentProfileStep = () => {
    const requiredByStep = {
      1: [
        ["firstName", "First name"],
        ["lastName", "Last name"],
        ["gender", "Gender"],
        ["maritalStatus", "Marital status"],
        ["dob", "Date of birth"],
        ["mobile", "Phone number"],
        ["email", "Email"],
        ["aadhaar", "Aadhaar number"],
        ["pan", "PAN number"],
        ["department", "Department"],
        ["designation", "Designation"],
        ["dateOfJoining", "Date of joining"],
      ],
      2: [
        ["bankName", "Bank name"],
        ["accountHolder", "Account holder name"],
        ["accountNumber", "Account number"],
        ["ifsc", "IFSC code"],
        ["branch", "Branch name"],
        ["accountType", "Account type"],
      ],
      3: [
        ["houseNumber", "House number"],
        ["street", "Street / area"],
        ["city", "City / village"],
        ["pin", "Pincode"],
        ["district", "District"],
        ["state", "State"],
        ["country", "Country"],
      ],
    };
    const fallbacks = { houseNumber: "address", street: "streetArea", city: "cityVillage", pin: "pincode" };
    const missing = (requiredByStep[profileStep] || [])
      .filter(([key]) => !String(profileData[key] ?? profileData[fallbacks[key]] ?? "").trim())
      .map(([, label]) => label);
    if (missing.length) {
      notify(`Complete the required fields: ${missing.join(", ")}.`, "error");
      return false;
    }
    return true;
  };

  const handleSaveAndNext = async () => {
    if (isEditingProfile) {
      if (!validateCurrentProfileStep()) return;
      persistStaffProfile(profileData);

      try {
        let sectionName = "";
        let payload = {};

        switch (profileStep) {
          case 1:
            sectionName = "Personal";
            payload.Personal = {
              firstName: profileData.firstName,
              middleName: profileData.middleName,
              lastName: profileData.lastName,
              gender: profileData.gender,
              dateOfBirth: profileData.dob || null,
              maritalStatus: profileData.maritalStatus,
              aadhaar: profileData.aadhaar,
              panNumber: profileData.pan,
              bloodGroup: profileData.bloodGroup,
            };
            break;
          case 2:
            sectionName = "Bank";
            payload.Bank = {
              bankName: profileData.bankName,
              accountHolderName: profileData.accountHolder,
              accountNumber: profileData.accountNumber,
              ifscCode: profileData.ifsc,
              branch: profileData.branch,
              accountType: profileData.accountType,
            };
            break;
          case 3:
            sectionName = "Address";
            payload.Address = {
              currentAddress: profileData.houseNumber,
              city: profileData.city,
              district: profileData.district,
              state: profileData.state,
              pincode: profileData.pin,
              country: profileData.country,
            };
            break;
          case 4:
            sectionName = "Experience";
            payload.Experience = (profileData.experience || []).map((e) => ({
              institutionName: e.institution,
              designation: e.designation,
              fromDate: e.fromDate || null,
              toDate: e.toDate || null,
              subjectsTaught: e.subjectsTeached,
            }));
            break;
          case 5:
            sectionName = "Documents";
            break;
          default:
            break;
        }

        if (sectionName && profileData.id) {
          await apiClient.put(apiEndpoints.faculty.saveProfileDraft(profileData.id), {
            sectionName,
            ...payload,
          });
        }
      } catch (e) {
        console.error("Failed to save profile section:", e);
      }

      notify(`Step ${profileStep} (${PROFILE_STEPS[profileStep - 1].title}) updated!`);
    }
    if (profileStep < 6) {
      setProfileStep((s) => s + 1);
    }
  };

  const handleFinalProfileSave = async () => {
    setIsSavingProfile(true);

    try {
      if (profileData.id) {
        await apiClient.post(apiEndpoints.faculty.submitProfile(profileData.id));
      }
      persistStaffProfile(profileData);
      try {
        localStorage.setItem("staff_profile_submitted", "true");
      } catch {}
      setIsSavingProfile(false);
      setIsEditingProfile(false);
      notify("Complete staff profile updated and verified successfully!");
    } catch (e) {
      console.error("Failed to submit profile:", e);
      notify("Failed to submit profile to server", "error");
      setIsSavingProfile(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="cms-page-head sp-profile-page-head">
        <div>
          <h1>My Profile</h1>
          <p>{isEditingProfile ? "You can now edit your profile details" : "Complete your profile step by step"}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--cms-primary, #6F8400)",
              background: "var(--cms-primary-soft, #f7f9ee)",
              border: "1px solid var(--cms-primary-soft-border, #e2e8b8)",
              padding: "6px 14px",
              borderRadius: "20px",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {profileCompletion}% Profile Completed
          </span>
          <button
            type="button"
            className="cms-btn cms-btn-secondary"
            onClick={handleDownloadProfile}
            disabled={isDownloadingPdf}
            title="Download PDF"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 size={14} className="spin" /> Generating PDF...
              </>
            ) : (
              <>
                <Download size={14} /> Download PDF
              </>
            )}
          </button>
          <button
            type="button"
            className={`cms-btn ${isEditingProfile ? "cms-btn-secondary" : "cms-btn-primary"}`}
            onClick={() => setIsEditingProfile((prev) => !prev)}
            title={isEditingProfile ? "Cancel Edit" : "Edit Profile"}
          >
            <Edit3 size={14} /> {isEditingProfile ? "Cancel Edit" : "Edit"}
          </button>
        </div>
      </div>

      {/* Staff Identity Strip with Profile Photo Edit - Compact Single-Line Layout */}
      <div className="cms-card sp-profile-summary-card">
        <div className="cms-card-body sp-profile-summary-body">
          <div className="sp-profile-header-inline">
            <div className="sp-profile-avatar-wrap">
              <div
                className="sp-profile-avatar"
                onClick={() => {
                  avatarRef.current?.click();
                }}
                title="Click to Change Profile Photo"
              >
                {profileData.photoUrl ? (
                  <img
                    src={profileData.photoUrl}
                    alt={profileData.fullName}
                  />
                ) : (
                  <User size={30} strokeWidth={1.8} className="sp-profile-user-icon" />
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  avatarRef.current?.click();
                }}
                className="sp-profile-photo-edit"
                title="Change Photo"
              >
                <Camera size={12} strokeWidth={2.4} />
              </button>

              <input
                ref={avatarRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="sp-profile-photo-input"
                style={{ display: "none" }}
                onChange={handlePhotoUpload}
              />
            </div>

            <div className="sp-profile-meta-single-line">
              <span className="sp-profile-meta-name">{profileData.fullName}</span>
              <span className="sp-profile-meta-divider">·</span>
              <span className="sp-profile-meta-role">
                {profileData.designation} · {profileData.department}
              </span>
              <span className="sp-profile-meta-divider">·</span>
              <span className="sp-profile-meta-id">
                ID: <strong>{profileData.employeeId}</strong>
              </span>
              <span className="sp-profile-meta-divider">·</span>
              <span className="sp-profile-meta-tag">{profileData.staffType || "Teaching"} Staff</span>
              <span className="sp-profile-meta-divider">·</span>
              <span className="sp-profile-meta-tag">Board: {profileData.board || "BIEAP"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Wizard Stepper (Steps 1 to 6) */}
      <div className="sp-wizard-stepper">
        {PROFILE_STEPS.map((step) => {
          const isActive = profileStep === step.id;
          const isCompleted = profileStep > step.id;
          return (
            <button
              type="button"
              key={step.id}
              className={`sp-wizard-step ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
              onClick={() => setProfileStep(step.id)}
              title={`View ${step.title}`}
            >
              <div className="sp-wizard-num">{isCompleted ? <Check size={14} /> : step.id}</div>
              <span className="sp-wizard-title">{step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Step Form Card */}
      <div className={`cms-card ${isEditingProfile ? "sp-profile-edit-mode" : "sp-profile-view-mode"}`}>
        <div className="cms-card-body sp-profile-form-body">
          {/* STEP 1: PERSONAL INFORMATION (Read-Only Official Records) */}
          {profileStep === 1 && (
            <div>
              <div
                className="cms-card-head"
                style={{ padding: "0 0 16px 0", borderBottom: "1px solid var(--cms-border)", marginBottom: 18 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Personal Information</h3>
                  <span
                    className="cms-badge cms-badge-inactive"
                    style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", minHeight: 20 }}
                  >
                    Official Record · Read Only
                  </span>
                </div>
                <span className="cms-badge cms-badge-info">Step 1 of 6</span>
              </div>
              <div className="cms-form-grid cols-3 sp-profile-form-grid">
                {/* Row 1 */}
                <div className="cms-field">
                  <label>
                    Employee ID <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.employeeId || ""}
                    readOnly
                    disabled
                  />
                </div>
                <div className="cms-field">
                  <label>
                    First Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.firstName || ""}
                    readOnly
                    disabled
                  />
                </div>
                <div className="cms-field">
                  <label>Middle Name</label>
                  <input
                    type="text"
                    value={profileData.middleName || ""}
                    readOnly
                    disabled
                    placeholder="—"
                  />
                </div>

                {/* Row 2 */}
                <div className="cms-field">
                  <label>
                    Last Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.lastName || ""}
                    readOnly
                    disabled
                  />
                </div>
                <div className="cms-field">
                  <label>
                    Date of Birth <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    value={profileData.dob || ""}
                    readOnly
                    disabled
                  />
                </div>
                <div className="cms-field">
                  <label>
                    Gender <span className="req">*</span>
                  </label>
                  <SelectInput
                    value={profileData.gender || "Male"}
                    disabled={true}
                    placeholder="Select Gender"
                    options={["Male", "Female", "Other"]}
                  />
                </div>

                {/* Row 3 */}
                <div className="cms-field">
                  <label>
                    Marital Status <span className="req">*</span>
                  </label>
                  <SelectInput
                    value={profileData.maritalStatus || "Single"}
                    disabled={true}
                    placeholder="Select Marital Status"
                    options={["Single", "Married", "Divorced", "Widowed"]}
                  />
                </div>
                <div className="cms-field">
                  <label>
                    Phone Number <span className="req">*</span>
                  </label>
                  <input
                    type="tel"
                    value={profileData.mobile || ""}
                    readOnly
                    disabled
                  />
                </div>
                <div className="cms-field">
                  <label>
                    Email <span className="req">*</span>
                  </label>
                  <input
                    type="email"
                    value={profileData.email || ""}
                    readOnly
                    disabled
                  />
                </div>

                {/* Row 4 */}
                <div className="cms-field">
                  <label>
                    Department <span className="req">*</span>
                  </label>
                  <SearchSelectInput
                    label="Department"
                    placeholder="Department"
                    options={[
                      "IT",
                      "Mathematics",
                      "Physics",
                      "Chemistry",
                      "English",
                      "Botany",
                      "Zoology",
                      "Commerce",
                      "Economics",
                      "Civics",
                      "Administration",
                      "Accounts",
                      "Library",
                      "Physical Education",
                    ]}
                    value={profileData.department || ""}
                    disabled={true}
                  />
                </div>
                <div className="cms-field">
                  <label>
                    Designation <span className="req">*</span>
                  </label>
                  <SearchSelectInput
                    label="Designation"
                    placeholder="Designation"
                    options={[
                      "Associate Software Engineer",
                      "Software Engineer",
                      "Junior Lecturer",
                      "Senior Lecturer",
                      "Lecturer",
                      "Head of Department (HOD)",
                      "Assistant Professor",
                      "Associate Professor",
                      "Professor",
                      "Lab Technician",
                      "Office Assistant",
                    ]}
                    value={profileData.designation || ""}
                    disabled={true}
                  />
                </div>
                <div className="cms-field">
                  <label>Blood Group</label>
                  <SelectInput
                    value={profileData.bloodGroup || "O-"}
                    disabled={true}
                    placeholder="Select Blood Group"
                    options={["O-", "O+", "A+", "A-", "B+", "B-", "AB+", "AB-"]}
                  />
                </div>

                {/* Row 5 */}
                <div className="cms-field">
                  <label>
                    Date of Joining <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    value={profileData.dateOfJoining || ""}
                    readOnly
                    disabled
                  />
                </div>
                <div className="cms-field">
                  <label>
                    Aadhaar Number <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={profileData.aadhaar || ""}
                    readOnly
                    disabled
                  />
                </div>
                <div className="cms-field">
                  <label>
                    PAN Number <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={profileData.pan || ""}
                    readOnly
                    disabled
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: BANK DETAILS */}
          {profileStep === 2 && (
            <div>
              <div
                className="cms-card-head"
                style={{ padding: "0 0 16px 0", borderBottom: "1px solid var(--cms-border)", marginBottom: 18 }}
              >
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Bank Details</h3>
                <span className="cms-badge cms-badge-info">Step 2 of 6</span>
              </div>
              <div className="cms-form-grid cols-3 sp-profile-form-grid">
                {/* Row 1 */}
                <div className="cms-field">
                  <label>Bank Name</label>
                  <SearchSelectInput
                    label="Bank Name"
                    placeholder="Search or select bank..."
                    options={[
                      "State Bank of India",
                      "HDFC Bank",
                      "ICICI Bank",
                      "Axis Bank",
                      "Canara Bank",
                      "Union Bank of India",
                      "Punjab National Bank",
                      "Bank of Baroda",
                      "Kotak Mahindra Bank",
                      "Other",
                    ]}
                    value={profileData.bankName || ""}
                    disabled={!isEditingProfile}
                    onChange={(val) => setProfileData({ ...profileData, bankName: val })}
                  />
                </div>
                <div className="cms-field">
                  <label>Account Holder Name</label>
                  <input
                    type="text"
                    value={profileData.accountHolder || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, accountHolder: e.target.value })}
                    placeholder="e.g. Devendra Kumar Gummadi"
                  />
                </div>
                <div className="cms-field">
                  <label>Account Number</label>
                  <input
                    type="text"
                    value={profileData.accountNumber || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, accountNumber: e.target.value })}
                    placeholder="e.g. 38920194823482"
                  />
                </div>

                {/* Row 2 */}
                <div className="cms-field">
                  <label>IFSC Code</label>
                  <input
                    type="text"
                    maxLength={11}
                    value={profileData.ifsc || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, ifsc: e.target.value.toUpperCase() })}
                    placeholder="e.g. SBIN0001234"
                  />
                </div>
                <div className="cms-field">
                  <label>Branch Name</label>
                  <input
                    type="text"
                    value={profileData.branch || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, branch: e.target.value })}
                    placeholder="e.g. Guntur Main Branch"
                  />
                </div>
                <div className="cms-field">
                  <label>Account Type</label>
                  <SelectInput
                    value={profileData.accountType || "Salary Account"}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, accountType: e.target.value })}
                    placeholder="Select Account Type"
                    options={["Salary Account", "Savings Account", "Current Account"]}
                  />
                </div>

                {/* Row 3 */}
                <div className="cms-field">
                  <label>PF Number / UAN</label>
                  <input
                    type="text"
                    value={profileData.uanNumber || profileData.pfNumber || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) =>
                      setProfileData({ ...profileData, uanNumber: e.target.value, pfNumber: e.target.value })
                    }
                    placeholder="e.g. 200982349812"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ADDRESS INFO */}
          {profileStep === 3 && (
            <div>
              <div
                className="cms-card-head"
                style={{ padding: "0 0 16px 0", borderBottom: "1px solid var(--cms-border)", marginBottom: 18 }}
              >
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Address Information</h3>
                <span className="cms-badge cms-badge-info">Step 3 of 6</span>
              </div>
              <div className="cms-form-grid cols-3 sp-profile-form-grid">
                {/* Row 1 */}
                <div className="cms-field">
                  <label>
                    House Number <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.houseNumber || profileData.address || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, houseNumber: e.target.value, address: e.target.value })}
                    placeholder="e.g. 15-18-387"
                  />
                </div>
                <div className="cms-field">
                  <label>
                    Street / Area <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.street || profileData.streetArea || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, street: e.target.value, streetArea: e.target.value })}
                    placeholder="e.g. Brindavan Gardens"
                  />
                </div>
                <div className="cms-field">
                  <label>
                    City / Village <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.city || profileData.cityVillage || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value, cityVillage: e.target.value })}
                    placeholder="e.g. Guntur"
                  />
                </div>

                {/* Row 2 */}
                <div className="cms-field">
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>
                      Pincode <span className="req">*</span>
                    </span>
                    {isFetchingPin && (
                      <span style={{ fontSize: 11, color: "var(--cms-primary)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <Loader2 size={11} className="spin" /> Auto-fetching location...
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={profileData.pin || profileData.pincode || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="Enter 6-digit PIN (e.g. 522007)"
                  />
                </div>
                <div className="cms-field">
                  <label>
                    District <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.district || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, district: e.target.value })}
                    placeholder="Auto-filled from PIN (e.g. Guntur)"
                  />
                </div>
                <div className="cms-field">
                  <label>
                    State <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.state || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                    placeholder="Auto-filled from PIN (e.g. Andhra Pradesh)"
                  />
                </div>

                {/* Row 3 */}
                <div className="cms-field">
                  <label>
                    Country <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.country || "India"}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                    placeholder="e.g. India"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: EXPERIENCE */}
          {profileStep === 4 && (
            <div>
              <div
                className="cms-card-head"
                style={{ padding: "0 0 16px 0", borderBottom: "1px solid var(--cms-border)", marginBottom: 18 }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Experience</h3>
                  <p style={{ margin: "4px 0 0", color: "var(--cms-muted)", fontSize: 12 }}>
                    Add your previous or current teaching &amp; academic experience below.
                  </p>
                </div>
                <span className="cms-badge cms-badge-info">Step 4 of 6</span>
              </div>

              {/* Blank input form for adding new experience */}
              <div
                style={{
                  background: "var(--cms-subtle, #f8f9fa)",
                  padding: "18px",
                  borderRadius: "10px",
                  border: "1px solid var(--cms-border)",
                  marginBottom: "20px",
                }}
              >
                <div className="cms-form-grid cols-3 sp-profile-form-grid">
                  {/* Row 1 */}
                  <div className="cms-field">
                    <label>Institution / College Name</label>
                    <input
                      type="text"
                      value={newExp.institution}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, institution: e.target.value })}
                      placeholder="e.g. Sri Chaitanya Junior College"
                    />
                  </div>
                  <div className="cms-field">
                    <label>Designation</label>
                    <input
                      type="text"
                      value={newExp.designation}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, designation: e.target.value })}
                      placeholder="e.g. Lecturer Mathematics"
                    />
                  </div>
                  <div className="cms-field">
                    <label>From Date</label>
                    <input
                      type="date"
                      value={newExp.fromDate}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, fromDate: e.target.value })}
                    />
                  </div>

                  {/* Row 2 */}
                  <div className="cms-field">
                    <label>To Date</label>
                    <input
                      type="date"
                      value={newExp.toDate || ""}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, toDate: e.target.value })}
                    />
                  </div>
                  <div className="cms-field">
                    <label>Subjects Teached</label>
                    <SearchSelectInput
                      label="Subject"
                      placeholder="Search or select subject..."
                      options={availableSubjects}
                      value={newExp.subjectsTeached}
                      disabled={!isEditingProfile}
                      onChange={(val) => setNewExp({ ...newExp, subjectsTeached: val })}
                    />
                  </div>
                  <div className="cms-field">
                    <label>Total Experience</label>
                    <input
                      type="text"
                      value={newExp.totalExp}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, totalExp: e.target.value })}
                      placeholder="e.g. 2 Years 6 Months"
                    />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    disabled={!isEditingProfile}
                    onClick={() => {
                      if (!isEditingProfile) {
                        notify("Please click 'Edit' in the top right corner to add experience.", "warning");
                        return;
                      }
                      if (!newExp.institution.trim()) {
                        notify("Please enter the institution name.", "error");
                        return;
                      }
                      if (!newExp.designation.trim()) {
                        notify("Please enter your designation.", "error");
                        return;
                      }
                      const record = {
                        id: Date.now(),
                        institution: newExp.institution.trim(),
                        designation: newExp.designation.trim(),
                        fromDate: newExp.fromDate || "—",
                        toDate: newExp.toDate || "—",
                        subjectsTeached: newExp.subjectsTeached || "—",
                        totalExp: newExp.totalExp || "1 Year",
                        status: "Verified",
                      };
                      const updatedExp = [...(profileData.experience || []), record];
                      setProfileData({ ...profileData, experience: updatedExp });
                      persistStaffProfile({ ...profileData, experience: updatedExp });
                      setNewExp({
                        institution: "",
                        designation: "",
                        fromDate: "",
                        toDate: "",
                        subjectsTeached: "",
                        totalExp: "",
                      });
                      notify("Experience record added successfully!");
                    }}
                  >
                    Add Experience
                  </button>
                </div>
              </div>

              {/* Added Experiences List */}
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: "16px 0 10px" }}>
                Experience History ({profileData.experience?.length || 0})
              </h4>
              {!profileData.experience || !profileData.experience.length ? (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "var(--cms-muted)",
                    background: "var(--cms-subtle, #f8f9fa)",
                    borderRadius: 8,
                    border: "1px dashed var(--cms-border)",
                  }}
                >
                  No experience records added yet. Fill out the form above and click "Add Experience".
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="cms-table">
                    <thead>
                      <tr>
                        <th>Institution</th>
                        <th>Designation</th>
                        <th>From Date</th>
                        <th>To Date</th>
                        <th>Subjects Teached</th>
                        <th>Total Exp</th>
                        <th>Status</th>
                        {isEditingProfile && <th style={{ textAlign: "center" }}>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {profileData.experience.map((x) => (
                        <tr key={x.id}>
                          <td className="cms-strong">{x.institution}</td>
                          <td>{x.designation}</td>
                          <td>{x.fromDate}</td>
                          <td>{x.toDate}</td>
                          <td>
                            <span className="cms-badge cms-badge-info">{x.subjectsTeached || x.subjectsTaught || "—"}</span>
                          </td>
                          <td>{x.totalExp}</td>
                          <td>
                            <span className={`cms-badge ${x.status === "Active" ? "cms-badge-active" : "cms-badge-info"}`}>
                              {x.status || "Verified"}
                            </span>
                          </td>
                          {isEditingProfile && (
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className="cms-action-btn"
                                style={{ color: "var(--cms-red)" }}
                                onClick={() => {
                                  const updated = profileData.experience.filter((item) => item.id !== x.id);
                                  setProfileData({ ...profileData, experience: updated });
                                  persistStaffProfile({ ...profileData, experience: updated });
                                  notify("Experience record removed.");
                                }}
                                title="Delete Experience"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: DOCUMENTS */}
          {profileStep === 5 && (
            <div>
              <div
                className="cms-card-head"
                style={{ padding: "0 0 16px 0", borderBottom: "1px solid var(--cms-border)", marginBottom: 18 }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Upload Documents</h3>
                  <p style={{ margin: "4px 0 0", color: "var(--cms-muted)", fontSize: 12 }}>
                    Upload identity cards, educational certificates, and employment proofs.
                  </p>
                </div>
                <span className="cms-badge cms-badge-info">Step 5 of 6</span>
              </div>

              {/* Upload Form */}
              <div
                style={{
                  background: "var(--cms-subtle, #f8f9fa)",
                  padding: "18px",
                  borderRadius: "10px",
                  border: "1px solid var(--cms-border)",
                  marginBottom: "20px",
                }}
              >
                <div className="cms-form-grid cols-3 sp-profile-form-grid">
                  <div className="cms-field">
                    <label>
                      Document Type <span className="req">*</span>
                    </label>
                    <SelectInput
                      value={newDoc.type}
                      disabled={!isEditingProfile}
                      onChange={(e) =>
                        setNewDoc({ ...newDoc, type: e.target.value, title: newDoc.title || e.target.value })
                      }
                      placeholder="Select Document Type"
                      options={[
                        "Aadhaar Card Copy",
                        "PAN Card Copy",
                        "Degree Certificate",
                        "Post Graduation Certificate",
                        "Experience Certificate",
                        "Relieving Letter",
                        "Passport Photo",
                        "Resume / CV",
                        "Bank Passbook / Cheque",
                        "Other Document",
                      ]}
                    />
                  </div>
                  <div className="cms-field">
                    <label>Document Title / Description</label>
                    <input
                      type="text"
                      value={newDoc.title}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                      placeholder="e.g. Degree Certificate (Original Copy)"
                    />
                  </div>
                  <div className="cms-field full">
                    <label>
                      Select Document File <span className="req">*</span>
                    </label>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        ref={docFileRef}
                        type="file"
                        disabled={!isEditingProfile}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => setNewDoc({ ...newDoc, file: e.target.files?.[0] || null })}
                      />
                      <button
                        type="button"
                        className="cms-btn cms-btn-primary"
                        disabled={!isEditingProfile}
                        onClick={async () => {
                          if (!isEditingProfile) {
                            notify("Please click 'Edit' in the top right corner to upload documents.", "warning");
                            return;
                          }
                          if (!newDoc.file) {
                            notify("Please select a file to upload.", "error");
                            return;
                          }
                          if (!profileData.id) {
                            notify("Please save basic profile first.", "error");
                            return;
                          }

                          try {
                            const formData = new FormData();
                            formData.append("file", newDoc.file);
                            formData.append("documentType", newDoc.type);

                            await apiClient.post(apiEndpoints.faculty.uploadDocument(profileData.id), formData, {
                              headers: { "Content-Type": "multipart/form-data" },
                            });

                            const docRecord = {
                              id: `doc-${Date.now()}`,
                              name: newDoc.title.trim() || newDoc.type,
                              type: newDoc.type,
                              format: newDoc.file.name.split(".").pop().toUpperCase(),
                              size: `${(newDoc.file.size / 1024).toFixed(1)} KB`,
                              date: new Date().toISOString().split("T")[0],
                              status: "Uploaded",
                              url: URL.createObjectURL(newDoc.file),
                            };
                            const updatedDocs = [...(profileData.documents || []), docRecord];
                            setProfileData({ ...profileData, documents: updatedDocs });
                            persistStaffProfile({ ...profileData, documents: updatedDocs });
                            setNewDoc({ type: "Aadhaar Card Copy", title: "", file: null });
                            if (docFileRef.current) docFileRef.current.value = "";
                            notify("Document uploaded successfully!");
                          } catch (e) {
                            console.error(e);
                            notify("Failed to upload document to server.", "error");
                          }
                        }}
                      >
                        <UploadCloud size={14} /> Upload Document
                      </button>
                    </div>
                    <small style={{ color: "var(--cms-muted)", marginTop: 6, display: "block" }}>
                      Supported formats: PDF, JPG, PNG, DOCX (Max 5MB)
                    </small>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents List */}
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: "16px 0 10px" }}>
                Uploaded Documents ({profileData.documents?.length || 0})
              </h4>
              {!profileData.documents || !profileData.documents.length ? (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "var(--cms-muted)",
                    background: "var(--cms-subtle, #f8f9fa)",
                    borderRadius: 8,
                    border: "1px dashed var(--cms-border)",
                  }}
                >
                  No documents uploaded yet. Use the form above to upload required documents.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="cms-table">
                    <thead>
                      <tr>
                        <th>Document Name</th>
                        <th>Type</th>
                        <th>Format</th>
                        <th>File Size</th>
                        <th>Upload Date</th>
                        <th>Verification</th>
                        <th style={{ textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileData.documents.map((d) => (
                        <tr key={d.id}>
                          <td className="cms-strong">{d.name}</td>
                          <td>{d.type}</td>
                          <td>
                            <span className="cms-badge cms-badge-info">{d.format || d.type}</span>
                          </td>
                          <td>{d.size}</td>
                          <td>{d.date || "—"}</td>
                          <td>
                            <span className="cms-badge cms-badge-active">{d.status || "Verified"}</span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              <button
                                type="button"
                                className="cms-action-btn"
                                onClick={() => {
                                  if (d.url) window.open(d.url, "_blank");
                                  else notify(`Viewing ${d.name}...`);
                                }}
                                title="View Document"
                              >
                                <Eye size={13} />
                              </button>
                              {isEditingProfile && (
                                <button
                                  type="button"
                                  className="cms-action-btn"
                                  style={{ color: "var(--cms-red)" }}
                                  onClick={() => {
                                    const updated = profileData.documents.filter((item) => item.id !== d.id);
                                    setProfileData({ ...profileData, documents: updated });
                                    persistStaffProfile({ ...profileData, documents: updated });
                                    notify("Document removed.");
                                  }}
                                  title="Delete Document"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: PREVIEW */}
          {profileStep === 6 && (
            <div>
              <div style={{ marginBottom: 22 }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "var(--cms-text, #0f172a)" }}>
                  Review &amp; Submit
                </h3>
                <p style={{ margin: 0, color: "var(--cms-muted, #64748b)", fontSize: 13 }}>
                  Review the saved employee details below before final submission.
                </p>
              </div>

              {/* 1. Personal Information Section */}
              <section className="sp-preview-section">
                <div className="sp-preview-header">
                  <h4 className="sp-preview-title">Personal Information</h4>
                  <span
                    className="cms-badge cms-badge-inactive"
                    style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", minHeight: 22 }}
                  >
                    Official Record · Read Only
                  </span>
                </div>
                <div className="sp-preview-grid">
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">EMPLOYEE ID</div>
                    <div className="sp-preview-value">{profileData.employeeId || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">FULL NAME</div>
                    <div className="sp-preview-value">{profileData.fullName || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">DATE OF BIRTH</div>
                    <div className="sp-preview-value">{profileData.dob || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">GENDER</div>
                    <div className="sp-preview-value">{profileData.gender || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">MARITAL STATUS</div>
                    <div className="sp-preview-value">{profileData.maritalStatus || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">PHONE NUMBER</div>
                    <div className="sp-preview-value">{profileData.mobile || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">EMAIL</div>
                    <div className="sp-preview-value">{profileData.email || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">AADHAAR NUMBER</div>
                    <div className="sp-preview-value">
                      {profileData.aadhaar
                        ? profileData.aadhaar.length >= 12
                          ? `XXXX XXXX ${profileData.aadhaar.slice(-4)}`
                          : profileData.aadhaar
                        : "—"}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">PAN NUMBER</div>
                    <div className="sp-preview-value">{profileData.pan || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">DEPARTMENT</div>
                    <div className="sp-preview-value">{profileData.department || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">DESIGNATION</div>
                    <div className="sp-preview-value">{profileData.designation || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">DATE OF JOINING</div>
                    <div className="sp-preview-value">{profileData.dateOfJoining || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">EXPERIENCE (YEARS)</div>
                    <div className="sp-preview-value">
                      {profileData.experience?.length ? `${profileData.experience.length} Entries` : "0"}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">BLOOD GROUP</div>
                    <div className="sp-preview-value">{profileData.bloodGroup || "—"}</div>
                  </div>
                  <div className="sp-preview-box full">
                    <div className="sp-preview-label">ADDRESS</div>
                    <div className="sp-preview-value">
                      {[
                        profileData.houseNumber || profileData.address,
                        profileData.street || profileData.streetArea,
                        profileData.city || profileData.cityVillage,
                        profileData.district,
                        profileData.state,
                        profileData.country || "India",
                        profileData.pin || profileData.pincode,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Bank Details Section */}
              <section className="sp-preview-section">
                <div className="sp-preview-header">
                  <h4 className="sp-preview-title">Bank Details</h4>
                  <button
                    type="button"
                    className="sp-preview-edit-pill"
                    onClick={() => {
                      setIsEditingProfile(true);
                      setProfileStep(2);
                    }}
                  >
                    Edit
                  </button>
                </div>
                <div className="sp-preview-grid">
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">ACCOUNT HOLDER NAME</div>
                    <div className="sp-preview-value">{profileData.accountHolder || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">BANK NAME</div>
                    <div className="sp-preview-value">{profileData.bankName || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">ACCOUNT NUMBER</div>
                    <div className="sp-preview-value">
                      {profileData.accountNumber ? `••••••${String(profileData.accountNumber).slice(-4)}` : "—"}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">ACCOUNT TYPE</div>
                    <div className="sp-preview-value">{profileData.accountType || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">IFSC CODE</div>
                    <div className="sp-preview-value">{profileData.ifsc || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">BRANCH NAME</div>
                    <div className="sp-preview-value">{profileData.branch || "—"}</div>
                  </div>
                  <div className="sp-preview-box full">
                    <div className="sp-preview-label">PF NUMBER / UAN</div>
                    <div className="sp-preview-value">{profileData.uanNumber || profileData.pfNumber || "—"}</div>
                  </div>
                </div>
              </section>

              {/* 3. Address Information Section */}
              <section className="sp-preview-section">
                <div className="sp-preview-header">
                  <h4 className="sp-preview-title">Address Information</h4>
                  <button
                    type="button"
                    className="sp-preview-edit-pill"
                    onClick={() => {
                      setIsEditingProfile(true);
                      setProfileStep(3);
                    }}
                  >
                    Edit
                  </button>
                </div>
                <div className="sp-preview-grid">
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">HOUSE NUMBER</div>
                    <div className="sp-preview-value">{profileData.houseNumber || profileData.address || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">STREET / AREA</div>
                    <div className="sp-preview-value">{profileData.street || profileData.streetArea || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">CITY / VILLAGE</div>
                    <div className="sp-preview-value">{profileData.city || profileData.cityVillage || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">PINCODE</div>
                    <div className="sp-preview-value">{profileData.pin || profileData.pincode || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">DISTRICT</div>
                    <div className="sp-preview-value">{profileData.district || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">STATE</div>
                    <div className="sp-preview-value">{profileData.state || "—"}</div>
                  </div>
                  <div className="sp-preview-box full">
                    <div className="sp-preview-label">COUNTRY</div>
                    <div className="sp-preview-value">{profileData.country || "India"}</div>
                  </div>
                </div>
              </section>

              {/* 4. Experience Section */}
              <section className="sp-preview-section">
                <div className="sp-preview-header">
                  <h4 className="sp-preview-title">Experience</h4>
                  <button
                    type="button"
                    className="sp-preview-edit-pill"
                    onClick={() => {
                      setIsEditingProfile(true);
                      setProfileStep(4);
                    }}
                  >
                    Edit
                  </button>
                </div>
                {!profileData.experience || !profileData.experience.length ? (
                  <div
                    style={{
                      padding: "18px",
                      textAlign: "center",
                      color: "var(--cms-muted)",
                      background: "var(--cms-subtle, #f8fafc)",
                      borderRadius: 12,
                      border: "1px dashed var(--cms-border)",
                    }}
                  >
                    No experience records added.
                  </div>
                ) : (
                  profileData.experience.map((exp, idx) => (
                    <div key={exp.id || idx} className="sp-preview-subcard">
                      <div className="sp-preview-subcard-title">Experience {idx + 1}</div>
                      <div className="sp-preview-grid">
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">COMPANY / INSTITUTION NAME</div>
                          <div className="sp-preview-value">{exp.institution || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">DESIGNATION</div>
                          <div className="sp-preview-value">{exp.designation || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">FROM DATE</div>
                          <div className="sp-preview-value">{exp.fromDate || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">TO DATE</div>
                          <div className="sp-preview-value">{exp.toDate || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">SUBJECTS TEACHED</div>
                          <div className="sp-preview-value">{exp.subjectsTeached || exp.subjectsTaught || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">YEARS / TOTAL EXPERIENCE</div>
                          <div className="sp-preview-value">{exp.totalExp || "—"}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </section>

              {/* 5. Uploaded Documents Section */}
              <section className="sp-preview-section">
                <div className="sp-preview-header">
                  <h4 className="sp-preview-title">Uploaded Documents ({profileData.documents?.length || 0})</h4>
                  <button
                    type="button"
                    className="sp-preview-edit-pill"
                    onClick={() => {
                      setIsEditingProfile(true);
                      setProfileStep(5);
                    }}
                  >
                    Edit
                  </button>
                </div>
                {!profileData.documents || !profileData.documents.length ? (
                  <div
                    style={{
                      padding: "18px",
                      textAlign: "center",
                      color: "var(--cms-muted)",
                      background: "var(--cms-subtle, #f8fafc)",
                      borderRadius: 12,
                      border: "1px dashed var(--cms-border)",
                    }}
                  >
                    No documents uploaded.
                  </div>
                ) : (
                  profileData.documents.map((doc, idx) => (
                    <div key={doc.id || idx} className="sp-preview-subcard">
                      <div className="sp-preview-subcard-title">Document {idx + 1}</div>
                      <div className="sp-preview-grid">
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">DOCUMENT TYPE</div>
                          <div className="sp-preview-value">{doc.type || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">FILE NAME</div>
                          <div className="sp-preview-value">{doc.name || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">FILE TYPE</div>
                          <div className="sp-preview-value">{doc.format || doc.type || "PDF"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">SIZE</div>
                          <div className="sp-preview-value">{doc.size || "—"}</div>
                        </div>
                        <div className="sp-preview-box full">
                          <div className="sp-preview-label">FILE</div>
                          <div>
                            <a
                              href={doc.url || "#"}
                              onClick={(e) => {
                                if (!doc.url) {
                                  e.preventDefault();
                                  notify(`Viewing document ${doc.name}...`);
                                } else {
                                  window.open(doc.url, "_blank");
                                }
                              }}
                              style={{
                                color: "var(--cms-primary, #6F8400)",
                                fontWeight: 700,
                                textDecoration: "none",
                                fontSize: 14,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                cursor: "pointer",
                              }}
                            >
                              <Eye size={15} /> View Document
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </section>

              {/* Preview Footer */}
              <div
                className="sp-preview-footer"
                style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}
              >
                <button type="button" className="sp-btn-back" onClick={() => setProfileStep(5)}>
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  className="sp-btn-submit"
                  onClick={handleFinalProfileSave}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? <Loader2 size={16} className="spin" /> : <Check size={16} />} Final Submit
                </button>
              </div>
            </div>
          )}

          {/* Stepper Footer for Steps 1 through 5 */}
          {profileStep < 6 &&
            isEditingProfile &&
            (profileStep === 2 || profileStep === 4 ? (
              <div
                className="sp-wizard-footer"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  marginTop: 24,
                  paddingTop: 18,
                  borderTop: "1px solid var(--cms-border)",
                }}
              >
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  style={{
                    background: "var(--cms-surface, #ffffff)",
                    border: "1px solid var(--cms-border, #d1d5db)",
                    color: "var(--cms-text, #1e293b)",
                    padding: "0 22px",
                    height: "38px",
                    fontWeight: 600,
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                  onClick={() => setProfileStep((s) => s - 1)}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    style={{
                      padding: "0 22px",
                      height: "38px",
                      borderRadius: "8px",
                      fontWeight: 600,
                    }}
                    onClick={handleSaveAndNext}
                  >
                    Update &amp; Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="sp-wizard-footer"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 24,
                  paddingTop: 18,
                  borderTop: "1px solid var(--cms-border)",
                }}
              >
                {profileStep > 1 && (
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={() => setProfileStep((s) => s - 1)}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                )}
                <button type="button" className="cms-btn cms-btn-primary" onClick={handleSaveAndNext}>
                  {profileStep === 1 ? "Next" : "Update & Next"} <ChevronRight size={16} />
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

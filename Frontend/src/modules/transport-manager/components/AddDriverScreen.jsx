import React, { useState, useEffect, useRef, useMemo, Fragment } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Search,
  Upload,
  UserRound,
  X,
  Pencil,
} from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import apiEndpoints from "@/api/apiEndpoints.js";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { Modal, Toast } from "@/shared/components/Ui.jsx";
import { incrementSeriesSequence } from "@/data/numberSeriesData.js";
import { resolveNextStaffEmployeeId } from "@/modules/admin/AdminFaculty/StaffManagementPage.jsx";
import "@/modules/admin/AdminFaculty/StaffManagementPage.css";

// ----------------------------------------------------------------------
// VALIDATIONS
// ----------------------------------------------------------------------
function validateStepFields(fieldsList = [], values = {}, activeBoardName = "") {
  const newErrors = {};
  for (const f of fieldsList) {
    if (!Array.isArray(f) || f.length < 2) continue;
    const name = f[0];
    const label = f[1] || name;
    const type = f[2] || "text";
    const isRequired = f[4] !== false;

    let val = values?.[name];
    if (name === "board" && (val === undefined || val === "")) {
      val = values?.boardName || activeBoardName;
    }

    const isEmpty =
      val === undefined ||
      val === null ||
      (typeof val === "string" && val.trim() === "") ||
      (Array.isArray(val) && val.length === 0);

    if (isRequired && isEmpty) {
      if (type === "select" || type === "search-select") {
        newErrors[name] = `Please select a ${label.toLowerCase()}`;
      } else {
        newErrors[name] = `${label} is required`;
      }
      continue;
    }

    if (!isEmpty) {
      const strVal = String(val).trim();

      // First Name
      if (name === "firstName") {
        if (strVal.length < 2) {
          newErrors[name] = "First Name must be at least 2 characters";
        } else if (!/^[a-zA-Z\s.-]+$/.test(strVal)) {
          newErrors[name] = "First Name should only contain letters";
        }
      }

      // Middle Name
      if (name === "middleName") {
        if (!/^[a-zA-Z\s.-]+$/.test(strVal)) {
          newErrors[name] = "Middle Name should only contain letters";
        }
      }

      // Last Name
      if (name === "lastName") {
        if (strVal.length < 1) {
          newErrors[name] = "Last Name is required";
        } else if (!/^[a-zA-Z\s.-]+$/.test(strVal)) {
          newErrors[name] = "Last Name should only contain letters";
        }
      }

      // Father's / Guardian's Name
      if (name === "guardianName") {
        if (strVal.length < 2) {
          newErrors[name] = "Name must be at least 2 characters";
        } else if (!/^[a-zA-Z\s.-]+$/.test(strVal)) {
          newErrors[name] = "Name should only contain letters";
        }
      }

      // Date of Birth (min 18 years)
      if (name === "dateOfBirth") {
        const dob = new Date(strVal);
        if (isNaN(dob.getTime())) {
          newErrors[name] = "Please enter a valid Date of Birth";
        } else {
          const today = new Date();
          if (dob > today) {
            newErrors[name] = "Date of Birth cannot be a future date";
          } else {
            const minAgeDate = new Date();
            minAgeDate.setFullYear(today.getFullYear() - 18);
            const maxAgeDate = new Date();
            maxAgeDate.setFullYear(today.getFullYear() - 85);

            if (dob > minAgeDate) {
              newErrors[name] = "Staff member must be at least 18 years old";
            } else if (dob < maxAgeDate) {
              newErrors[name] = "Please enter a valid Date of Birth";
            }
          }
        }
      }

      // Date of Joining
      if (name === "dateOfJoining") {
        const doj = new Date(strVal);
        if (isNaN(doj.getTime())) {
          newErrors[name] = "Please enter a valid Date of Joining";
        } else if (values?.dateOfBirth) {
          const dob = new Date(values.dateOfBirth);
          if (!isNaN(dob.getTime())) {
            const eligibleDoj = new Date(dob);
            eligibleDoj.setFullYear(dob.getFullYear() + 18);
            if (doj < eligibleDoj) {
              newErrors[name] = "Date of Joining cannot be before age 18";
            }
          }
        }
      }

      // Mobile Numbers
      if (name === "mobile" || name === "emergencyMobile") {
        const cleanMobile = strVal.replace(/\D/g, "");
        if (cleanMobile.length !== 10) {
          newErrors[name] = "Mobile number must be exactly 10 digits";
        } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
          newErrors[name] = "Mobile number must start with 6, 7, 8, or 9";
        }
      } else if (name === "alternateMobile" || name === "emergencyAlternate") {
        const cleanAlt = strVal.replace(/\D/g, "");
        if (cleanAlt.length > 0) {
          if (cleanAlt.length !== 10) {
            newErrors[name] = "Alternate mobile must be exactly 10 digits";
          } else if (!/^[6-9]\d{9}$/.test(cleanAlt)) {
            newErrors[name] = "Alternate mobile must start with 6, 7, 8, or 9";
          } else if (values?.mobile && cleanAlt === String(values.mobile).replace(/\D/g, "")) {
            newErrors[name] = "Alternate mobile should be different from primary mobile";
          }
        }
      }

      // Email Address
      if (name === "email" || type === "email") {
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(strVal)) {
          newErrors[name] = "Please enter a valid email address (e.g. name@example.com)";
        }
      }

      // Aadhaar
      if (name === "aadhaar") {
        const cleanAadhaar = strVal.replace(/\s|-/g, "");
        if (!/^\d{12}$/.test(cleanAadhaar)) {
          newErrors[name] = "Aadhaar number must be exactly 12 digits";
        }
      }

      // PAN
      if (name === "pan") {
        const cleanPan = strVal.toUpperCase().replace(/\s/g, "");
        if (cleanPan.length > 0 && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
          newErrors[name] = "PAN must be in valid format (e.g. ABCDE1234F)";
        }
      }

      // PINCODE
      if (name === "pin") {
        const cleanPin = strVal.replace(/\D/g, "");
        if (cleanPin.length !== 6) {
          newErrors[name] = "PINCODE must be exactly 6 digits";
        }
      }

      // Current Address
      if (name === "currentAddress" && strVal.length < 5) {
        newErrors[name] = "Address must be at least 5 characters";
      }

      // Driver's License Number (15-16 alphanumeric characters)
      if (name === "drivingLicenseNumber") {
        const cleanDL = strVal.toUpperCase().replace(/[-/\s]/g, "");
        if (cleanDL.length > 0) {
          if (cleanDL.length < 15 || cleanDL.length > 16) {
            newErrors[name] = "Driving License Number must be 15 to 16 characters";
          } else if (!/^[A-Z0-9]{15,16}$/.test(cleanDL)) {
            newErrors[name] = "Driving License Number must contain only letters and numbers";
          }
        }
      }

      // License Expiry Date
      if (name === "drivingLicenseExpiryDate" || name === "licenseExpiryDate") {
        const expDate = new Date(strVal);
        if (isNaN(expDate.getTime())) {
          newErrors[name] = "Please enter a valid License Expiry Date";
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (expDate < today) {
            newErrors[name] = "Driving license has expired. Please select a valid future expiry date.";
          }
        }
      }
    }
  }
  return newErrors;
}

// ----------------------------------------------------------------------
// SEARCH SELECT COMPONENT
// ----------------------------------------------------------------------
function SearchSelectInput({ label = "", opts = [], value = "", onChange, hasError = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const ref = useRef(null);

  const safeOpts = useMemo(() => (Array.isArray(opts) ? opts : []), [opts]);

  const getOptValue = (o) =>
    o && typeof o === "object" ? String(o.value ?? o.label ?? o.name ?? "") : String(o ?? "");
  const getOptLabel = (o) =>
    o && typeof o === "object" ? String(o.label ?? o.name ?? o.value ?? "") : String(o ?? "");

  const selectedOpt = useMemo(() => {
    if (!value) return null;
    const valStr = String(value).trim().toLowerCase();
    return (
      safeOpts.find(
        (o) =>
          getOptValue(o).trim().toLowerCase() === valStr ||
          getOptLabel(o).trim().toLowerCase() === valStr
      ) || null
    );
  }, [value, safeOpts]);

  useEffect(() => {
    if (!isUserTyping) {
      setSearch(selectedOpt ? getOptLabel(selectedOpt) : String(value || ""));
    }
  }, [value, selectedOpt, isUserTyping]);

  const filteredOpts = useMemo(() => {
    const q = (search || "").toLowerCase().trim();
    if (!isUserTyping || !q) {
      return safeOpts;
    }
    return safeOpts.filter((o) => {
      const lbl = getOptLabel(o).toLowerCase();
      const val = getOptValue(o).toLowerCase();
      return lbl.includes(q) || val.includes(q);
    });
  }, [safeOpts, search, isUserTyping]);

  const handleSelect = (opt) => {
    if (!opt) {
      setSearch("");
      if (typeof onChange === "function") onChange("");
    } else {
      const optVal = getOptValue(opt);
      const optLbl = getOptLabel(opt);
      setSearch(optLbl);
      if (typeof onChange === "function") onChange(optVal);
    }
    setIsUserTyping(false);
    setOpen(false);
    setHighlightIndex(0);
  };

  useEffect(() => {
    const clickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        if (isUserTyping) {
          const q = (search || "").trim().toLowerCase();
          if (!q) {
            handleSelect(null);
          } else {
            const exact = safeOpts.find(
              (o) =>
                getOptLabel(o).trim().toLowerCase() === q ||
                getOptValue(o).trim().toLowerCase() === q
            );
            if (exact) {
              handleSelect(exact);
            } else {
              setSearch(selectedOpt ? getOptLabel(selectedOpt) : String(value || ""));
            }
          }
          setIsUserTyping(false);
        }
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, [isUserTyping, search, safeOpts, selectedOpt, value]);

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
        return;
      }
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (filteredOpts.length > 0 ? (prev + 1) % filteredOpts.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (filteredOpts.length > 0 ? (prev - 1 + filteredOpts.length) % filteredOpts.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (filteredOpts.length > 0) {
        const target =
          highlightIndex >= 0 && highlightIndex < filteredOpts.length
            ? filteredOpts[highlightIndex]
            : filteredOpts[0];
        handleSelect(target);
      }
    } else if (e.key === "Tab") {
      if (open && filteredOpts.length > 0 && isUserTyping) {
        const target =
          highlightIndex >= 0 && highlightIndex < filteredOpts.length
            ? filteredOpts[highlightIndex]
            : filteredOpts[0];
        handleSelect(target);
      }
      setOpen(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setIsUserTyping(false);
      setSearch(selectedOpt ? getOptLabel(selectedOpt) : String(value || ""));
    }
  };

  return (
    <div className={`staff-custom-search-select ${hasError ? "has-error" : ""}`} ref={ref}>
      <div
        className="staff-search-input-wrap"
        style={{ ...(hasError ? { borderColor: "#ef4444" } : {}), cursor: "pointer" }}
        onClick={() => {
          setOpen((prev) => !prev);
          const inputEl = ref.current?.querySelector("input");
          if (inputEl) inputEl.focus();
        }}
      >
        <Search className="staff-search-icon" aria-hidden="true" size={13} />
        <input
          type="text"
          value={search}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          onFocus={(e) => {
            setOpen(true);
            setIsUserTyping(false);
            try {
              e.target.select();
            } catch { }
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsUserTyping(true);
            setHighlightIndex(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Search or select ${String(label || "").toLowerCase()}...`}
          autoComplete="off"
        />
        {value ? (
          <button
            type="button"
            className="staff-dropdown-clear-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "16px",
              height: "16px",
              padding: 0,
              border: 0,
              borderRadius: "50%",
              background: "var(--cms-border, #e5e7eb)",
              color: "var(--cms-muted, #6b7280)",
              cursor: "pointer",
              marginRight: "4px",
              flexShrink: 0,
            }}
            title="Clear selection"
            onClick={(e) => {
              e.stopPropagation();
              handleSelect(null);
            }}
          >
            <X size={10} />
          </button>
        ) : null}
        <ChevronDown
          className="staff-dropdown-caret"
          size={13}
          style={{
            transition: "transform 0.15s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((prev) => !prev);
            const inputEl = ref.current?.querySelector("input");
            if (inputEl) inputEl.focus();
          }}
        />
      </div>
      {open ? (
        <div
          className="staff-search-dropdown-menu"
          style={{
            backgroundColor: "#ffffff",
            background: "#ffffff",
            opacity: 1,
            zIndex: 99999,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08)",
            border: "1px solid var(--cms-border, #d1d5db)",
            maxHeight: "180px",
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "thin",
          }}
        >
          {filteredOpts.length > 0 ? (
            filteredOpts.map((o, idx) => {
              const optVal = getOptValue(o);
              const optLbl = getOptLabel(o);
              const isSelected = value === optVal || value === optLbl;
              const isHighlighted = idx === highlightIndex;
              return (
                <div
                  key={`${optVal}-${idx}`}
                  className={`staff-search-dropdown-item ${isSelected ? "is-selected" : ""} ${isHighlighted ? "is-highlighted" : ""}`}
                  style={{
                    backgroundColor: isHighlighted || isSelected
                      ? "var(--cms-primary-soft, #f0fdf4)"
                      : "#ffffff",
                    color: isHighlighted || isSelected
                      ? "var(--cms-primary, #355e3b)"
                      : "var(--cms-text, #1f2937)",
                    fontWeight: isSelected || isHighlighted ? "600" : "normal",
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => setHighlightIndex(idx)}
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
            <div className="staff-search-dropdown-empty" style={{ backgroundColor: "#ffffff" }}>
              No matching options found
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ----------------------------------------------------------------------
// FORM FIELD COMPONENT
// ----------------------------------------------------------------------
function FormField({
  item = [],
  values = {},
  setValues,
  setErrors = null,
  error = "",
  roleOptions = [],
  designationOptions = [],
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");

  useEffect(() => {
    return () => {
      if (localPreviewUrl && localPreviewUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(localPreviewUrl);
        } catch { }
      }
    };
  }, [localPreviewUrl]);

  const isValidItem = Array.isArray(item) && item.length >= 2;
  const name = isValidItem ? item[0] || "" : "";
  const label = isValidItem ? item[1] || name || "" : "";
  const type = isValidItem ? item[2] || "text" : "text";
  const options = isValidItem && Array.isArray(item[3]) ? item[3] : [];
  const required = isValidItem ? item[4] !== false : false;
  const layoutClass = isValidItem ? item[5] || "" : "";

  const safeValues = values && typeof values === "object" ? values : {};

  const opts = useMemo(() => {
    if (name === "role") {
      return roleOptions.map((r) => (typeof r === "object" ? r.roleName || r.name : String(r))).filter(Boolean);
    }
    if (name === "designation") {
      return designationOptions.map((d) => (typeof d === "object" ? d.name || d.designationName : String(d))).filter(Boolean);
    }
    return options;
  }, [name, roleOptions, designationOptions, options]);

  const change = (value) => {
    if (typeof setValues === "function") {
      setValues((prev) => {
        const next = { ...prev, [name]: value };
        if (name === "role") {
          next.roleName = value;
          // Set appropriate designation based on role
          const lower = String(value).toLowerCase();
          if (lower.includes("attendant")) {
            next.designation = next.designation || "Bus Attendant";
          } else if (lower.includes("driver")) {
            next.designation = next.designation || "Driver";
          }
        }
        return next;
      });
    }
    if (typeof setErrors === "function") {
      setErrors((prev) => {
        if (!prev || !prev[name]) return prev;
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleInputChange = (e) => {
    const rawVal = e?.target?.value ?? "";
    if (type === "file") {
      const file = e.target.files?.[0];
      if (!file) return;

      const previewUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(previewUrl);

      if (typeof setValues === "function") {
        setValues((prev) => ({
          ...prev,
          [name]: file.name,
          [name + "_file"]: file,
          [name + "_previewUrl"]: previewUrl,
        }));
      }

      if (typeof setErrors === "function") {
        setErrors((prev) => {
          if (!prev || !prev[name]) return prev;
          const copy = { ...prev };
          delete copy[name];
          return copy;
        });
      }
      return;
    }

    let raw = rawVal;
    if (name === "mobile" || name === "alternateMobile" || name === "emergencyMobile" || name === "emergencyAlternate") {
      raw = raw.replace(/\D/g, "").slice(0, 10);
    } else if (name === "pin") {
      raw = raw.replace(/\D/g, "").slice(0, 6);
    } else if (name === "aadhaar") {
      raw = raw.replace(/\D/g, "").slice(0, 12);
    } else if (name === "pan") {
      raw = raw.toUpperCase().slice(0, 10);
    } else if (name === "drivingLicenseNumber") {
      raw = raw.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 16);
    }

    change(raw);
  };

  const val = safeValues[name] !== undefined && safeValues[name] !== "" ? safeValues[name] : "";
  const hasError = Boolean(error);
  const errorStyle = hasError ? { borderColor: "#ef4444", boxShadow: "0 0 0 1px #ef4444" } : undefined;

  const todayStr = new Date().toISOString().split("T")[0];
  const maxDate = name === "dateOfBirth" ? todayStr : undefined;

  let inputMaxLength = undefined;
  if (name === "mobile" || name === "alternateMobile" || name === "emergencyMobile" || name === "emergencyAlternate") {
    inputMaxLength = 10;
  } else if (name === "aadhaar") {
    inputMaxLength = 12;
  } else if (name === "pin") {
    inputMaxLength = 6;
  } else if (name === "pan") {
    inputMaxLength = 10;
  } else if (name === "drivingLicenseNumber") {
    inputMaxLength = 16;
  }

  const fileAccept = type === "file"
    ? (name.toLowerCase().includes("photo") ? "image/jpeg,image/png,image/webp" : ".pdf,application/pdf")
    : undefined;

  const activePreviewUrl = localPreviewUrl || safeValues[name + "_previewUrl"] || "";

  // Department field is strictly read-only
  const isReadOnly = name === "employeeId" || name === "department";

  return (
    <label className={[type === "textarea" ? "is-wide" : "", layoutClass, hasError ? "has-field-error" : ""].filter(Boolean).join(" ")}>
      <span>
        {label} {required ? <b className="required-star" style={{ color: "#ef4444", marginLeft: "2px", fontWeight: "bold" }}>*</b> : null}
      </span>
      {type === "select" ? (
        <select
          value={val}
          onChange={(e) => change(e.target.value)}
          disabled={isReadOnly}
          style={{
            ...errorStyle,
            color: val ? "var(--cms-text)" : "var(--cms-muted, #738065)",
          }}
        >
          <option value="" disabled hidden style={{ color: "var(--cms-muted, #738065)" }}>
            Select {label}
          </option>
          {opts.map((o) => (
            <option key={o} value={o} style={{ color: "var(--cms-text)" }}>
              {o}
            </option>
          ))}
        </select>
      ) : type === "search-select" ? (
        <SearchSelectInput
          label={label}
          opts={opts}
          value={val}
          onChange={(v) => change(v)}
          hasError={hasError}
        />
      ) : type === "textarea" ? (
        <textarea value={val} onChange={handleInputChange} style={errorStyle} />
      ) : type === "file" ? (
        <div
          className={`cms-custom-file-box ${hasError ? "has-field-error" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            minHeight: 35,
            height: 35,
            border: hasError ? "1px solid #ef4444" : "1px solid var(--cms-border)",
            boxShadow: hasError ? "0 0 0 1px #ef4444" : undefined,
            borderRadius: 7,
            background: "var(--cms-surface, #ffffff)",
            overflow: "hidden",
            position: "relative",
            boxSizing: "border-box",
            ...errorStyle,
          }}
        >
          <input
            type="file"
            id={`file-input-${name}`}
            onChange={handleInputChange}
            accept={fileAccept}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const inp = document.getElementById(`file-input-${name}`);
              if (inp) inp.click();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: "100%",
              padding: "0 10px",
              background: "var(--cms-subtle, #f3f4f6)",
              border: "none",
              borderRight: "1px solid var(--cms-border, #e5e7eb)",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--cms-text, #374151)",
              whiteSpace: "nowrap",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Upload size={12} style={{ color: "var(--cms-primary, #355e3b)" }} />
            Choose File
          </button>
          <span
            onClick={val ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              setPreviewOpen(true);
            } : undefined}
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              padding: "0 8px",
              fontSize: 10,
              color: val ? "var(--cms-primary, #355e3b)" : "var(--cms-muted, #9ca3af)",
              fontWeight: val ? 600 : 400,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: val ? "pointer" : "default",
              textDecoration: val ? "underline" : "none",
              textUnderlineOffset: 2,
            }}
            title={val ? `Click to preview: ${val}` : "No file chosen"}
          >
            {val || "No file chosen"}
          </span>
          {val ? (
            <div style={{ display: "flex", alignItems: "center", gap: 3, paddingRight: 6, flexShrink: 0 }}>
              <button
                type="button"
                className="cms-file-clear-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (localPreviewUrl && localPreviewUrl.startsWith("blob:")) {
                    try {
                      URL.revokeObjectURL(localPreviewUrl);
                    } catch { }
                  }
                  change("");
                  setLocalPreviewUrl("");
                  if (typeof setValues === "function") {
                    setValues((prev) => ({
                      ...prev,
                      [name]: "",
                      [name + "_file"]: null,
                      [name + "_previewUrl"]: "",
                    }));
                  }
                  const inp = document.getElementById(`file-input-${name}`);
                  if (inp) inp.value = "";
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  border: "none",
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  cursor: "pointer",
                  padding: 0,
                }}
                title="Remove selected file"
              >
                <X size={12} />
              </button>
            </div>
          ) : null}
          {previewOpen ? (
            <Modal
              title={`${label} Preview: ${val}`}
              onClose={() => setPreviewOpen(false)}
              size="lg"
            >
              <div style={{ width: "100%", height: "70vh", minHeight: 480, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {activePreviewUrl ? (
                  val.toLowerCase().endsWith(".pdf") ? (
                    <object
                      data={activePreviewUrl}
                      type="application/pdf"
                      style={{ width: "100%", height: "100%", border: "1px solid var(--cms-border, #e5e7eb)", borderRadius: 8 }}
                    >
                      <iframe
                        src={activePreviewUrl}
                        title={val}
                        style={{ width: "100%", height: "100%", border: "none", borderRadius: 8 }}
                      />
                    </object>
                  ) : (
                    <img
                      src={activePreviewUrl}
                      alt={val}
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }}
                    />
                  )
                ) : (
                  <div style={{ textAlign: "center", color: "var(--cms-muted)", padding: 40 }}>
                    <FileText size={48} style={{ color: "var(--cms-primary, #355e3b)", marginBottom: 12, margin: "0 auto" }} />
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--cms-text)" }}>{val}</p>
                    <p style={{ margin: "6px 0 0", fontSize: 12 }}>Document file selected for upload</p>
                  </div>
                )}
              </div>
            </Modal>
          ) : null}
        </div>
      ) : (
        <input
          type={type}
          readOnly={isReadOnly}
          value={val}
          onChange={handleInputChange}
          maxLength={inputMaxLength}
          max={maxDate}
          style={{
            ...errorStyle,
            ...(isReadOnly ? { background: "var(--cms-subtle, #f3f4f6)", cursor: "not-allowed" } : {}),
          }}
        />
      )}
      {error ? (
        <small className="field-error" style={{ color: "#ef4444", fontSize: 11, display: "block", marginTop: 4, fontWeight: 500 }}>
          {error}
        </small>
      ) : null}
    </label>
  );
}

// ----------------------------------------------------------------------
// PREVIEW / SUMMARY COMPONENT
// ----------------------------------------------------------------------
function Summary({ record, groups = [], onEdit }) {
  return (
    <div className="staff-summary" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, padding: 14 }}>
      {groups.map(([groupTitle, fields], groupIndex) => (
        <article
          key={groupTitle}
          style={{
            border: "1px solid var(--cms-border, #e5e7eb)",
            borderRadius: 8,
            padding: 14,
            background: "var(--cms-subtle, #f9fafb)",
          }}
        >
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderBottom: "1px solid var(--cms-border, #e5e7eb)", paddingBottom: 6 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--cms-text, #1f2937)" }}>
              {groupTitle}
            </h3>
            {typeof onEdit === "function" && (
              <button
                type="button"
                onClick={() => onEdit(groupIndex)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  border: "1px solid var(--cms-border, #d1d5db)",
                  borderRadius: 6,
                  background: "#ffffff",
                  color: "var(--cms-primary, #355e3b)",
                  cursor: "pointer",
                }}
              >
                <Pencil size={11} /> Edit
              </button>
            )}
          </header>
          <div style={{ display: "grid", gap: 6 }}>
            {fields.map((f) => {
              const fName = f[0];
              const fLabel = f[1] || fName;
              const fVal = record[fName];
              return (
                <div
                  key={fName}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "130px 1fr",
                    fontSize: 11,
                    gap: 8,
                    padding: "3px 0",
                    borderBottom: "1px solid rgba(0,0,0,0.04)",
                  }}
                >
                  <span style={{ color: "var(--cms-muted, #6b7280)", fontWeight: 500 }}>{fLabel}</span>
                  <strong style={{ color: "var(--cms-text, #111827)", overflowWrap: "anywhere" }}>
                    {fVal != null && fVal !== "" ? String(fVal) : "—"}
                  </strong>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------
// MAIN ADD DRIVER SCREEN COMPONENT
// ----------------------------------------------------------------------
export default function AddDriverScreen({ onCancel, onSuccess, existingDrivers = [] }) {
  const { selectedCampus } = useCampusContext();
  const { boards, selectedBoard } = useAcademicContext();

  const activeCampusId = selectedCampus?.campusId || selectedCampus?.id;
  const activeCampusName = selectedCampus?.name || selectedCampus?.campusName || "";
  const activeCampusCode = selectedCampus?.code || selectedCampus?.campusCode || "";

  const activeBoardCode = selectedBoard?.code || selectedBoard?.boardCode || "";
  const activeBoardName = selectedBoard?.name || selectedBoard?.boardName || activeBoardCode || "";
  const activeBoardId = selectedBoard?.id || selectedBoard?.boardId || undefined;

  const pincodeRequestRef = useRef(0);

  const labels = [
    "Personal Information",
    "Contact & Address",
    "Employment Details",
    "Documents",
    "Emergency Contact",
    "Preview",
  ];

  const [step, setStep] = useState(0);
  const [editingFromReview, setEditingFromReview] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [submitting, setSubmitting] = useState(false);
  const [pincodeError, setPincodeError] = useState("");
  const [errors, setErrors] = useState({});

  // Roles from API - NO FALLBACK allowed per prompt!
  const [roles, setRoles] = useState([]);
  const [roleObjects, setRoleObjects] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Designations for Transport
  const designationOptions = [
    "Driver",
    "Bus Attendant",
    "Transport Coordinator",
    "Transport Manager",
    "Cleaner",
  ];

  const [values, setValues] = useState({
    staffType: "Non-Teaching",
    role: "",
    roleName: "",
    roleId: undefined,
    employeeId: "",
    department: "Transport",
    designation: "Driver",
    campusId: activeCampusId ? Number(activeCampusId) || activeCampusId : undefined,
    campusName: activeCampusName,
    campusCode: activeCampusCode,
    board: activeBoardName,
    boardName: activeBoardName,
    boardCode: activeBoardCode,
    ...(activeBoardId ? { boardId: Number(activeBoardId) || activeBoardId } : {}),
    status: "Active",
    nationality: "Indian",
    country: "India",
    maritalStatus: "Single",
  });

  // Fetch roles strictly from API and filter ONLY Driver and Attendant roles - NO fallback!
  useEffect(() => {
    let isMounted = true;
    async function loadRoles() {
      setLoadingRoles(true);
      try {
        const res = await apiClient.get(apiEndpoints.roles?.list || "/api/v1/roles", {
          params: { staffType: "Non-Teaching" },
        });
        const data = res?.data?.data || res?.data?.items || (Array.isArray(res?.data) ? res.data : []);
        if (Array.isArray(data) && data.length > 0) {
          const filtered = data.filter((r) => {
            if (!r) return false;
            if (r.isActive === false || r.status === "Inactive") return false;
            const roleName = String(typeof r === "object" ? r.roleName || r.name || "" : r).trim();
            const lower = roleName.toLowerCase();
            return lower.includes("driver") || lower.includes("attendant");
          });

          if (isMounted) {
            setRoleObjects(filtered);
            const names = filtered.map((r) => (typeof r === "object" ? r.roleName || r.name : String(r))).filter(Boolean);
            setRoles(names);

            if (names.length > 0) {
              const defaultRole = names.find((n) => n.toLowerCase().includes("driver")) || names[0];
              const matched = filtered.find((r) => (r.roleName || r.name) === defaultRole);
              setValues((v) => ({
                ...v,
                role: v.role || defaultRole,
                roleName: v.roleName || defaultRole,
                roleId: v.roleId || (matched?.roleId || matched?.id),
              }));
            }
          }
        } else {
          if (isMounted) {
            setRoleObjects([]);
            setRoles([]);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch roles from API:", err);
        if (isMounted) {
          setRoleObjects([]);
          setRoles([]);
        }
      } finally {
        if (isMounted) setLoadingRoles(false);
      }
    }
    loadRoles();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync campus & board context
  useEffect(() => {
    setValues((v) => ({
      ...v,
      campusId: activeCampusId ? Number(activeCampusId) || activeCampusId : v.campusId,
      campusName: activeCampusId ? activeCampusName : v.campusName,
      campusCode: activeCampusId ? activeCampusCode : v.campusCode,
      board: v.board || activeBoardName,
      boardName: v.boardName || activeBoardName,
      boardCode: v.boardCode || activeBoardCode,
      boardId: v.boardId || (activeBoardId ? Number(activeBoardId) || activeBoardId : undefined),
      department: "Transport",
    }));
  }, [activeCampusId, activeCampusName, activeCampusCode, activeBoardName, activeBoardCode, activeBoardId]);

  // Fetch next Employee ID dynamically - synchronized with Admin sequence
  useEffect(() => {
    let isMounted = true;
    async function fetchNextId() {
      try {
        const nextId = await resolveNextStaffEmployeeId("Non-Teaching", existingDrivers || [], selectedCampus);
        if (isMounted && nextId) {
          setValues((v) => ({ ...v, employeeId: nextId }));
        }
      } catch (err) {
        console.warn("Failed to resolve next employee ID via Admin sequence resolver:", err);
      }
    }
    fetchNextId();
    return () => {
      isMounted = false;
    };
  }, [activeCampusId, selectedCampus, existingDrivers]);

  // Pincode auto-lookup
  useEffect(() => {
    const pincode = String(values.pin || "").replace(/\D/g, "").slice(0, 6);
    if (pincode !== String(values.pin || "")) {
      setValues((current) => ({ ...current, pin: pincode }));
      return undefined;
    }
    if (!/^\d{6}$/.test(pincode)) {
      pincodeRequestRef.current += 1;
      setPincodeError("");
      return undefined;
    }

    let ignore = false;
    const requestId = ++pincodeRequestRef.current;
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiClient.get(apiEndpoints.location.byPincode(pincode), { skipGlobalLoader: true });
        const data = response.data?.data ?? response.data?.Data ?? response.data ?? {};
        const location = {
          country: data.country || "India",
          state: data.state || "",
          district: data.district || "",
          city: data.city || data.postOffice || "",
        };
        if (ignore || requestId !== pincodeRequestRef.current) return;
        setValues((current) => ({ ...current, ...location }));
        setPincodeError("");
      } catch {
        if (!ignore && requestId === pincodeRequestRef.current) {
          setPincodeError("Location could not be loaded. Enter details manually.");
        }
      }
    }, 450);
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [values.pin]);

  // Dynamic step fields generator
  const getStepFields = (stepIndex) => {
    const isDriver =
      String(values?.role || "").trim().toLowerCase().includes("driver") ||
      String(values?.designation || "").trim().toLowerCase().includes("driver");

    if (stepIndex === 0) {
      return [
        ["employeeId", "Employee ID", "text", [], true],
        ["role", "Role", "search-select", roles, true],
        ["firstName", "First Name", "text", [], true],
        ["middleName", "Middle Name", "text", [], false],
        ["lastName", "Last Name", "text", [], true],
        ["guardianName", "Father's / Husband's Name", "text", [], true],
        ["gender", "Gender", "select", ["Male", "Female", "Other"], true],
        ["dateOfBirth", "Date of Birth", "date", [], true],
        ["maritalStatus", "Marital Status", "select", ["Single", "Married", "Divorced", "Widowed"], false],
        ["bloodGroup", "Blood Group", "select", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], false],
        ["nationality", "Nationality", "text", [], false],
        ["aadhaar", "Aadhaar Number", "text", [], true],
        ["pan", "PAN Number", "text", [], false],
        ["profilePhoto", "Profile Photo", "file", [], false],
      ];
    }

    if (stepIndex === 1) {
      return [
        ["mobile", "Mobile", "text", [], true],
        ["email", "Email", "email", [], false],
        ["pin", "PINCODE", "text", [], true],
        ["country", "Country", "text", [], true],
        ["state", "State", "text", [], true],
        ["district", "District", "text", [], true],
        ["city", "City", "text", [], true],
        ["currentAddress", "Current Address", "textarea", [], true],
        ["permanentAddress", "Permanent Address", "textarea", [], false],
      ];
    }

    if (stepIndex === 2) {
      const base = [
        ["department", "Department", "text", [], true],
        ["designation", "Designation", "search-select", designationOptions, true],
      ];
      if (isDriver) {
        base.push(
          ["drivingLicenseNumber", "Driver's License Number", "text", [], true],
          ["drivingLicenseExpiryDate", "License Expiry Date", "date", [], true]
        );
      }
      base.push(
        ["dateOfJoining", "Date of Joining", "date", [], true],
        ["qualification", "Qualification", "text", [], false],
        ["experience", "Experience", "text", [], false],
        ["status", "Status", "select", ["Active", "Inactive"], true, "start-new-row"]
      );
      return base;
    }

    if (stepIndex === 3) {
      return [
        ["aadhaarDocument", "Aadhaar (PDF)", "file", [], false],
        ["panDocument", "PAN (PDF)", "file", [], false],
        ["qualificationCertificate", "Qualification Certificate (PDF)", "file", [], false],
        ["experienceCertificate", "Experience Certificate (PDF)", "file", [], false],
        ["resume", "Resume (PDF)", "file", [], false],
        ["bankProof", "Bank Passbook / Cancelled Cheque (PDF)", "file", [], false],
        ["drivingLicence", "Driving Licence (PDF)", "file", [], isDriver],
        ["otherDocuments", "Other Documents (PDF)", "file", [], false],
      ];
    }

    if (stepIndex === 4) {
      return [
        ["emergencyName", "Contact Name", "text", [], false],
        ["emergencyRelationship", "Relationship", "text", [], false],
        ["emergencyMobile", "Mobile", "text", [], false],
        ["emergencyAlternate", "Alternate Mobile", "text", [], false],
        ["emergencyAddress", "Address", "textarea", [], false],
      ];
    }

    return [];
  };

  const next = () => {
    const currentFields = getStepFields(step);
    const stepErrors = validateStepFields(currentFields, values, activeBoardName);

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setToast({ message: "Please fill in all mandatory fields marked with an asterisk (*).", type: "error" });
      return;
    }

    setErrors({});
    if (editingFromReview) {
      setEditingFromReview(false);
      setStep(labels.length - 1);
      return;
    }
    setStep((s) => s + 1);
  };

  const save = async () => {
    // Validate all steps 0-4
    for (let i = 0; i < labels.length - 1; i++) {
      const stepFields = getStepFields(i);
      const stepErrors = validateStepFields(stepFields, values, activeBoardName);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        setToast({ message: `Please fill in all mandatory fields in ${labels[i]}.`, type: "error" });
        setStep(i);
        return;
      }
    }

    const isDriver =
      String(values?.role || "").trim().toLowerCase().includes("driver") ||
      String(values?.designation || "").trim().toLowerCase().includes("driver");

    // Duplicate Driving License check against existing driver records
    if (isDriver && values.drivingLicenseNumber) {
      const enteredDL = String(values.drivingLicenseNumber).toUpperCase().replace(/[^A-Z0-9]/g, "");
      const duplicate = (Array.isArray(existingDrivers) ? existingDrivers : []).find((r) => {
        const rDL = String(r?.licenseNumber || r?.drivingLicenseNumber || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        return rDL.length > 0 && rDL === enteredDL;
      });
      if (duplicate) {
        const dupName = duplicate.driverName || duplicate.fullName || duplicate.employeeId || "another driver";
        setErrors({ drivingLicenseNumber: `This Driving License Number is already registered under ${dupName}.` });
        setToast({ message: `Driving License '${values.drivingLicenseNumber}' is already registered under ${dupName}.`, type: "error" });
        setStep(2);
        return;
      }
    }

    const fullName = [values.firstName, values.middleName, values.lastName].filter(Boolean).join(" ") || values.employeeId;
    const matchedRole = roleObjects.find((r) => (r.roleName || r.name) === values.role);
    const resolvedRoleId = values.roleId || (matchedRole ? (matchedRole.roleId || matchedRole.id) : (isDriver ? 12 : 14));

    const payload = {
      ...values,
      campusId: values.campusId || (activeCampusId ? Number(activeCampusId) || activeCampusId : undefined),
      campusName: values.campusName || activeCampusName,
      campusCode: values.campusCode || activeCampusCode,
      board: values.board || activeBoardName,
      boardName: values.boardName || activeBoardName,
      boardCode: values.boardCode || activeBoardCode,
      boardId: values.boardId || (activeBoardId ? Number(activeBoardId) || activeBoardId : undefined),
      email: values.email?.trim() ? values.email.trim() : null,
      qualification: values.qualification?.trim() ? values.qualification.trim() : null,
      department: "Transport",
      role: values.role || (isDriver ? "Driver" : "Attendant"),
      roleName: values.role || (isDriver ? "Driver" : "Attendant"),
      roleId: Number(resolvedRoleId),
      designation: values.designation || (isDriver ? "Driver" : "Bus Attendant"),
      fullName,
      staffType: "Non-Teaching",
      profileStatus: "Completed",
      profileCompletionPercentage: 100,
    };

    setSubmitting(true);
    let targetStaffId = null;

    try {
      // 1. POST /api/v1/staff
      const res = await apiClient.post(apiEndpoints.faculty.create, payload);
      targetStaffId = res.data?.id || res.data?.staffId || res.data?.data?.id || res.data?.data?.staffId;

      // 2. Upload photo if provided
      const photoFile = values.profilePhoto_file;
      if (photoFile && targetStaffId) {
        try {
          const photoData = new FormData();
          photoData.append("Photo", photoFile);
          photoData.append("file", photoFile);
          photoData.append("StaffId", String(targetStaffId));
          photoData.append("staffId", String(targetStaffId));
          await apiClient.post(apiEndpoints.faculty.uploadPhoto, photoData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (photoErr) {
          console.warn("Staff photo upload warning:", photoErr);
        }
      }

      // 3. Register in transport driver master if driver role
      if (isDriver) {
        try {
          await apiClient.post(apiEndpoints.transport.drivers, {
            staffId: targetStaffId ? Number(targetStaffId) : null,
            driverName: fullName,
            employeeId: values.employeeId,
            mobileNumber: values.mobile,
            email: values.email || "",
            licenceNumber: values.drivingLicenseNumber,
            licenceExpiry: values.drivingLicenseExpiryDate || null,
            address: values.currentAddress || "",
            status: values.status === "Active",
          });
        } catch (tpErr) {
          console.warn("Transport driver sync notice:", tpErr);
        }
      } else {
        // Register in attendant master
        try {
          await apiClient.post(apiEndpoints.transport.attendants, {
            staffId: targetStaffId ? Number(targetStaffId) : null,
            attendantName: fullName,
            employeeId: values.employeeId,
            mobileNumber: values.mobile,
            gender: values.gender,
            status: values.status === "Active",
          });
        } catch (tpAttErr) {
          console.warn("Transport attendant sync notice:", tpAttErr);
        }
      }

      try {
        incrementSeriesSequence("NON_TEACHING_STAFF");
        incrementSeriesSequence("NON_TEACHING_STAFF_ID");
        incrementSeriesSequence("non-teaching-staff");
        incrementSeriesSequence("employee-id");
      } catch {}

      // Clear all previously entered details except the newly resolved employee ID sequence
      let nextId = "";
      try {
        nextId = await resolveNextStaffEmployeeId("Non-Teaching", existingDrivers || [], selectedCampus);
      } catch {}

      const currentNum = parseInt(String(values.employeeId || "").replace(/\D/g, ""), 10);
      const nextNum = parseInt(String(nextId || "").replace(/\D/g, ""), 10);
      if (!isNaN(currentNum) && (!nextNum || nextNum <= currentNum)) {
        const prefix = String(values.employeeId).replace(/\d+$/, "") || "MNT";
        const digitsLen = (String(values.employeeId).match(/\d+$/)?.[0]?.length) || 4;
        nextId = `${prefix}${String(currentNum + 1).padStart(digitsLen, "0")}`;
      }

      setValues({
        staffType: "Non-Teaching",
        role: roles.find((n) => n.toLowerCase().includes("driver")) || roles[0] || "Driver",
        roleName: roles.find((n) => n.toLowerCase().includes("driver")) || roles[0] || "Driver",
        roleId: roleObjects.find((r) => (r.roleName || r.name)?.toLowerCase().includes("driver"))?.id || undefined,
        employeeId: nextId || values.employeeId || "",
        department: "Transport",
        designation: "Driver",
        campusId: activeCampusId ? Number(activeCampusId) || activeCampusId : undefined,
        campusName: activeCampusName,
        campusCode: activeCampusCode,
        board: activeBoardName,
        boardName: activeBoardName,
        boardCode: activeBoardCode,
        ...(activeBoardId ? { boardId: Number(activeBoardId) || activeBoardId } : {}),
        status: "Active",
        nationality: "Indian",
        country: "India",
        maritalStatus: "Single",
        firstName: "",
        middleName: "",
        lastName: "",
        guardianName: "",
        gender: "",
        dateOfBirth: "",
        bloodGroup: "",
        aadhaar: "",
        pan: "",
        profilePhoto: "",
        profilePhoto_file: null,
        profilePhoto_previewUrl: "",
        mobile: "",
        alternateMobile: "",
        email: "",
        currentAddress: "",
        permanentAddress: "",
        pin: "",
        city: "",
        district: "",
        state: "",
        dateOfJoining: "",
        employmentType: "Full Time",
        drivingLicenseNumber: "",
        drivingLicenseExpiryDate: "",
        licenseNumber: "",
        licenseExpiryDate: "",
        drivingExperienceYears: "",
        drivingLicence: "",
        drivingLicence_file: null,
        drivingLicence_previewUrl: "",
        aadhaarDocument: "",
        aadhaarDocument_file: null,
        aadhaarDocument_previewUrl: "",
        panDocument: "",
        panDocument_file: null,
        panDocument_previewUrl: "",
        emergencyName: "",
        emergencyRelationship: "",
        emergencyMobile: "",
        emergencyAlternate: "",
        emergencyAddress: "",
      });
      setStep(0);
      setErrors({});
      setEditingFromReview(false);

      if (typeof onSuccess === "function") {
        await onSuccess();
      }
    } catch (err) {
      console.error("Save staff record error:", err);
      const errMsg = getApiErrorMessage(err, "Failed to save driver profile.");
      setToast({ message: errMsg, type: "error" });

      const status = err?.response?.status;
      if (status === 409 || status === 400) {
        const lower = errMsg.toLowerCase();
        const nextErrors = {};
        let errStep = 0;
        if (lower.includes("employee id")) {
          nextErrors.employeeId = errMsg;
          try {
            const nextId = await resolveNextStaffEmployeeId("Non-Teaching", existingDrivers || [], selectedCampus);
            if (nextId) setValues((v) => ({ ...v, employeeId: nextId }));
          } catch {}
          errStep = 0;
        }
        if (lower.includes("aadhaar") || lower.includes("pan") || lower.includes("name")) {
          if (lower.includes("aadhaar")) nextErrors.aadhaar = errMsg;
          errStep = 0;
        }
        if (lower.includes("email")) {
          nextErrors.email = errMsg;
          errStep = 1;
        }
        if (lower.includes("mobile")) {
          nextErrors.mobile = errMsg;
          errStep = 1;
        }
        if (lower.includes("license") || lower.includes("licence")) {
          nextErrors.drivingLicenseNumber = errMsg;
          errStep = 2;
        }
        setErrors(nextErrors);
        setStep(errStep);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cms-transport-stack staff-mock-page add-driver-screen-container" style={{ width: "100%" }}>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      {/* Top Navigation and Header matching Reference */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <button
          type="button"
          className="staff-mock-back"
          onClick={onCancel}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", background: "none", border: "none", color: "var(--cms-primary, #355e3b)", fontWeight: 700, fontSize: 13 }}
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0 10px" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--cms-primary-soft, #edf7e2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cms-primary, #355e3b)" }}>
          <Building2 size={20} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 700, color: "var(--cms-text, #232a1e)" }}>
            Add Driver or Attendant
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.875rem", color: "var(--cms-muted, #727c65)" }}>
            Admin completes the entire profile.
          </p>
        </div>
      </div>

      {/* 6-Step Stepper */}
      <div className="staff-stepper">
        {labels.map((x, i) => (
          <span
            className={i <= step ? "is-active" : ""}
            key={x}
            onClick={() => {
              if (i < step) {
                setStep(i);
              }
            }}
            style={{ cursor: i < step ? "pointer" : "default" }}
          >
            <b>{i < step ? <Check size={12} /> : i + 1}</b>
            <small>{x}</small>
          </span>
        ))}
      </div>

      {/* Main Form Panel */}
      <section className="staff-form-panel non-teaching-form">
        <header>
          <UserRound />
          <div>
            <h2>{labels[step]}</h2>
            <p>Step {step + 1} of {labels.length}</p>
          </div>
        </header>

        {step < labels.length - 1 ? (
          <div className="staff-form-grid">
            {getStepFields(step).map((f) => (
              <FormField
                key={f[0]}
                item={f}
                values={values}
                setValues={setValues}
                setErrors={setErrors}
                error={errors[f[0]] || (f[0] === "pin" ? pincodeError : "")}
                roleOptions={roleObjects.length > 0 ? roleObjects : roles}
                designationOptions={designationOptions}
              />
            ))}
          </div>
        ) : (
          <Summary
            record={{
              ...values,
              fullName: [values.firstName, values.middleName, values.lastName].filter(Boolean).join(" "),
            }}
            groups={labels.slice(0, labels.length - 1).map((label, index) => [label, getStepFields(index)])}
            onEdit={(groupIndex) => {
              setEditingFromReview(true);
              setStep(groupIndex);
            }}
          />
        )}

        <footer>
          {step > 0 ? (
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={submitting}
              style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
          ) : (
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={step === labels.length - 1 ? save : next}
            disabled={submitting}
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            {submitting ? (
              "Saving Driver..."
            ) : step === labels.length - 1 ? (
              "Save Driver or Attendant"
            ) : editingFromReview ? (
              "Save & Return to Preview"
            ) : (
              <>Next <ChevronRight size={14} /></>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}


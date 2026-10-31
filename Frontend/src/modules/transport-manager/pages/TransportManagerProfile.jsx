import { useTransportNavigation, useTransportRouteValue } from "../TransportManagerContext.jsx";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Check,
  Edit3,
  Download,
  Camera,
  Loader2,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  User,
  Folder,
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Plus,
} from "lucide-react";
import { useTransportManager, DEFAULT_TRANSPORT_MANAGER_PROFILE } from "../TransportManagerContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import * as staffApi from "@/api/staffApi.js";
import apiClient from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { env } from "@/config/env.js";
import "../styles/TransportManagerProfile.css";

const resolvePhotoUrl = (value) => {
  const path = String(value ?? "").trim();
  if (!path) return "";
  if (/^(?:https?:|blob:|data:)/i.test(path)) return path;
  const baseUrl = (env?.apiBaseUrl || "").replace(/\/+$/, "");
  return baseUrl ? `${baseUrl}/${path.replace(/^\/+/, "")}` : path;
};

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

export default function TransportManagerProfile() {
  const navigation = useTransportNavigation();
  const { profile = {}, updateProfile = () => { }, showToast = () => { }, authorizedBoards = [], selectedBoardId } = useTransportManager();
  const { boards = [], selectedAcademicYear } = useAcademicContext?.() || {};
  const { selectedCampus } = useCampusContext?.() || {};

  // Resolve Board name dynamically
  const boardName = useMemo(() => {
    if (authorizedBoards.length > 0 && selectedBoardId) {
      const match = authorizedBoards.find((b) => String(b.id || b.boardId) === String(selectedBoardId));
      if (match) return match.code || match.name || match.boardName || "BIEAP";
    }
    const match = boards.find((b) => String(b.id || b.boardId) === String(selectedBoardId));
    return match?.code || match?.name || "BIEAP";
  }, [authorizedBoards, boards, selectedBoardId]);

  const effectiveStaffId = profile.staffId || profile.id || 1125;

  // Dynamic user name decomposition
  const initialName = profile?.name || DEFAULT_TRANSPORT_MANAGER_PROFILE.fullName;
  const nameParts = initialName.trim().split(/\s+/);
  const initialFirstName = profile?.firstName || nameParts[0] || DEFAULT_TRANSPORT_MANAGER_PROFILE.firstName;
  const initialMiddleName = profile?.middleName || (nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "—");
  const initialLastName = profile?.lastName || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : DEFAULT_TRANSPORT_MANAGER_PROFILE.lastName);

  // State management with LocalStorage persistence for mock data
  const STORAGE_KEY = "tm_profile_data";

  const [profileData, setProfileData] = useState(() => {
    let savedParsed = {};
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        savedParsed = JSON.parse(saved) || {};
        // Remove any local storage photo so the photo is strictly managed by the backend
        delete savedParsed.photoUrl;
        delete savedParsed.photoPath;
        delete savedParsed.profilePhoto;
      }
    } catch (e) {
      console.warn("Failed to read tm_profile_data from localStorage:", e);
    }

    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("staff_profile_photo");
        localStorage.removeItem(`staff_profile_${effectiveStaffId}_photo`);
      }
    } catch { }

    if (Object.keys(savedParsed).length > 0) {
      return {
        ...DEFAULT_TRANSPORT_MANAGER_PROFILE,
        ...profile,
        ...savedParsed,
        employeeId: savedParsed.employeeId || profile.employeeId || DEFAULT_TRANSPORT_MANAGER_PROFILE.employeeId,
        email: savedParsed.email || profile.email || DEFAULT_TRANSPORT_MANAGER_PROFILE.email,
        department: savedParsed.department || profile.department || DEFAULT_TRANSPORT_MANAGER_PROFILE.department,
        designation: savedParsed.designation || profile.role || DEFAULT_TRANSPORT_MANAGER_PROFILE.designation,
        photoUrl: "",
        photoPath: "",
        profilePhoto: "",
      };
    }

    return {
      ...DEFAULT_TRANSPORT_MANAGER_PROFILE,
      ...profile,
      id: profile.id || DEFAULT_TRANSPORT_MANAGER_PROFILE.id,
      staffId: profile.staffId || DEFAULT_TRANSPORT_MANAGER_PROFILE.staffId,
      employeeId: profile.employeeId || DEFAULT_TRANSPORT_MANAGER_PROFILE.employeeId,
      firstName: initialFirstName,
      middleName: initialMiddleName,
      lastName: initialLastName,
      fullName: initialName,
      dob: profile.dob || DEFAULT_TRANSPORT_MANAGER_PROFILE.dob,
      gender: profile.gender || DEFAULT_TRANSPORT_MANAGER_PROFILE.gender,
      maritalStatus: profile.maritalStatus || DEFAULT_TRANSPORT_MANAGER_PROFILE.maritalStatus,
      mobile: profile.mobile || profile.phone || DEFAULT_TRANSPORT_MANAGER_PROFILE.mobile,
      email: profile.email || DEFAULT_TRANSPORT_MANAGER_PROFILE.email,
      department: profile.department || DEFAULT_TRANSPORT_MANAGER_PROFILE.department,
      designation: profile.role || DEFAULT_TRANSPORT_MANAGER_PROFILE.designation,
      bloodGroup: profile.bloodGroup || DEFAULT_TRANSPORT_MANAGER_PROFILE.bloodGroup,
      dateOfJoining: profile.dateOfJoining || DEFAULT_TRANSPORT_MANAGER_PROFILE.dateOfJoining,
      aadhaar: profile.aadhaar || DEFAULT_TRANSPORT_MANAGER_PROFILE.aadhaar,
      pan: profile.pan || DEFAULT_TRANSPORT_MANAGER_PROFILE.pan,
      staffType: "Non-Teaching",
      board: boardName,
      photoUrl: "",

      // Bank Details
      bankName: "State Bank of India",
      accountHolder: initialName,
      accountNumber: "38920194823482",
      ifsc: "SBIN0001234",
      branch: "Guntur Main Branch",
      accountType: "Salary Account",
      uanNumber: "100982349812",
      pfNumber: "100982349812",

      // Address Info
      houseNumber: "12-4-88/2",
      street: "Transport Colony, Beside Bus Depot",
      city: profile.city || DEFAULT_TRANSPORT_MANAGER_PROFILE.city,
      pin: profile.pin || profile.pincode || DEFAULT_TRANSPORT_MANAGER_PROFILE.pin,
      district: profile.district || DEFAULT_TRANSPORT_MANAGER_PROFILE.district,
      state: profile.state || DEFAULT_TRANSPORT_MANAGER_PROFILE.state,
      country: profile.country || DEFAULT_TRANSPORT_MANAGER_PROFILE.country,

      // Experience Records
      experience: [
        {
          id: 1,
          institution: "APSRTC Regional Transport Division",
          designation: "Assistant Fleet & Route Coordinator",
          fromDate: "2019-06-01",
          toDate: "2022-05-31",
          subjectsTeached: "Fleet Dispatch & Route Logistics",
          totalExp: "3 Years",
          status: "Verified",
        },
        {
          id: 2,
          institution: "Narayana Educational Institutions",
          designation: "Transport Operations Supervisor",
          fromDate: "2017-05-01",
          toDate: "2019-05-31",
          subjectsTeached: "Student Transit & Fleet Safety",
          totalExp: "2 Years",
          status: "Verified",
        },
      ],

      // Uploaded Documents
      documents: DEFAULT_TRANSPORT_MANAGER_PROFILE.documents || [
        {
          id: 1,
          name: "Aadhaar Card",
          type: "Identity Proof",
          format: "PDF",
          size: "1.4 MB",
          date: "2024-01-15",
          status: "Verified",
          url: "",
        },
        {
          id: 2,
          name: "PAN Card",
          type: "Tax Identity",
          format: "PDF",
          size: "820 KB",
          date: "2024-01-15",
          status: "Verified",
          url: "",
        },
      ],
    };
  });

  // Query live staff profile from API by ID
  useEffect(() => {
    let active = true;
    const fetchLiveProfile = async () => {
      try {
        let res;
        try {
          res = await staffApi.getStaffById(effectiveStaffId);
        } catch {
          res = await apiClient.get("/api/v1/staff/me");
        }
        const data = res?.data?.data || res?.data;
        if (active && data && typeof data === "object") {
          const fullName = data.fullName || (data.firstName ? `${data.firstName} ${data.lastName || ""}`.trim() : "muzan kibutsuzi");
          const nParts = fullName.split(/\s+/);
          const rawServerPhoto = data.photoUrl || data.photoPath || data.profilePhoto || "";
          const resolvedPhoto = rawServerPhoto ? resolvePhotoUrl(rawServerPhoto) : "";

          setProfileData((prev) => {
            const merged = {
              ...prev,
              ...data,
              id: data.id || data.staffId || prev.id,
              staffId: data.staffId || data.id || prev.staffId,
              employeeId: data.employeeId || prev.employeeId,
              firstName: data.firstName || nParts[0] || prev.firstName,
              middleName: data.middleName || (nParts.length > 2 ? nParts.slice(1, -1).join(" ") : prev.middleName),
              lastName: data.lastName || (nParts.length > 1 ? nParts[nParts.length - 1] : prev.lastName),
              fullName,
              email: data.email || prev.email,
              mobile: data.mobile || prev.mobile,
              dob: data.dateOfBirth ? data.dateOfBirth.split("T")[0] : (data.dob || prev.dob),
              gender: data.gender || prev.gender,
              maritalStatus: data.maritalStatus || prev.maritalStatus,
              aadhaar: data.aadhaar || prev.aadhaar,
              department: data.department || prev.department,
              designation: data.designation || prev.designation,
              city: data.city || prev.city,
              district: data.district || prev.district,
              state: data.state || prev.state,
              pin: data.pin || data.pincode || prev.pin,
              country: data.country || prev.country,
              dateOfJoining: data.dateOfJoining ? data.dateOfJoining.split("T")[0] : prev.dateOfJoining,
              isDriver: Boolean(data.isDriver ?? prev.isDriver),
              drivingLicenseNumber: data.drivingLicenseNumber || prev.drivingLicenseNumber,
              drivingLicenseExpiryDate: data.drivingLicenseExpiryDate || prev.drivingLicenseExpiryDate,
              photoUrl: resolvedPhoto || prev.photoUrl,
              photoPath: data.photoPath || rawServerPhoto || prev.photoPath,
              profilePhoto: data.profilePhoto || rawServerPhoto || prev.profilePhoto,
            };
            try {
              const toPersist = { ...merged };
              delete toPersist.photoUrl;
              delete toPersist.photoPath;
              delete toPersist.profilePhoto;
              localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
            } catch { }
            return merged;
          });

          // If no photo path was returned in staff object, query backend GET /api/v1/staff/photo/{id}
          if (!resolvedPhoto && effectiveStaffId) {
            apiClient.get(apiEndpoints.faculty.getPhoto(effectiveStaffId), {
              responseType: "blob",
              skipGlobalLoader: true,
              skipErrorLog: true,
            }).then((photoRes) => {
              if (!active) return;
              if (photoRes?.data instanceof Blob && photoRes.data.size > 0 && (photoRes.data.type || "").startsWith("image/")) {
                const blobUrl = URL.createObjectURL(photoRes.data);
                setProfileData((prev) => ({
                  ...prev,
                  photoUrl: blobUrl,
                }));
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("cms-staff-photo-updated", {
                      detail: { photoUrl: blobUrl, staffId: effectiveStaffId },
                    })
                  );
                }
              }
            }).catch(() => null);
          }
        }
      } catch (err) {
        console.warn("Could not fetch live staff profile in TransportManagerProfile:", err);
      }
    };
    fetchLiveProfile();
    return () => {
      active = false;
    };
  }, [effectiveStaffId]);

  // Keep full name updated whenever first/middle/last name changes
  useEffect(() => {
    const computedFull = [profileData.firstName, profileData.middleName !== "—" ? profileData.middleName : "", profileData.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (computedFull && computedFull !== profileData.fullName) {
      setProfileData((prev) => ({ ...prev, fullName: computedFull }));
    }
  }, [profileData.firstName, profileData.middleName, profileData.lastName, profileData.fullName]);

  // Helper to format documents as C# Dictionary<string, string>
  const formatDocumentsDictionary = (docs) => {
    if (!docs) return {};
    if (Array.isArray(docs)) {
      const map = {};
      docs.forEach((doc, idx) => {
        const key = String(doc?.type || doc?.name || `Document_${idx + 1}`).trim();
        const val = String(doc?.url || doc?.name || doc?.fileName || "").trim();
        if (key) map[key] = val;
      });
      return map;
    }
    if (typeof docs === "object") {
      const map = {};
      Object.entries(docs).forEach(([k, v]) => {
        map[String(k)] = typeof v === "string" ? v : String(v?.url || v?.name || "");
      });
      return map;
    }
    return {};
  };

  // Sync to local storage and backend API
  const persistProfile = (updated) => {
    try {
      const toStore = { ...updated };
      // Remove any photo fields so image is strictly persisted on the backend, not in localStorage
      delete toStore.photoUrl;
      delete toStore.photoPath;
      delete toStore.profilePhoto;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (e) {
      console.warn("Could not persist tm_profile_data:", e);
    }
    if (typeof updateProfile === "function") {
      updateProfile(updated);
    }
    try {
      if (updated?.mobile) {
        apiClient.put("/api/v1/staff/me/contact", { mobile: updated.mobile }).catch(() => null);
        apiClient.put(apiEndpoints.faculty.updateProfileSettings, {
          fullName: updated.fullName,
          mobile: updated.mobile,
          personalEmail: updated.email,
        }).catch(() => null);
      }
    } catch { }
  };

  const [isEditingProfile, setIsEditingProfile] = useTransportRouteValue(navigation, "edit", false);
  const [profileStep, setProfileStep] = useTransportRouteValue(navigation, "step", 1, value => Number.isInteger(value) && value >= 1 && value <= 6);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isFetchingPin, setIsFetchingPin] = useState(false);

  // Profile Photo Action Modal, Camera & Cropper state (matching Screenshot 3)
  const [isPhotoActionModalOpen, setIsPhotoActionModalOpen] = useTransportRouteValue(navigation, "photoMenu", false);
  const [isViewPhotoOpen, setIsViewPhotoOpen] = useTransportRouteValue(navigation, "viewPhoto", false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useTransportRouteValue(navigation, "camera", false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // Experience and Documents Form States
  const [newExp, setNewExp] = useState({
    institution: "",
    designation: "",
    fromDate: "",
    toDate: "",
    subjectsTeached: "",
    totalExp: "",
  });

  const [newDoc, setNewDoc] = useState({
    name: "",
    type: "Identity Proof",
    file: null,
  });

  const safeExperience = useMemo(
    () => (Array.isArray(profileData?.experience) ? profileData.experience : []),
    [profileData?.experience]
  );
  const safeDocuments = useMemo(
    () => (Array.isArray(profileData?.documents) ? profileData.documents : []),
    [profileData?.documents]
  );

  const [rawImageToCrop, setRawImageToCrop] = useState(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 });
  const [cropRotation, setCropRotation] = useState(0);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStartCrop, setDragStartCrop] = useState({ x: 0, y: 0 });

  const [cameraError, setCameraError] = useState("");
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  const avatarRef = useRef(null);
  const docFileRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cropCanvasRef = useRef(null);

  // Live Camera stream manager
  useEffect(() => {
    if (!isCameraModalOpen) return;
    let active = true;
    setCameraError("");
    setIsCameraLoading(true);

    navigator.mediaDevices
      ?.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: "user" },
        audio: false,
      })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Camera access error:", err);
        setIsCameraLoading(false);
        setCameraError(
          err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
            ? "Camera permission denied. Please allow camera access in browser."
            : "No camera found or could not start video stream."
        );
      });

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isCameraModalOpen]);

  const handleCaptureFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 640;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);

    const capturedData = canvas.toDataURL("image/jpeg", 0.95);
    setIsCameraModalOpen(false);

    setRawImageToCrop(capturedData);
    setCropZoom(1);
    setCropPan({ x: 0, y: 0 });
    setCropRotation(0);
    setIsCropModalOpen(true);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file (PNG, JPG, JPEG, WEBP).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (base64) {
        setRawImageToCrop(base64);
        setCropZoom(1);
        setCropPan({ x: 0, y: 0 });
        setCropRotation(0);
        setIsCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemovePhoto = () => {
    setProfileData((prev) => {
      const updated = { ...prev, photoUrl: "", photoPath: "", profilePhoto: "" };
      persistProfile(updated);
      return updated;
    });
    if (avatarRef.current) {
      avatarRef.current.value = "";
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cms-staff-photo-updated", {
          detail: { photoUrl: "", staffId: effectiveStaffId },
        })
      );
    }
    showToast("Profile photo removed.");
  };

  // Canvas interactive rendering for cropper
  useEffect(() => {
    if (!isCropModalOpen || !rawImageToCrop || !cropCanvasRef.current) return;
    const canvas = cropCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      ctx.translate(canvas.width / 2 + cropPan.x, canvas.height / 2 + cropPan.y);
      ctx.rotate((cropRotation * Math.PI) / 180);
      ctx.scale(cropZoom, cropZoom);

      const baseScale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * baseScale;
      const h = img.height * baseScale;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();

      // Guide overlay
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      const cropSize = 220;
      const left = (canvas.width - cropSize) / 2;
      const top = (canvas.height - cropSize) / 2;
      const r = 20;

      ctx.moveTo(left + r, top);
      ctx.lineTo(left + cropSize - r, top);
      ctx.quadraticCurveTo(left + cropSize, top, left + cropSize, top + r);
      ctx.lineTo(left + cropSize, top + cropSize - r);
      ctx.quadraticCurveTo(left + cropSize, top + cropSize, left + cropSize - r, top + cropSize);
      ctx.lineTo(left + r, top + cropSize);
      ctx.quadraticCurveTo(left, top + cropSize, left, top + cropSize - r);
      ctx.lineTo(left, top + r);
      ctx.quadraticCurveTo(left, top, left + r, top);
      ctx.closePath();
      ctx.clip("evenodd");
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Guide border
      ctx.save();
      ctx.strokeStyle = "var(--cms-primary)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(left + r, top);
      ctx.lineTo(left + cropSize - r, top);
      ctx.quadraticCurveTo(left + cropSize, top, left + cropSize, top + r);
      ctx.lineTo(left + cropSize, top + cropSize - r);
      ctx.quadraticCurveTo(left + cropSize, top + cropSize, left + cropSize - r, top + cropSize);
      ctx.lineTo(left + r, top + cropSize);
      ctx.quadraticCurveTo(left, top + cropSize, left, top + cropSize - r);
      ctx.lineTo(left + r, top);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    };
    img.src = rawImageToCrop;
  }, [isCropModalOpen, rawImageToCrop, cropZoom, cropPan, cropRotation]);

  const handleApplyCrop = () => {
    if (!rawImageToCrop) return;
    const outCanvas = document.createElement("canvas");
    outCanvas.width = 400;
    outCanvas.height = 400;
    const ctx = outCanvas.getContext("2d");

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 400, 400);

      ctx.save();
      const ratio = 400 / 220;
      ctx.translate(200 + cropPan.x * ratio, 200 + cropPan.y * ratio);
      ctx.rotate((cropRotation * Math.PI) / 180);
      ctx.scale(cropZoom, cropZoom);

      const baseScale = Math.max(260 / img.width, 260 / img.height);
      const w = img.width * baseScale * ratio;
      const h = img.height * baseScale * ratio;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();

      const croppedDataUrl = outCanvas.toDataURL("image/jpeg", 0.92);

      setProfileData((prev) => {
        const updated = { ...prev, photoUrl: croppedDataUrl };
        persistProfile(updated);
        try {
          const curUser = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "null");
          if (curUser) {
            const merged = { ...curUser, photoUrl: croppedDataUrl, photoPath: croppedDataUrl, photo: croppedDataUrl };
            if (localStorage.getItem("user")) localStorage.setItem("user", JSON.stringify(merged));
            if (sessionStorage.getItem("user")) sessionStorage.setItem("user", JSON.stringify(merged));
            window.dispatchEvent(new Event("storage"));
          }
        } catch { }
        return updated;
      });

      outCanvas.toBlob(async (blob) => {
        if (blob) {
          // Provide instant in-memory preview without touching localStorage
          const tempObjectUrl = URL.createObjectURL(blob);
          setProfileData((prev) => ({ ...prev, photoUrl: tempObjectUrl }));

          // Exactly matching AccountantProfile contract: single StaffId and single Photo form fields
          const formData = new FormData();
          formData.append("Photo", blob, `staff_${effectiveStaffId || "profile"}.jpg`);
          formData.append("file", blob, `staff_${effectiveStaffId || "profile"}.jpg`);
          formData.append("StaffId", String(effectiveStaffId));
          formData.append("staffId", String(effectiveStaffId));
          try {
            const uploadRes = await apiClient.post(apiEndpoints.faculty.uploadPhoto, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            const serverPhoto = uploadRes?.data?.photoPath || uploadRes?.data?.PhotoPath || uploadRes?.data?.photoUrl || uploadRes?.data?.profilePhoto;
            if (serverPhoto) {
              const curUser = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "null");
              if (curUser) {
                const merged = { ...curUser, photoUrl: serverPhoto, photoPath: serverPhoto, photo: serverPhoto };
                if (localStorage.getItem("user")) localStorage.setItem("user", JSON.stringify(merged));
                if (sessionStorage.getItem("user")) sessionStorage.setItem("user", JSON.stringify(merged));
                window.dispatchEvent(new Event("storage"));
              }
            }
          } catch (e) {
            console.warn("Could not upload profile photo to server:", e);
            showToast("Failed to upload profile photo to backend.", "error");
          }
        }
      }, "image/jpeg", 0.92);

      setIsCropModalOpen(false);
      setRawImageToCrop(null);
    };
    img.src = rawImageToCrop;
  };

  // Helper check for percentage calculation
  const hasVal = (val) => {
    if (val === null || val === undefined) return false;
    if (typeof val === "string") return val.trim().length > 0 && val !== "—";
    if (typeof val === "number") return true;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "object") return Object.keys(val).length > 0;
    return Boolean(val);
  };

  // Profile completion % calculation matching the visual indicator
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

      hasVal(profileData.houseNumber),
      hasVal(profileData.street),
      hasVal(profileData.city),
      hasVal(profileData.pin),
      hasVal(profileData.district),
      hasVal(profileData.state),

      hasVal(profileData.experience),
      hasVal(profileData.documents),
    ];

    const filledCount = checklist.filter(Boolean).length;
    return Math.min(100, Math.round((filledCount / checklist.length) * 100));
  }, [profileData]);

  // Handle PIN Lookup for Address
  const handlePinChange = (pinValue) => {
    const clean = pinValue.replace(/\D/g, "").slice(0, 6);
    setProfileData((prev) => ({ ...prev, pin: clean }));

    if (clean.length >= 3) {
      const prefix = clean.slice(0, 3);
      if (PIN_LOOKUP[prefix]) {
        const { district, state, country } = PIN_LOOKUP[prefix];
        setProfileData((prev) => ({
          ...prev,
          pin: clean,
          district: prev.district || district,
          state: prev.state || state,
          country: prev.country || country,
        }));
      }
    }
  };

  // Download Profile PDF
  const handleDownloadProfile = async () => {
    try {
      setIsDownloadingPdf(true);
      showToast("Generating official profile PDF...", "info");

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
      doc.text("PIRNAV JUNIOR COLLEGES - TRANSPORT OPERATIONS", 48, 39);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(235, 240, 210);
      doc.text("OFFICIAL TRANSPORT MANAGER SERVICE RECORD & PROFILE", 48, 52);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`ACADEMIC YEAR: ${selectedAcademicYear?.name || "2026-2027"}`, 547, 39, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(235, 240, 210);
      doc.text(`BOARD: ${boardName}  |  CAMPUS: ${selectedCampus?.name || "Main Campus (HQ)"}`, 547, 52, { align: "right" });

      // 2. Identity Card
      doc.setFillColor(248, 250, 242);
      doc.setDrawColor(218, 224, 195);
      doc.setLineWidth(0.75);
      doc.roundedRect(36, 74, 523, 62, 4, 4, "FD");

      let photoRendered = false;
      if (profileData.photoUrl && typeof profileData.photoUrl === "string" && profileData.photoUrl.startsWith("data:image/")) {
        try {
          doc.addImage(profileData.photoUrl, "JPEG", 46, 81, 48, 48);
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
        const initText = (profileData.fullName || "TM")
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
        doc.text(initText, 70, 110, { align: "center" });
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text(profileData.fullName || "Transport Manager", 106, 96);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(80, 95, 110);
      doc.text(`${profileData.designation}  ·  ${profileData.department}`, 106, 110);
      doc.text(`EMP ID: ${profileData.employeeId}  |  Joined: ${profileData.dateOfJoining}  |  Mobile: ${profileData.mobile}`, 106, 123);

      // 3. Personal Information Table
      autoTable(doc, {
        startY: 148,
        margin: { left: 36, right: 36 },
        head: [["FIELD", "VALUE", "FIELD", "VALUE"]],
        body: [
          ["First Name", profileData.firstName || "—", "Last Name", profileData.lastName || "—"],
          ["Date of Birth", profileData.dob || "—", "Gender", profileData.gender || "—"],
          ["Marital Status", profileData.maritalStatus || "—", "Blood Group", profileData.bloodGroup || "—"],
          ["Primary Mobile", profileData.mobile || "—", "Email Address", profileData.email || "—"],
          ["Aadhaar Number", profileData.aadhaar ? `XXXX XXXX ${profileData.aadhaar.slice(-4)}` : "—", "PAN Number", profileData.pan || "—"],
          ["Department", profileData.department, "Designation", profileData.designation],
        ],
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 5 },
        headStyles: { fillColor: [111, 132, 0], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 242] },
      });

      // 4. Bank Information Table
      const bankY = doc.lastAutoTable.finalY + 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("BANK & STATUTORY DETAILS", 36, bankY);

      autoTable(doc, {
        startY: bankY + 4,
        margin: { left: 36, right: 36 },
        head: [["BANK NAME", "ACCOUNT NUMBER", "IFSC CODE", "BRANCH", "ACCOUNT TYPE"]],
        body: [
          [
            profileData.bankName || "—",
            profileData.accountNumber ? `••••••${String(profileData.accountNumber).slice(-4)}` : "—",
            profileData.ifsc || "—",
            profileData.branch || "—",
            profileData.accountType || "—",
          ],
        ],
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 5 },
        headStyles: { fillColor: [111, 132, 0], textColor: [255, 255, 255], fontStyle: "bold" },
      });

      // 5. Address Details Table
      const addressY = doc.lastAutoTable.finalY + 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("RESIDENTIAL & CORRESPONDENCE ADDRESS", 36, addressY);

      autoTable(doc, {
        startY: addressY + 4,
        margin: { left: 36, right: 36 },
        head: [["HOUSE / STREET", "CITY / DISTRICT", "STATE", "PINCODE", "COUNTRY"]],
        body: [
          [
            `${profileData.houseNumber || ""}, ${profileData.street || ""}`,
            `${profileData.city || ""}, ${profileData.district || ""}`,
            profileData.state || "—",
            profileData.pin || "—",
            profileData.country || "India",
          ],
        ],
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 5 },
        headStyles: { fillColor: [111, 132, 0], textColor: [255, 255, 255], fontStyle: "bold" },
      });

      // 6. Experience Table
      const expY = doc.lastAutoTable.finalY + 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("EXPERIENCE & SERVICE RECORD", 36, expY);

      autoTable(doc, {
        startY: expY + 4,
        margin: { left: 36, right: 36 },
        head: [["ORGANIZATION / INSTITUTION", "DESIGNATION", "FROM", "TO", "ROLES / DOMAIN", "TOTAL"]],
        body: safeExperience.map((exp) => [
          exp.institution || "—",
          exp.designation || "—",
          exp.fromDate || "—",
          exp.toDate || "—",
          exp.subjectsTeached || "—",
          exp.totalExp || "—",
        ]),
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 5 },
        headStyles: { fillColor: [111, 132, 0], textColor: [255, 255, 255], fontStyle: "bold" },
      });

      const sanitizedName = (profileData.fullName || "Transport_Manager").replace(/\s+/g, "_");
      doc.save(`${sanitizedName}_Profile.pdf`);
      showToast("Profile PDF downloaded successfully!");
      setIsDownloadingPdf(false);
    } catch (err) {
      console.error("PDF generation error:", err);
      showToast("Failed to generate PDF.", "error");
      setIsDownloadingPdf(false);
    }
  };

  const handleSaveAndNext = async () => {
    if (isEditingProfile) {
      persistProfile(profileData);
      try {
        let sectionName = "";
        let payload = {};
        switch (profileStep) {
          case 1:
            sectionName = "Personal";
            payload = {
              Personal: {
                maritalStatus: profileData.maritalStatus,
                mobile: profileData.mobile,
              },
              personal: {
                maritalStatus: profileData.maritalStatus,
                mobile: profileData.mobile,
              },
              maritalStatus: profileData.maritalStatus,
              mobile: profileData.mobile,
            };
            if (profileData.mobile) {
              apiClient.put("/api/v1/staff/me/contact", { mobile: profileData.mobile }).catch(() => null);
              apiClient.put(apiEndpoints.faculty.updateProfileSettings, {
                fullName: profileData.fullName,
                mobile: profileData.mobile,
                personalEmail: profileData.email,
              }).catch(() => null);
            }
            break;
          case 2:
            sectionName = "Bank";
            payload = {
              Bank: {
                bankName: profileData.bankName,
                accountHolderName: profileData.accountHolder,
                accountNumber: profileData.accountNumber,
                ifscCode: profileData.ifsc,
                branch: profileData.branch,
                accountType: profileData.accountType,
                uanNumber: profileData.uanNumber,
                pfNumber: profileData.pfNumber,
              },
              bank: {
                bankName: profileData.bankName,
                accountHolder: profileData.accountHolder,
                accountNumber: profileData.accountNumber,
                ifsc: profileData.ifsc,
                branch: profileData.branch,
                accountType: profileData.accountType,
                uanNumber: profileData.uanNumber,
                pfNumber: profileData.pfNumber,
              },
            };
            break;
          case 3:
            sectionName = "Address";
            payload = {
              Address: {
                currentAddress: profileData.houseNumber,
                city: profileData.city,
                district: profileData.district,
                state: profileData.state,
                pincode: profileData.pin,
                country: profileData.country,
              },
              address: {
                houseNumber: profileData.houseNumber,
                street: profileData.street,
                city: profileData.city,
                district: profileData.district,
                state: profileData.state,
                pin: profileData.pin,
                country: profileData.country,
              },
            };
            break;
          case 4:
            sectionName = "Experience";
            payload = {
              Experience: (profileData.experience || []).map((e) => ({
                institutionName: e.institution,
                designation: e.designation,
                fromDate: e.fromDate || null,
                toDate: e.toDate || null,
                subjectsTaught: e.subjectsTeached,
              })),
              experience: (profileData.experience || []).map((e) => ({
                institutionName: e.institution,
                designation: e.designation,
                fromDate: e.fromDate || null,
                toDate: e.toDate || null,
                subjectsTaught: e.subjectsTeached,
              })),
            };
            break;
          case 5:
            sectionName = "Documents";
            payload = {
              documents: formatDocumentsDictionary(profileData.documents),
            };
            break;
          default:
            break;
        }

        if (sectionName && effectiveStaffId) {
          await apiClient.post(apiEndpoints.faculty.saveProfileDraft(effectiveStaffId), {
            sectionName,
            ...payload,
          }).catch((err) => {
            console.warn("Save profile draft endpoint notice:", err?.message || err);
          });
        }
      } catch (e) {
        console.warn("Failed to save profile draft to server:", e);
      }
      showToast(`Step ${profileStep} (${PROFILE_STEPS[profileStep - 1].title}) saved.`);
    }
    if (profileStep < 6) {
      setProfileStep((s) => s + 1);
    }
  };

  const handleFinalProfileSave = async () => {
    setIsSavingProfile(true);
    try {
      if (effectiveStaffId) {
        await apiClient.post(apiEndpoints.faculty.submitProfile(effectiveStaffId));
      }
      persistProfile(profileData);
      setIsSavingProfile(false);
      setIsEditingProfile(false);
      showToast("Complete staff profile updated and verified successfully!", "success");
    } catch (e) {
      console.warn("Failed to submit profile to server:", e);
      persistProfile(profileData);
      setIsSavingProfile(false);
      setIsEditingProfile(false);
      showToast("Profile updated and saved locally!", "success");
    }
  };

  return (
    <div className="tm-profile-page">
      {/* 1. Page Header matching Reference 2 */}
      <div className="cms-page-head sp-profile-page-head">
        <div>
          <h1>My Profile</h1>
          <p>{isEditingProfile ? "You can now edit your profile details" : "Complete your profile step by step"}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="tm-profile-completion-badge">
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

      {/* 2. Staff Identity Strip with Profile Photo Edit - Compact Single-Line Layout */}
      <div className="cms-card sp-profile-summary-card">
        <div className="cms-card-body sp-profile-summary-body">
          <div className="sp-profile-header-inline">
            <div className="sp-profile-avatar-wrap">
              <div
                className="sp-profile-avatar"
                onClick={() => setIsPhotoActionModalOpen(true)}
                title="Profile Photo Options"
              >
                {profileData.photoUrl ? (
                  <img src={profileData.photoUrl} alt={profileData.fullName} />
                ) : (
                  <User size={30} strokeWidth={1.8} className="sp-profile-user-icon" />
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPhotoActionModalOpen(true);
                }}
                className="sp-profile-photo-edit"
                title="Photo Options"
                aria-label="Photo Options"
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
              <span className="sp-profile-meta-tag">{profileData.staffType || "Non-Teaching"} Staff</span>
              <span className="sp-profile-meta-divider">·</span>
              <span className="sp-profile-meta-tag">Board: {boardName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Horizontal Wizard Stepper (Steps 1 to 6) */}
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

      {/* 4. Step Form Card */}
      <div className={`cms-card ${isEditingProfile ? "sp-profile-edit-mode" : "sp-profile-view-mode"}`}>
        <div className="cms-card-body sp-profile-form-body">
          {/* STEP 1: PERSONAL INFORMATION */}
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
                    {isEditingProfile ? "Editing Mode" : "Official Record · Read Only"}
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
                    value={
                      profileData.maritalStatus
                        ? profileData.maritalStatus.charAt(0).toUpperCase() + profileData.maritalStatus.slice(1).toLowerCase()
                        : "Single"
                    }
                    disabled={!isEditingProfile}
                    placeholder="Select Marital Status"
                    options={[
                      { value: "Single", label: "Single" },
                      { value: "Married", label: "Married" },
                      { value: "Divorced", label: "Divorced" },
                      { value: "Widowed", label: "Widowed" },
                    ]}
                    onChange={(e) => setProfileData({ ...profileData, maritalStatus: e.target.value })}
                  />
                </div>
                <div className="cms-field">
                  <label>
                    Phone Number <span className="req">*</span>
                  </label>
                  <input
                    type="tel"
                    value={profileData.mobile || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, mobile: e.target.value })}
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
                      "Transport Operations",
                      "Fleet Management",
                      "Safety & Compliance",
                      "Administration",
                      "Accounts",
                      "IT & Operations",
                    ]}
                    value={profileData.department || "Transport Operations"}
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
                      "Transport Manager",
                      "Assistant Transport Manager",
                      "Fleet Supervisor",
                      "Route Coordinator",
                      "Senior Transport Officer",
                    ]}
                    value={profileData.designation || "Transport Manager"}
                    disabled={true}
                  />
                </div>
                <div className="cms-field">
                  <label>Blood Group</label>
                  <SelectInput
                    value={profileData.bloodGroup || "O+"}
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
                    placeholder="e.g. Account Holder Name"
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
                    value={profileData.accountType || ""}
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
                    value={profileData.houseNumber || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, houseNumber: e.target.value })}
                    placeholder="e.g. 15-18-387"
                  />
                </div>
                <div className="cms-field">
                  <label>
                    Street / Area <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.street || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, street: e.target.value })}
                    placeholder="e.g. Transport Colony"
                  />
                </div>
                <div className="cms-field">
                  <label>
                    City / Village <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.city || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
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
                    value={profileData.pin || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => handlePinChange(e.target.value)}
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
                    Add or review previous fleet management and transport operations experience.
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
                    <label>Institution / Organization Name</label>
                    <input
                      type="text"
                      value={newExp.institution}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, institution: e.target.value })}
                      placeholder="e.g. APSRTC Regional Transport"
                    />
                  </div>
                  <div className="cms-field">
                    <label>Designation</label>
                    <input
                      type="text"
                      value={newExp.designation}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, designation: e.target.value })}
                      placeholder="e.g. Fleet Coordinator"
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
                    <label>Roles / Operational Domain</label>
                    <input
                      type="text"
                      value={newExp.subjectsTeached}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, subjectsTeached: e.target.value })}
                      placeholder="e.g. Fleet Dispatch & Maintenance"
                    />
                  </div>
                  <div className="cms-field">
                    <label>Total Experience</label>
                    <input
                      type="text"
                      value={newExp.totalExp}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, totalExp: e.target.value })}
                      placeholder="e.g. 3 Years"
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
                        showToast("Please click 'Edit' in the top right corner to add experience.", "warning");
                        return;
                      }
                      if (!newExp.institution.trim()) {
                        showToast("Please enter the organization name.", "error");
                        return;
                      }
                      if (!newExp.designation.trim()) {
                        showToast("Please enter your designation.", "error");
                        return;
                      }
                      const record = {
                        id: Date.now(),
                        institution: newExp.institution.trim(),
                        designation: newExp.designation.trim(),
                        fromDate: newExp.fromDate || "—",
                        toDate: newExp.toDate || "—",
                        subjectsTeached: newExp.subjectsTeached || "Fleet Logistics",
                        totalExp: newExp.totalExp || "1 Year",
                        status: "Verified",
                      };
                      const updatedExp = [...safeExperience, record];
                      setProfileData({ ...profileData, experience: updatedExp });
                      persistProfile({ ...profileData, experience: updatedExp });
                      setNewExp({
                        institution: "",
                        designation: "",
                        fromDate: "",
                        toDate: "",
                        subjectsTeached: "",
                        totalExp: "",
                      });
                      showToast("Experience record added successfully!");
                    }}
                  >
                    <Plus size={14} /> Add Experience
                  </button>
                </div>
              </div>

              {/* Table of Experiences */}
              <div className="cms-table-responsive">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th>Organization / Institution</th>
                      <th>Designation</th>
                      <th>From Date</th>
                      <th>To Date</th>
                      <th>Domain / Roles</th>
                      <th>Total Exp</th>
                      {isEditingProfile && <th style={{ textAlign: "center" }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {safeExperience.map((exp) => (
                      <tr key={exp.id}>
                        <td className="cms-strong">{exp.institution}</td>
                        <td>{exp.designation}</td>
                        <td>{exp.fromDate}</td>
                        <td>{exp.toDate}</td>
                        <td>{exp.subjectsTeached}</td>
                        <td>{exp.totalExp}</td>
                        {isEditingProfile && (
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="cms-action-btn"
                              style={{ color: "#dc2626" }}
                              onClick={() => {
                                const filtered = safeExperience.filter((e) => e.id !== exp.id);
                                setProfileData({ ...profileData, experience: filtered });
                                persistProfile({ ...profileData, experience: filtered });
                                showToast("Experience record removed.");
                              }}
                              title="Delete Record"
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
                    Upload official statutory identities, commercial driving licenses, and transport certifications.
                  </p>
                </div>
                <span className="cms-badge cms-badge-info">Step 5 of 6</span>
              </div>

              {/* Upload Document Box */}
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
                    <label>Document Title</label>
                    <input
                      type="text"
                      value={newDoc.name}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                      placeholder="e.g. Commercial Driving License"
                    />
                  </div>
                  <div className="cms-field">
                    <label>Document Type</label>
                    <SelectInput
                      value={newDoc.type}
                      disabled={!isEditingProfile}
                      options={[
                        "Identity Proof",
                        "Tax Identity",
                        "Transport Certification",
                        "Professional Certification",
                        "Address Proof",
                        "Other",
                      ]}
                      onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}
                    />
                  </div>
                  <div className="cms-field">
                    <label>File Upload</label>
                    <input
                      type="file"
                      ref={docFileRef}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewDoc({ ...newDoc, file: e.target.files?.[0] })}
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
                        showToast("Please click 'Edit' in the top right corner to upload documents.", "warning");
                        return;
                      }
                      if (!newDoc.name.trim()) {
                        showToast("Please enter a document title.", "error");
                        return;
                      }
                      const fileObj = newDoc.file;
                      const record = {
                        id: Date.now(),
                        name: newDoc.name.trim(),
                        type: newDoc.type,
                        format: fileObj ? fileObj.name.split(".").pop()?.toUpperCase() || "PDF" : "PDF",
                        size: fileObj ? `${(fileObj.size / (1024 * 1024)).toFixed(1)} MB` : "1.2 MB",
                        date: new Date().toISOString().split("T")[0],
                        status: "Verified",
                        url: "",
                      };
                      const updated = [...safeDocuments, record];
                      setProfileData({ ...profileData, documents: updated });
                      persistProfile({ ...profileData, documents: updated });
                      setNewDoc({ name: "", type: "Identity Proof", file: null });
                      if (docFileRef.current) docFileRef.current.value = "";
                      showToast("Document uploaded and saved successfully!");
                    }}
                  >
                    <Plus size={14} /> Add Document
                  </button>
                </div>
              </div>

              {/* Documents Table */}
              <div className="cms-table-responsive">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Category</th>
                      <th>Format</th>
                      <th>Size</th>
                      <th>Upload Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td className="cms-strong">{doc.name}</td>
                        <td>{doc.type}</td>
                        <td>
                          <span className="cms-badge cms-badge-info">{doc.format || "PDF"}</span>
                        </td>
                        <td>{doc.size || "1.2 MB"}</td>
                        <td>{doc.date || "—"}</td>
                        <td>
                          <span className="cms-badge cms-badge-active">{doc.status || "Verified"}</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button
                              type="button"
                              className="cms-action-btn"
                              onClick={() => showToast(`Viewing ${doc.name}...`)}
                              title="View Document"
                            >
                              <Eye size={13} />
                            </button>
                            {isEditingProfile && (
                              <button
                                type="button"
                                className="cms-action-btn"
                                style={{ color: "#dc2626" }}
                                onClick={() => {
                                  const updated = safeDocuments.filter((d) => d.id !== doc.id);
                                  setProfileData({ ...profileData, documents: updated });
                                  persistProfile({ ...profileData, documents: updated });
                                  showToast("Document deleted.");
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
                  Review all transport manager profile details below before final confirmation.
                </p>
              </div>

              {/* 1. Personal Information Section */}
              <section className="sp-preview-section">
                <div className="sp-preview-header">
                  <h4 className="sp-preview-title">Personal Information</h4>
                  <button
                    type="button"
                    className="sp-preview-edit-pill"
                    onClick={() => {
                      setIsEditingProfile(true);
                      setProfileStep(1);
                    }}
                  >
                    Edit
                  </button>
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
                      {safeExperience.length ? `${safeExperience.length} Records` : "0"}
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
                        profileData.houseNumber,
                        profileData.street,
                        profileData.city,
                        profileData.district,
                        profileData.state,
                        profileData.country || "India",
                        profileData.pin,
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
                    <div className="sp-preview-value">{profileData.houseNumber || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">STREET / AREA</div>
                    <div className="sp-preview-value">{profileData.street || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">CITY / VILLAGE</div>
                    <div className="sp-preview-value">{profileData.city || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">PINCODE</div>
                    <div className="sp-preview-value">{profileData.pin || "—"}</div>
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
                {!safeExperience.length ? (
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
                  safeExperience.map((exp, idx) => (
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
                          <div className="sp-preview-label">OPERATIONAL ROLES / DOMAIN</div>
                          <div className="sp-preview-value">{exp.subjectsTeached || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">TOTAL EXPERIENCE</div>
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
                  <h4 className="sp-preview-title">Uploaded Documents ({safeDocuments.length})</h4>
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
                {!safeDocuments.length ? (
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
                  safeDocuments.map((doc, idx) => (
                    <div key={doc.id || idx} className="sp-preview-subcard">
                      <div className="sp-preview-subcard-title">Document {idx + 1}</div>
                      <div className="sp-preview-grid">
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">DOCUMENT TITLE</div>
                          <div className="sp-preview-value">{doc.name || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">CATEGORY</div>
                          <div className="sp-preview-value">{doc.type || "—"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">FILE TYPE</div>
                          <div className="sp-preview-value">{doc.format || "PDF"}</div>
                        </div>
                        <div className="sp-preview-box">
                          <div className="sp-preview-label">SIZE</div>
                          <div className="sp-preview-value">{doc.size || "—"}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </section>

              {/* Preview Footer */}
              <div
                className="sp-preview-footer"
                style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 24 }}
              >
                <button type="button" className="cms-btn cms-btn-secondary" onClick={() => setProfileStep(5)}>
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={handleFinalProfileSave}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? <Loader2 size={16} className="spin" /> : <Check size={16} />} Final Submit
                </button>
              </div>
            </div>
          )}

          {/* Stepper Footer for Steps 1 through 5 */}
          {profileStep < 6 && (
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
              {profileStep > 1 ? (
                <button
                  type="button"
                  className="cms-btn cms-btn-secondary"
                  onClick={() => setProfileStep((s) => Math.max(1, s - 1))}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
              ) : (
                <div />
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={handleSaveAndNext}
                >
                  {isEditingProfile ? "Update & Next" : "Next"} <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Profile Photo Action Options Modal (matching Screenshot 3) */}
      {isPhotoActionModalOpen && (
        <div className="sp-modal-overlay" onClick={() => setIsPhotoActionModalOpen(false)}>
          <div className="sp-photo-action-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sp-photo-action-header">
              <span className="sp-photo-action-header-title">Profile Photo</span>
              <button
                type="button"
                className="sp-modal-close-btn"
                onClick={() => setIsPhotoActionModalOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Profile Avatar Center View matching Screenshot 3 */}
            <div className="sp-photo-action-preview">
              <div className="sp-photo-action-avatar">
                {profileData.photoUrl ? (
                  <img src={profileData.photoUrl} alt={profileData.fullName} />
                ) : (
                  <User size={46} strokeWidth={1.7} className="sp-profile-user-icon" />
                )}
              </div>
              <div className="sp-photo-action-name">{profileData.fullName || "Transport Manager"}</div>
              <div className="sp-photo-action-subtitle">
                {profileData.designation ? `${profileData.designation} · ${profileData.department}` : "Transport Manager"}
              </div>
            </div>

            {/* 4 Photo Actions matching Screenshot 3 */}
            <div className="sp-photo-action-menu">
              <button
                type="button"
                className={`sp-photo-action-item ${!profileData.photoUrl ? "disabled" : ""}`}
                onClick={() => {
                  if (!profileData.photoUrl) {
                    showToast("No photo uploaded yet.", "info");
                    return;
                  }
                  setIsPhotoActionModalOpen(false);
                  setIsViewPhotoOpen(true);
                }}
              >
                <div className="sp-photo-action-icon-wrap">
                  <Eye size={18} />
                </div>
                <div className="sp-photo-action-item-text">
                  <span className="sp-photo-action-label">View photo</span>
                </div>
              </button>

              <button
                type="button"
                className="sp-photo-action-item"
                onClick={() => {
                  setIsPhotoActionModalOpen(false);
                  setIsCameraModalOpen(true);
                }}
              >
                <div className="sp-photo-action-icon-wrap">
                  <Camera size={18} />
                </div>
                <div className="sp-photo-action-item-text">
                  <span className="sp-photo-action-label">Take photo</span>
                </div>
              </button>

              <button
                type="button"
                className="sp-photo-action-item"
                onClick={() => {
                  setIsPhotoActionModalOpen(false);
                  avatarRef.current?.click();
                }}
              >
                <div className="sp-photo-action-icon-wrap">
                  <Folder size={18} />
                </div>
                <div className="sp-photo-action-item-text">
                  <span className="sp-photo-action-label">Upload photo</span>
                </div>
              </button>

              <div className="sp-photo-action-divider" />

              <button
                type="button"
                className={`sp-photo-action-item danger ${!profileData.photoUrl ? "disabled" : ""}`}
                onClick={() => {
                  if (!profileData.photoUrl) {
                    showToast("No photo to remove.", "info");
                    return;
                  }
                  setIsPhotoActionModalOpen(false);
                  handleRemovePhoto();
                }}
              >
                <div className="sp-photo-action-icon-wrap">
                  <Trash2 size={18} />
                </div>
                <div className="sp-photo-action-item-text">
                  <span className="sp-photo-action-label">Remove photo</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. View Photo Lightbox Modal */}
      {isViewPhotoOpen && (
        <div className="sp-modal-overlay" onClick={() => setIsViewPhotoOpen(false)}>
          <div className="sp-photo-view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sp-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Eye size={17} style={{ color: "var(--cms-primary)" }} />
                <h3 className="sp-modal-title">Profile Photo</h3>
              </div>
              <button
                type="button"
                className="sp-modal-close-btn"
                onClick={() => setIsViewPhotoOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="sp-photo-view-body">
              {profileData.photoUrl ? (
                <img
                  src={profileData.photoUrl}
                  alt={profileData.fullName}
                  className="sp-photo-view-img"
                />
              ) : (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--cms-muted)" }}>
                  No photo uploaded yet.
                </div>
              )}
            </div>
            <div className="sp-modal-footer">
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={() => {
                  setIsViewPhotoOpen(false);
                  avatarRef.current?.click();
                }}
              >
                <Folder size={14} /> Change Photo
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-secondary"
                onClick={() => setIsViewPhotoOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Take Live Photo Camera Modal */}
      {isCameraModalOpen && (
        <div className="sp-modal-overlay" onClick={() => setIsCameraModalOpen(false)}>
          <div className="sp-camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sp-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Camera size={17} style={{ color: "var(--cms-primary)" }} />
                <h3 className="sp-modal-title">Take Photo with Webcam</h3>
              </div>
              <button
                type="button"
                className="sp-modal-close-btn"
                onClick={() => setIsCameraModalOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="sp-camera-body" style={{ padding: "16px", background: "#000", position: "relative" }}>
              {isCameraLoading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "260px", color: "#fff", gap: "10px" }}>
                  <Loader2 size={32} className="spin" />
                  <span>Starting camera stream...</span>
                </div>
              )}
              {cameraError ? (
                <div style={{ padding: "30px 16px", textAlign: "center", color: "#f87171" }}>
                  {cameraError}
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    maxHeight: "320px",
                    borderRadius: "10px",
                    transform: "scaleX(-1)",
                    display: isCameraLoading ? "none" : "block",
                  }}
                />
              )}
            </div>

            <div className="sp-modal-footer">
              <button
                type="button"
                className="cms-btn cms-btn-secondary"
                onClick={() => setIsCameraModalOpen(false)}
              >
                Cancel
              </button>
              {!cameraError && (
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={handleCaptureFromCamera}
                  disabled={isCameraLoading}
                >
                  <Camera size={14} /> Capture Photo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. Photo Cropper Modal */}
      {isCropModalOpen && (
        <div className="sp-modal-overlay" onClick={() => setIsCropModalOpen(false)}>
          <div className="sp-crop-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sp-modal-header">
              <h3 className="sp-modal-title">Adjust &amp; Crop Photo</h3>
              <button
                type="button"
                className="sp-modal-close-btn"
                onClick={() => setIsCropModalOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px", background: "#f8fafc" }}>
              <canvas
                ref={cropCanvasRef}
                width={300}
                height={300}
                style={{
                  width: "280px",
                  height: "280px",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  cursor: isDraggingCrop ? "grabbing" : "grab",
                  background: "#fff",
                }}
                onMouseDown={(e) => {
                  setIsDraggingCrop(true);
                  setDragStartCrop({ x: e.clientX - cropPan.x, y: e.clientY - cropPan.y });
                }}
                onMouseMove={(e) => {
                  if (!isDraggingCrop) return;
                  setCropPan({ x: e.clientX - dragStartCrop.x, y: e.clientY - dragStartCrop.y });
                }}
                onMouseUp={() => setIsDraggingCrop(false)}
                onMouseLeave={() => setIsDraggingCrop(false)}
              />

              {/* Controls */}
              <div style={{ display: "flex", gap: "10px", marginTop: "14px", alignItems: "center" }}>
                <button
                  type="button"
                  className="cms-action-btn"
                  onClick={() => setCropZoom((z) => Math.max(0.5, z - 0.15))}
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  type="button"
                  className="cms-action-btn"
                  onClick={() => setCropZoom((z) => Math.min(3, z + 0.15))}
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  type="button"
                  className="cms-action-btn"
                  onClick={() => setCropRotation((r) => (r + 90) % 360)}
                  title="Rotate 90deg"
                >
                  <RotateCw size={16} />
                </button>
                <button
                  type="button"
                  className="cms-action-btn"
                  onClick={() => {
                    setCropZoom(1);
                    setCropPan({ x: 0, y: 0 });
                    setCropRotation(0);
                  }}
                  title="Reset Adjustment"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            <div className="sp-modal-footer">
              <button
                type="button"
                className="cms-btn cms-btn-secondary"
                onClick={() => setIsCropModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={handleApplyCrop}
              >
                <Check size={14} /> Apply &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

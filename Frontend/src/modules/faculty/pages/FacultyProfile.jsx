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
  Folder,
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Mail,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileSignature,
} from "lucide-react";
import { useFaculty } from "../FacultyContext.jsx";
import {
  calculateStaffProfileCompletion,
  isStaffPortalUnlocked,
  FACULTY_INDIAN_BANKS,
  getBankFieldConstraints,
  validateAllBankFields,
} from "../profileCompletion.js";
import { clearAuthSession, getAuthUser } from "@/modules/auth/authStorage.js";
import apiClient from "@/api/apiClient.js";
import apiEndpoints from "@/api/apiEndpoints.js";
import TransparentAvatar from "@/shared/components/TransparentAvatar.jsx";
import { Skeleton, SkeletonAvatar, SkeletonButton, SkeletonInput } from "@/shared/components/Ui.jsx";
import "../styles/FacultyProfile.css";

export const INDIAN_BANKS = FACULTY_INDIAN_BANKS;

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
    isLoadingProfile,
    persistStaffProfile,
    isEditingProfile,
    setIsEditingProfile,
    profileStep,
    setProfileStep,
    initials,
    notify,
  } = useFaculty();

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isFetchingPin, setIsFetchingPin] = useState(false);
  const [pincodeAreas, setPincodeAreas] = useState([]);
  const [pinError, setPinError] = useState("");
  const [editPinError, setEditPinError] = useState("");
  const [bankErrors, setBankErrors] = useState({});
  const [editBankErrors, setEditBankErrors] = useState({});
  const pinLookupSeqRef = useRef(0);
  const lastAutoAreaRef = useRef("");

  const bankConstraints = useMemo(
    () => getBankFieldConstraints(profileData?.bankName),
    [profileData?.bankName]
  );

  const resolveStaffId = (data = {}, auth = getAuthUser() || {}) => {
    const candidates = [data?.id, data?.facultyId, data?.staffId, auth?.staffId, auth?.id];
    return (
      candidates.find((v) => {
        if (v === null || v === undefined) return false;
        const s = String(v).trim();
        return s !== "" && s !== "0" && !/^(undefined|null)$/i.test(s);
      }) || null
    );
  };

  const toObjectArray = (primary, secondary, fallback = []) => {
    if (Array.isArray(primary)) return primary;
    if (Array.isArray(secondary)) return secondary;
    return Array.isArray(fallback) ? fallback : [];
  };

  const extractBackendErrorMsg = (err, fallback) => {
    const data = err?.response?.data;
    if (data?.errors && typeof data.errors === "object") {
      const msgs = Object.values(data.errors).flat().filter(Boolean);
      if (msgs.length > 0) return msgs.join(" ");
    }
    if (
      data?.details &&
      typeof data.details === "string" &&
      (!data?.message || data.message === "An unexpected server error occurred.")
    ) {
      return data.details;
    }
    return data?.message || data?.Message || data?.details || data?.title || err?.message || fallback;
  };

  const applyBankChange = (patch) => {
    setProfileData((prev) => {
      const next = { ...prev, ...patch };
      setBankErrors(validateAllBankFields(next));
      return next;
    });
  };

  const applyEditBankChange = (patch) => {
    setEditBank((prev) => {
      const next = { ...prev, ...patch };
      setEditBankErrors(validateAllBankFields(next));
      return next;
    });
  };

  const lookupPincodeFromApi = async (pin, applyResult, setErrorFn) => {
    if (!pin || pin.length < 6) {
      setErrorFn("");
      return;
    }
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setErrorFn("Pincode must be 6 digits and cannot start with 0.");
      setPincodeAreas([]);
      return;
    }
    const seq = ++pinLookupSeqRef.current;
    setIsFetchingPin(true);
    setErrorFn("");
    try {
      const res = await apiClient.get(apiEndpoints.location.byPincode(pin), { skipGlobalLoader: true });
      if (pinLookupSeqRef.current !== seq) return;
      const loc = res?.data?.data || res?.data || {};
      const foundFlag = loc.found ?? loc.Found;
      if (foundFlag === false) {
        setErrorFn("No address details found for this pincode.");
        setPincodeAreas([]);
        return;
      }
      const areas = Array.isArray(loc.areas || loc.Areas) ? (loc.areas || loc.Areas) : [];
      setPincodeAreas(areas);
      const nextArea = areas[0] || "";
      applyResult({
        country: loc.country || loc.Country || "India",
        state: loc.state || loc.State || "",
        district: loc.district || loc.District || "",
        city: loc.city || loc.City || loc.district || loc.District || "",
        areas,
        suggestedArea: nextArea,
      });
      lastAutoAreaRef.current = nextArea;
    } catch (err) {
      if (pinLookupSeqRef.current !== seq) return;
      setPincodeAreas([]);
      setErrorFn(extractBackendErrorMsg(err, "No address details found for this pincode."));
    } finally {
      if (pinLookupSeqRef.current === seq) {
        setIsFetchingPin(false);
      }
    }
  };
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPendingApprovalModal, setShowPendingApprovalModal] = useState(false);
  const [isDownloadingOfferLetter, setIsDownloadingOfferLetter] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editPersonal, setEditPersonal] = useState({});
  const [editBank, setEditBank] = useState({});
  const [editAddress, setEditAddress] = useState({});

  const editBankConstraints = useMemo(
    () => getBankFieldConstraints(editBank?.bankName),
    [editBank?.bankName]
  );

  const isCurrentStepFilled = useMemo(() => {
    switch (profileStep) {
      case 1:
        return Boolean(profileData.maritalStatus && (profileData.mobile || profileData.phone));
      case 2:
        return Boolean(profileData.accountNumber && profileData.ifsc);
      case 3:
        return Boolean((profileData.houseNumber || profileData.address) && (profileData.pin || profileData.pincode));
      case 4:
        return Boolean(Array.isArray(profileData.experience) && profileData.experience.length > 0);
      case 5:
        return Boolean(Array.isArray(profileData.documents) && profileData.documents.length > 0);
      default:
        return false;
    }
  }, [profileStep, profileData]);

  // Profile Photo Action Modal, Camera & Cropper state
  const [isPhotoActionModalOpen, setIsPhotoActionModalOpen] = useState(false);
  const [isViewPhotoOpen, setIsViewPhotoOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // Experience and Documents Form States (Fix for Experience & Documents tabs)
  const [newExp, setNewExp] = useState({
    institution: "",
    designation: "",
    fromDate: "",
    toDate: "",
    subjectsTeached: "",
    totalExp: "",
  });

  const [newDoc, setNewDoc] = useState({
    type: "",
    title: "",
    file: null,
  });

  const availableSubjects = useMemo(
    () => [
      "Mathematics",
      "Physics",
      "Chemistry",
      "Botany",
      "Zoology",
      "English",
      "Sanskrit",
      "Commerce",
      "Economics",
      "Civics",
      "Computer Science",
    ],
    []
  );

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
  const [photoLoadError, setPhotoLoadError] = useState(false);

  const activePhotoUrl = useMemo(() => {
    return (
      profileData?.photoUrl ||
      profileData?.photoPath ||
      profileData?.profilePhoto ||
      null
    );
  }, [profileData?.photoUrl, profileData?.photoPath, profileData?.profilePhoto]);

  useEffect(() => {
    setPhotoLoadError(false);
  }, [activePhotoUrl]);

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
      notify("Please select a valid image file (PNG, JPG, JPEG, WEBP).", "error");
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
    const staffTargetId = profileData.id || profileData.facultyId;
    setProfileData((prev) => {
      const updated = { ...prev, photoUrl: "", photoPath: "", profilePhoto: "" };
      persistStaffProfile(updated);
      return updated;
    });
    if (avatarRef.current) {
      avatarRef.current.value = "";
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cms-staff-photo-updated", { detail: { photoUrl: "" } }));
    }
    setPhotoLoadError(false);
    notify("Profile photo removed.");
  };

  // Crop Drag Handlers
  const handleCropMouseDown = (e) => {
    setIsDraggingCrop(true);
    setDragStartCrop({ x: e.clientX - cropPan.x, y: e.clientY - cropPan.y });
  };
  const handleCropMouseMove = (e) => {
    if (!isDraggingCrop) return;
    setCropPan({ x: e.clientX - dragStartCrop.x, y: e.clientY - dragStartCrop.y });
  };
  const handleCropMouseUp = () => setIsDraggingCrop(false);

  const handleCropTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDraggingCrop(true);
      setDragStartCrop({
        x: e.touches[0].clientX - cropPan.x,
        y: e.touches[0].clientY - cropPan.y,
      });
    }
  };
  const handleCropTouchMove = (e) => {
    if (!isDraggingCrop || e.touches.length !== 1) return;
    setCropPan({
      x: e.touches[0].clientX - dragStartCrop.x,
      y: e.touches[0].clientY - dragStartCrop.y,
    });
  };
  const handleCropTouchEnd = () => setIsDraggingCrop(false);

  // Render crop canvas
  useEffect(() => {
    if (!isCropModalOpen || !rawImageToCrop || !cropCanvasRef.current) return;
    const canvas = cropCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2 + cropPan.x, canvas.height / 2 + cropPan.y);
      ctx.rotate((cropRotation * Math.PI) / 180);
      ctx.scale(cropZoom, cropZoom);

      const baseScale = Math.max(260 / img.width, 260 / img.height);
      const w = img.width * baseScale;
      const h = img.height * baseScale;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();

      // Guide overlay (240x240 rounded rectangle in center)
      const cropSize = 240;
      const left = (canvas.width - cropSize) / 2;
      const top = (canvas.height - cropSize) / 2;
      const r = 18;

      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      ctx.moveTo(left + r, top);
      ctx.lineTo(left + cropSize - r, top);
      ctx.quadraticCurveTo(left + cropSize, top, left + cropSize, top + r);
      ctx.lineTo(left + cropSize, top + cropSize - r);
      ctx.quadraticCurveTo(left + cropSize, top + cropSize, left + cropSize - r, top + cropSize);
      ctx.lineTo(left + r, top + cropSize);
      ctx.quadraticCurveTo(left, top + cropSize, left, top + cropSize - r);
      ctx.lineTo(left + r, top);
      ctx.closePath();
      ctx.clip("evenodd");
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Guide border
      ctx.save();
      ctx.strokeStyle = "#6F8400";
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
      const ratio = 400 / 240;
      ctx.translate(200 + cropPan.x * ratio, 200 + cropPan.y * ratio);
      ctx.rotate((cropRotation * Math.PI) / 180);
      ctx.scale(cropZoom, cropZoom);

      const baseScale = Math.max(260 / img.width, 260 / img.height);
      const w = img.width * baseScale * ratio;
      const h = img.height * baseScale * ratio;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();

      const croppedDataUrl = outCanvas.toDataURL("image/jpeg", 0.92);
      const authUser = getAuthUser() || {};
      const staffTargetId = profileData.staffId || profileData.id || profileData.facultyId || authUser.staffId || authUser.id;
      
      outCanvas.toBlob(async (blob) => {
        if (blob && staffTargetId) {
          try {
            const formData = new FormData();
            formData.append("Photo", blob, "profile.jpg");
            formData.append("file", blob, "profile.jpg");
            formData.append("StaffId", String(staffTargetId));
            formData.append("staffId", String(staffTargetId));

            const uploadRes = await apiClient.post(apiEndpoints.faculty.uploadPhoto, formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });

            const serverPath =
              uploadRes?.data?.photoPath ||
              uploadRes?.data?.PhotoPath ||
              uploadRes?.data?.photoUrl ||
              uploadRes?.data?.PhotoUrl ||
              uploadRes?.data?.profilePhoto;

            const finalPhotoUrl = serverPath || `/api/v1/staff/photo/${staffTargetId}`;

            setProfileData((prev) => {
              const updated = { ...prev, photoUrl: finalPhotoUrl, photoPath: finalPhotoUrl, profilePhoto: finalPhotoUrl };
              persistStaffProfile(updated);
              return updated;
            });

            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("cms-staff-photo-updated", { detail: { photoUrl: finalPhotoUrl } }));
            }
            notify("Profile photo cropped and saved to server successfully!");
          } catch (e) {
            console.error("Photo upload to backend failed:", e);
            notify(extractBackendErrorMsg(e, "Failed to upload photo to server. Please try again."), "error");
          }
        }
      }, "image/jpeg", 0.92);

      // Immediately display cropped preview while upload completes in background
      setProfileData((prev) => ({ ...prev, photoUrl: croppedDataUrl }));
      setPhotoLoadError(false);
      setIsCropModalOpen(false);
      setRawImageToCrop(null);
    };
    img.src = rawImageToCrop;

  };

  const profileCompletion = useMemo(
    () => calculateStaffProfileCompletion(profileData),
    [profileData]
  );

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
      const pdfExpList = toObjectArray(profileData.experience, profileData.experienceList);
      const expRows =
        pdfExpList.length > 0
          ? pdfExpList.map((e, idx) => [
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
        ["maritalStatus", "Marital status"],
        ["mobile", "Phone number"],
        ["email", "Email"],
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
      ],
    };
    const fallbacks = {
      houseNumber: "address",
      street: "streetArea",
      city: "cityVillage",
      pin: "pincode",
      dob: "dateOfBirth",
      dateOfJoining: "joiningDate",
      mobile: "phone",
      pan: "panNumber",
      aadhaar: "aadhaarNumber",
    };
    const missing = (requiredByStep[profileStep] || [])
      .filter(([key]) => {
        const val = profileData[key] ?? profileData[fallbacks[key]] ?? "";
        return !String(val).trim();
      })
      .map(([, label]) => label);
    if (missing.length) {
      notify(`Complete the required fields: ${missing.join(", ")}.`, "error");
      return false;
    }

    if (profileStep === 2) {
      const bErrors = validateAllBankFields(profileData);
      setBankErrors(bErrors);
      const firstBankError = Object.values(bErrors)[0];
      if (firstBankError) {
        notify(firstBankError, "error");
        return false;
      }
    }

    if (profileStep === 3) {
      const pinVal = String(profileData.pin || profileData.pincode || "").trim();
      if (pinVal && !/^[1-9][0-9]{5}$/.test(pinVal)) {
        const msg = "Pincode must be exactly 6 digits and cannot start with 0.";
        setPinError(msg);
        notify(msg, "error");
        return false;
      }
    }

    return true;
  };

  const getFormattedDraftPayload = (data) => {
    const docsList = toObjectArray(data?.documents, data?.documentsList)
      .filter((d) => d && typeof d === "object" && (d.type || d.name || d.url))
      .map((d, idx) => ({
        id: String(d.id || idx + 1),
        type: String(d.type || "Document").trim(),
        name: String(d.name || d.title || d.type || "Document").trim(),
        size: String(d.size || "Unknown"),
        url: String(d.url || "").startsWith("blob:") ? "" : String(d.url || "").trim(),
        format: String(d.format || "").trim(),
      }));

    const expItems = toObjectArray(data?.experience, data?.experienceList)
      .filter((e) => e && typeof e === "object")
      .map((e) => ({
      id: e.id,
      organization: e.institution || e.organization || e.institutionName || "",
      institution: e.institution || e.organization || e.institutionName || "",
      institutionName: e.institution || e.organization || e.institutionName || "",
      designation: e.designation || "",
      fromDate: e.fromDate || "",
      toDate: e.toDate || "",
      roles: e.subjectsTeached || e.subjectsTaught || e.roles || "",
      subjectsTeached: e.subjectsTeached || e.subjectsTaught || e.roles || "",
      subjectsTaught: e.subjectsTeached || e.subjectsTaught || e.roles || "",
      totalYears: parseFloat(e.totalExp) || e.totalYears || 1.0,
      totalExp: e.totalExp || `${e.totalYears || 1} Years`,
      status: e.status || "Verified",
    }));

    const personal = {
      firstName: data.firstName || "",
      middleName: data.middleName || "",
      lastName: data.lastName || "",
      gender: data.gender || "",
      dateOfBirth: data.dob || data.dateOfBirth || null,
      maritalStatus: data.maritalStatus || "Single",
      aadhaar: data.aadhaar || "",
      panNumber: data.pan || data.panNumber || "",
      pan: data.pan || data.panNumber || "",
      bloodGroup: data.bloodGroup || "",
      mobile: data.mobile || data.phone || "",
      phone: data.mobile || data.phone || "",
      phoneNumber: data.mobile || data.phone || "",
      fatherOrHusbandName: data.fatherOrHusbandName || data.guardianName || "",
      nationality: data.nationality || "Indian",
    };

    const bank = {
      bankName: data.bankName || "",
      accountHolderName: data.accountHolder || data.accountHolderName || data.fullName || "",
      accountHolder: data.accountHolder || data.accountHolderName || data.fullName || "",
      accountNumber: data.accountNumber || "",
      ifscCode: data.ifsc || data.ifscCode || "",
      ifsc: data.ifsc || data.ifscCode || "",
      branch: data.branch || data.branchName || "",
      branchName: data.branch || data.branchName || "",
      accountType: data.accountType || "Salary Account",
      panNumber: data.pan || data.panNumber || "",
      pfNumber: data.pfNumber || data.uanNumber || "",
      uanNumber: data.uanNumber || data.pfNumber || "",
    };

    const address = {
      houseNumber: data.houseNumber || data.address || "",
      street: data.street || data.streetArea || "",
      currentAddress: [data.houseNumber, data.street].filter(Boolean).join(", ") || data.currentAddress || data.address || "",
      permanentAddress: data.permanentAddress || [data.houseNumber, data.street].filter(Boolean).join(", ") || data.currentAddress || "",
      city: data.city || data.cityVillage || "",
      district: data.district || "",
      state: data.state || "",
      pincode: data.pin || data.pincode || "",
      pin: data.pin || data.pincode || "",
      country: data.country || "India",
      alternateMobile: data.alternateMobile || "",
    };

    return { personal, bank, address, experience: expItems, documents: docsList };
  };

  const syncAllSectionsToBackend = async (targetStaffId, currentData) => {
    if (!targetStaffId) return null;
    const { personal, bank, address, experience, documents } = getFormattedDraftPayload(currentData);

    const hasBank = Boolean(bank.accountNumber || bank.ifscCode || bank.bankName);
    const hasAddress = Boolean(address.houseNumber || address.street || address.city || address.pincode || address.state);
    const draftPayload = {
      sectionName: "All",
      personal,
      Personal: personal,
      ...(hasBank ? { bank, Bank: bank } : {}),
      ...(hasAddress ? { address, Address: address } : {}),
      ...(experience.length > 0 ? { experience, Experience: experience } : {}),
      ...(documents.length > 0 ? { documents, Documents: documents } : {}),
    };

    const resComposite = await apiClient.post(apiEndpoints.faculty.saveProfileDraft(targetStaffId), draftPayload);
    const compData = resComposite?.data?.data || resComposite?.data;
    if (compData && typeof compData === "object") {
      const comp = compData.profileCompletionPercentage ?? compData.profileCompletion;
      setProfileData((prev) => {
        const updated = {
          ...prev,
          ...(comp !== undefined ? { profileCompletionPercentage: comp, profileCompletion: comp } : {}),
          ...(compData.profileStatus ? { profileStatus: compData.profileStatus } : {}),
        };
        persistStaffProfile(updated);
        return updated;
      });
    }
    return compData;
  };

  const handleRemoveExperienceRecord = async (expId) => {
    const targetStaffId = profileData.id || profileData.staffId || profileData.facultyId || getAuthUser()?.staffId || getAuthUser()?.id;
    const updated = safeExperience.filter((item) => item.id !== expId);
    const updatedProfile = { ...profileData, experience: updated };
    const nextPct = calculateStaffProfileCompletion(updatedProfile);
    const syncedProfile = { ...updatedProfile, profileCompletionPercentage: nextPct, profileCompletion: nextPct };
    setProfileData(syncedProfile);
    persistStaffProfile(syncedProfile);
    if (targetStaffId) {
      await apiClient.post(apiEndpoints.faculty.saveProfileDraft(targetStaffId), {
        sectionName: "Experience",
        experience: updated,
        Experience: updated,
      }).catch(() => {});
    }
    notify("Experience record removed.");
  };

  const handleRemoveDocumentRecord = async (docItem) => {
    const targetStaffId = profileData.id || profileData.staffId || profileData.facultyId || getAuthUser()?.staffId || getAuthUser()?.id;
    const updated = safeDocuments.filter((item) => item.id !== docItem.id);
    const updatedProfile = { ...profileData, documents: updated };
    const nextPct = calculateStaffProfileCompletion(updatedProfile);
    const syncedProfile = { ...updatedProfile, profileCompletionPercentage: nextPct, profileCompletion: nextPct };
    setProfileData(syncedProfile);
    persistStaffProfile(syncedProfile);
    if (targetStaffId) {
      let deleted = false;
      if (docItem?.type) {
        try {
          await apiClient.delete(apiEndpoints.faculty.deleteDocument(targetStaffId, docItem.type));
          deleted = true;
        } catch {
          deleted = false;
        }
      }
      if (!deleted) {
        await apiClient.post(apiEndpoints.faculty.saveProfileDraft(targetStaffId), {
          sectionName: "Documents",
          documents: updated,
          Documents: updated,
        }).catch(() => {});
      }
    }
    notify("Document removed.");
  };

  const handleSaveAndNext = async () => {
    if (isEditingProfile) {
      if (!validateCurrentProfileStep()) return;
      setIsSavingStep(true);
      try {
        persistStaffProfile(profileData);

      const authUser = getAuthUser() || {};
      const targetStaffId = profileData.id || profileData.staffId || profileData.facultyId || authUser.staffId || authUser.id;

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
            dateOfBirth: profileData.dob || profileData.dateOfBirth || null,
            maritalStatus: profileData.maritalStatus,
            aadhaar: profileData.aadhaar,
            panNumber: profileData.pan || profileData.panNumber,
            pan: profileData.pan || profileData.panNumber,
            bloodGroup: profileData.bloodGroup,
            mobile: profileData.mobile || profileData.phone,
            phone: profileData.mobile || profileData.phone,
            phoneNumber: profileData.mobile || profileData.phone,
            fatherOrHusbandName: profileData.fatherOrHusbandName || profileData.guardianName,
            nationality: profileData.nationality || "Indian",
          };
          break;
        case 2:
          sectionName = "Bank";
          payload.Bank = {
            bankName: profileData.bankName || "",
            accountHolderName: profileData.accountHolder || profileData.accountHolderName || "",
            accountHolder: profileData.accountHolder || profileData.accountHolderName || "",
            accountNumber: profileData.accountNumber || "",
            ifscCode: (profileData.ifsc || profileData.ifscCode || "").toUpperCase(),
            ifsc: (profileData.ifsc || profileData.ifscCode || "").toUpperCase(),
            branch: profileData.branch || profileData.branchName || "",
            branchName: profileData.branch || profileData.branchName || "",
            accountType: profileData.accountType || "Savings Account",
            panNumber: profileData.pan || profileData.panNumber || "",
            pfNumber: profileData.pfNumber || profileData.uanNumber || "",
            uanNumber: profileData.uanNumber || profileData.pfNumber || "",
          };
          break;
        case 3:
          sectionName = "Address";
          payload.Address = {
            houseNumber: profileData.houseNumber,
            street: profileData.street || profileData.streetArea,
            currentAddress: [profileData.houseNumber, profileData.street].filter(Boolean).join(", ") || profileData.currentAddress || profileData.address,
            permanentAddress: profileData.permanentAddress || [profileData.houseNumber, profileData.street].filter(Boolean).join(", ") || profileData.currentAddress,
            city: profileData.city || profileData.cityVillage,
            district: profileData.district,
            state: profileData.state,
            pincode: profileData.pin || profileData.pincode,
            pin: profileData.pin || profileData.pincode,
            country: profileData.country || "India",
            alternateMobile: profileData.alternateMobile,
          };
          break;
        case 4:
          sectionName = "Experience";
          payload.Experience = toObjectArray(profileData.experience, profileData.experienceList)
            .filter((e) => e && typeof e === "object")
            .map((e) => ({
            id: e.id,
            institution: e.institution || e.organization || e.institutionName || "",
            organization: e.institution || e.organization || e.institutionName || "",
            institutionName: e.institution || e.organization || e.institutionName || "",
            designation: e.designation || "",
            fromDate: e.fromDate || "",
            toDate: e.toDate || "",
            subjectsTeached: e.subjectsTeached || e.subjectsTaught || e.roles || "",
            subjectsTaught: e.subjectsTeached || e.subjectsTaught || e.roles || "",
            roles: e.subjectsTeached || e.subjectsTaught || e.roles || "",
            totalExp: e.totalExp || `${e.totalYears || 1} Years`,
            totalYears: parseFloat(e.totalExp) || e.totalYears || 1.0,
            status: e.status || "Verified",
          }));
          break;
        case 5:
          sectionName = "Documents";
          payload.Documents = (profileData.documents || []).map((d) => ({
            id: String(d.id),
            name: d.name || d.title,
            type: d.type,
            format: d.format,
            size: d.size,
            url: d.url,
          }));
          break;
        default:
          break;
      }

      if (payload.Personal) payload.personal = payload.Personal;
      if (payload.Bank) payload.bank = payload.Bank;
      if (payload.Address) payload.address = payload.Address;
      if (payload.Experience) payload.experience = payload.Experience;
      if (payload.Documents) {
        payload.documents = toObjectArray(profileData.documents, profileData.documentsList)
          .filter((d) => d && typeof d === "object")
          .map((d, idx) => ({
            id: String(d.id || idx + 1),
            name: d.name || d.title || "Document",
            type: d.type || "Document",
            format: d.format || "",
            size: d.size || "Unknown",
            url: d.url || "",
          }));
      }

      if (sectionName && targetStaffId) {
        try {
          const res = await apiClient.post(apiEndpoints.faculty.saveProfileDraft(targetStaffId), {
            sectionName,
            ...payload,
          });
          const savedData = res?.data?.data || res?.data;
          if (savedData && typeof savedData === "object") {
            setProfileData((prev) => {
              const nextExp = toObjectArray(savedData.experienceList, savedData.experience, prev.experience);
              const nextDocs = toObjectArray(savedData.documentsList, savedData.documents, prev.documents);
              const nextEdu = toObjectArray(savedData.educationList, savedData.education, prev.education);
              const updated = {
                ...prev,
                ...savedData,
                experience: nextExp,
                experienceList: nextExp,
                documents: nextDocs,
                documentsList: nextDocs,
                education: nextEdu,
                educationList: nextEdu,
                dob: savedData.dateOfBirth ? String(savedData.dateOfBirth).split("T")[0] : prev.dob,
                pan: savedData.panNumber || savedData.pan || prev.pan,
                pin: savedData.pincode || savedData.pin || prev.pin,
                houseNumber: savedData.houseNumber || prev.houseNumber,
                street: savedData.street || prev.street,
                bankName: savedData.bankName || savedData.bankDetails?.bankName || prev.bankName,
                accountHolder: savedData.accountHolder || savedData.bankDetails?.accountHolderName || prev.accountHolder,
                accountNumber: savedData.accountNumber || savedData.bankDetails?.accountNumber || prev.accountNumber,
                ifsc: savedData.ifsc || savedData.bankDetails?.ifscCode || prev.ifsc,
                branch: savedData.branch || savedData.bankDetails?.branch || prev.branch,
                accountType: savedData.accountType || savedData.bankDetails?.accountType || prev.accountType,
              };
              persistStaffProfile(updated);
              return updated;
            });
          }
        } catch (e) {
          console.error("Failed to save profile section to database:", e);
          const errorMsg = extractBackendErrorMsg(e, "Failed to save section data to database.");
          notify(`Save failed: ${errorMsg}`, "error");
          // Prevent navigation when save fails as mandated
          return;
        }
      }

      } finally {
        setIsSavingStep(false);
      }
    }
    if (profileStep < 6) {
      setProfileStep((s) => s + 1);
    }
  };

  const handleFinalProfileSave = async () => {
    // 50% Minimum Completion Requirement
    if (profileCompletion < 50) {
      setShowIncompleteModal(true);
      notify(
        `Minimum 50% profile completion required for final submission. Current completion: ${profileCompletion}%.`,
        "error",
        "Submission Incomplete"
      );
      return;
    }

    setIsSavingProfile(true);

    try {
      const authUser = getAuthUser() || {};
      const staffTargetId = resolveStaffId(profileData, authUser);
      if (!staffTargetId) {
        notify("Unable to resolve staff ID for submission. Please refresh and sign in again.", "error");
        setIsSavingProfile(false);
        return;
      }
      const wasOfferLetterAlreadyIssued = ["completed", "approved"].includes(
        String(profileData?.profileStatus || "").trim().toLowerCase()
      );

      // Step 1: Sync all sections to backend database first so server recalculates completion >= 50%
      await syncAllSectionsToBackend(staffTargetId, profileData);
      const res = await apiClient.post(apiEndpoints.faculty.submitProfile(staffTargetId));
      const sData = res?.data?.data || res?.data || {};
      const newStatus = sData.profileStatus || res?.data?.profileStatus || "PendingApproval";
      const serverPct = sData.profileCompletionPercentage ?? sData.profileCompletion ?? profileCompletion;
      const hasOfferLetter =
        String(newStatus).toLowerCase() === "completed" ||
        String(newStatus).toLowerCase() === "approved";
      const isNewlyDispatched =
        sData.offerLetterDispatchedNow !== undefined
          ? Boolean(sData.offerLetterDispatchedNow)
          : (hasOfferLetter && !wasOfferLetterAlreadyIssued);
      const isUnlocked = isStaffPortalUnlocked(newStatus, true);

      const updated = {
        ...profileData,
        profileStatus: newStatus,
        profileCompletionPercentage: serverPct,
        profileCompletion: serverPct,
        status: isUnlocked ? "Active" : profileData.status,
        isOnboarded: isUnlocked,
      };
      setProfileData(updated);
      persistStaffProfile(updated);
      window.dispatchEvent(new Event("cms-staff-updated"));
      setIsSavingProfile(false);
      setIsEditingProfile(false);

      if (!hasOfferLetter) {
        setShowPendingApprovalModal(true);
        notify("Profile submitted successfully. Sent to Admin for offer letter approval.");
      } else if (isNewlyDispatched) {
        setShowSuccessModal(true);
        notify("Official offer letter generated and sent to your registered email!");
      } else {
        notify("Profile updated and saved successfully.");
      }
    } catch (e) {
      console.error("Failed to submit profile:", e);
      const msg = extractBackendErrorMsg(e, "Failed to submit profile to server");
      notify(msg, "error");
      setIsSavingProfile(false);
    }
  };

  const handleDownloadOfferLetter = async () => {
    const sId = profileData.id || profileData.facultyId || profileData.staffId;
    if (!sId) {
      notify("Staff identifier not found for downloading offer letter.", "error");
      return;
    }
    setIsDownloadingOfferLetter(true);
    try {
      const res = await apiClient.get(apiEndpoints.staff.offerLetterPdf(sId), {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Offer_Letter_${profileData.employeeId || sId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notify("Official Offer Letter downloaded successfully!");
    } catch (err) {
      console.error("Failed to download offer letter:", err);
      notify(err?.response?.data?.message || "Failed to download offer letter PDF. Offer letter may not be generated yet.", "error");
    } finally {
      setIsDownloadingOfferLetter(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div aria-busy="true" aria-label="Loading profile">
        {/* Page Header Skeleton */}
        <div className="cms-page-head sp-profile-page-head">
          <div>
            <Skeleton style={{ width: 150, height: 24, marginBottom: 6 }} />
            <Skeleton style={{ width: 230, height: 13 }} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Skeleton style={{ width: 165, height: 30, borderRadius: "20px" }} />
            <SkeletonButton width={135} height={36} />
            <SkeletonButton width={92} height={36} />
          </div>
        </div>

        {/* Identity Strip Skeleton */}
        <div className="cms-card sp-profile-summary-card">
          <div className="cms-card-body sp-profile-summary-body">
            <div className="sp-profile-header-inline">
              <SkeletonAvatar size={54} />
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Skeleton style={{ width: 160, height: 18 }} />
                <Skeleton style={{ width: 210, height: 14 }} />
                <Skeleton style={{ width: 110, height: 14 }} />
                <Skeleton style={{ width: 120, height: 14 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Wizard Stepper Skeleton */}
        <div className="sp-wizard-stepper">
          {PROFILE_STEPS.map((step) => (
            <div key={step.id} className="sp-wizard-step" style={{ cursor: "default" }}>
              <Skeleton style={{ width: 26, height: 26, borderRadius: "50%" }} />
              <Skeleton style={{ width: 78, height: 14 }} />
            </div>
          ))}
        </div>

        {/* Step Form Card Skeleton */}
        <div className="cms-card sp-profile-view-mode">
          <div className="cms-card-body sp-profile-form-body">
            <div
              className="cms-card-head"
              style={{ padding: "0 0 16px 0", borderBottom: "1px solid var(--cms-border)", marginBottom: 18 }}
            >
              <Skeleton style={{ width: 180, height: 18 }} />
              <Skeleton style={{ width: 82, height: 22, borderRadius: 12 }} />
            </div>
            <div className="cms-form-grid cols-3 sp-profile-form-grid">
              {Array.from({ length: 9 }).map((_, idx) => (
                <div key={idx} className="cms-field">
                  <Skeleton style={{ width: 110, height: 12, marginBottom: 6 }} />
                  <SkeletonInput height={38} />
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 24,
                paddingTop: 18,
                borderTop: "1px solid var(--cms-border)",
              }}
            >
              <div />
              <SkeletonButton width={130} height={38} />
            </div>
          </div>
        </div>
      </div>
    );
  }

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

          {(String(profileData?.profileStatus || "").toLowerCase() === "completed" || String(profileData?.profileStatus || "").toLowerCase() === "approved") && (
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={handleDownloadOfferLetter}
              disabled={isDownloadingOfferLetter}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--cms-primary, #355e3b)",
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(53, 94, 59, 0.2)",
              }}
              title="Download Official Offer Letter PDF"
            >
              {isDownloadingOfferLetter ? (
                <>
                  <Loader2 size={14} className="spin" /> Preparing...
                </>
              ) : (
                <>
                  <FileSignature size={14} /> Download Offer Letter
                </>
              )}
            </button>
          )}

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

      {/* Workflow Status Banners */}
      {String(profileData?.profileStatus || "").toLowerCase() === "pendingapproval" && (
        <div style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fef3c7", color: "#b45309", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Clock size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#92400e" }}>
              Onboarding Submitted — Awaiting Admin Offer Letter Approval
            </div>
            <div style={{ fontSize: "13px", color: "#b45309", marginTop: "2px", lineHeight: "1.5" }}>
              Your details have been submitted successfully. Your request has been sent to the Admin for approval. Once your request is approved, your offer letter will be generated and sent to your registered email address.
            </div>
          </div>
        </div>
      )}

      {String(profileData?.profileStatus || "").toLowerCase() === "underverification" && (
        <div style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ShieldCheck size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#1e40af" }}>
              Under Administrative Verification
            </div>
            <div style={{ fontSize: "13px", color: "#1d4ed8", marginTop: "2px", lineHeight: "1.5" }}>
              Your submitted credentials, bank details, and identity documents are actively undergoing verification by HR Administration.
            </div>
          </div>
        </div>
      )}

      {(String(profileData?.profileStatus || "").toLowerCase() === "changes required" || String(profileData?.profileStatus || "").toLowerCase() === "needscorrection") && (
        <div style={{
          background: "#fff1f2",
          border: "1px solid #fecdd3",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#ffe4e6", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#9f1239" }}>
              Corrections Requested by Administration
            </div>
            <div style={{ fontSize: "13px", color: "#be123c", marginTop: "2px", lineHeight: "1.5" }}>
              <strong>Admin Reason:</strong> {profileData.correctionNotes || authUser?.correctionNotes || "Please review and update requested sections."}
            </div>
          </div>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => { setIsEditingProfile(true); setProfileStep(1); }}
            style={{ fontSize: "13px", padding: "8px 16px", background: "#e11d48", border: "none", color: "#fff" }}
          >
            Update Details
          </button>
        </div>
      )}

      {String(profileData?.profileStatus || "").toLowerCase() === "onboarding discontinued" && (
        <div style={{
          background: "#f8fafc",
          border: "1px solid #cbd5e1",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#e2e8f0", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#334155" }}>
              Onboarding Process Discontinued
            </div>
            <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px", lineHeight: "1.5" }}>
              {profileData.correctionNotes || authUser?.correctionNotes || "This onboarding request is discontinued. Please contact HR Administration."}
            </div>
          </div>
        </div>
      )}

      {/* Staff Identity Strip with Profile Photo Edit - Compact Single-Line Layout */}
      <div className="cms-card sp-profile-summary-card">
        <div className="cms-card-body sp-profile-summary-body">
          <div className="sp-profile-header-inline">
            <div className="sp-profile-avatar-wrap">
              <div
                className="sp-profile-avatar"
                onClick={() => setIsPhotoActionModalOpen(true)}
                title="Profile Photo Options"
              >
                {activePhotoUrl && !photoLoadError ? (
                  <img
                    src={activePhotoUrl}
                    alt={profileData.fullName || "Profile Photo"}
                    onError={() => setPhotoLoadError(true)}
                  />
                ) : (
                  <TransparentAvatar size={54} />
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
              onClick={() => {
                if (isEditingProfile) {
                  const targetStaffId = resolveStaffId(profileData);
                  if (targetStaffId) syncAllSectionsToBackend(targetStaffId, profileData).catch(() => {});
                }
                setProfileStep(step.id);
              }}
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
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={profileData.dob ? String(profileData.dob).split("T")[0] : (profileData.dateOfBirth ? String(profileData.dateOfBirth).split("T")[0] : "")}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, dob: e.target.value, dateOfBirth: e.target.value }))}
                  />
                </div>
                <div className="cms-field">
                  <label>
                    Gender <span className="req">*</span>
                  </label>
                  <SelectInput
                    value={profileData.gender || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, gender: e.target.value }))}
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
                    value={profileData.maritalStatus || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, maritalStatus: e.target.value }))}
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
                    value={profileData.mobile || profileData.phone || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, mobile: e.target.value, phone: e.target.value }))}
                    placeholder="Enter phone number"
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
                    placeholder="Email address"
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
                    value={profileData.bloodGroup || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, bloodGroup: e.target.value }))}
                    placeholder="Select Blood Group"
                    options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
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
                  <label>Aadhaar Number</label>
                  <input
                    type="text"
                    maxLength={14}
                    value={profileData.aadhaar || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, aadhaar: e.target.value }))}
                    placeholder="Enter 12-digit Aadhaar number"
                  />
                </div>
                <div className="cms-field">
                  <label>PAN Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={profileData.pan || profileData.panNumber || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, pan: e.target.value.toUpperCase(), panNumber: e.target.value.toUpperCase() }))}
                    placeholder="Enter 10-character PAN (e.g. ABCDE1234F)"
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
                  <label>
                    Bank Name <span className="req">*</span>
                  </label>
                  <SearchSelectInput
                    label="Bank Name"
                    placeholder="Search or select bank..."
                    options={INDIAN_BANKS}
                    value={profileData.bankName || ""}
                    disabled={!isEditingProfile}
                    onChange={(val) => applyBankChange({ bankName: val })}
                  />
                  {bankErrors.bankName && (
                    <small style={{ color: "var(--cms-red, #dc2626)", fontSize: 11, fontWeight: 600, marginTop: 4, display: "block" }}>
                      {bankErrors.bankName}
                    </small>
                  )}
                </div>
                <div className="cms-field">
                  <label>
                    Account Holder Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.accountHolder || ""}
                    disabled={!isEditingProfile}
                    style={bankErrors.accountHolder ? { borderColor: "var(--cms-red, #dc2626)" } : undefined}
                    onChange={(e) => applyBankChange({ accountHolder: e.target.value })}
                    placeholder="Enter account holder name"
                  />
                  {bankErrors.accountHolder && (
                    <small style={{ color: "var(--cms-red, #dc2626)", fontSize: 11, fontWeight: 600, marginTop: 4, display: "block" }}>
                      {bankErrors.accountHolder}
                    </small>
                  )}
                </div>
                <div className="cms-field">
                  <label>
                    Account Number <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={bankConstraints.maxLen}
                    value={profileData.accountNumber || ""}
                    disabled={!isEditingProfile}
                    style={bankErrors.accountNumber ? { borderColor: "var(--cms-red, #dc2626)" } : undefined}
                    onChange={(e) => applyBankChange({ accountNumber: e.target.value.trim() })}
                    placeholder={
                      bankConstraints.isKnownBank
                        ? `Enter ${bankConstraints.minLen === bankConstraints.maxLen ? bankConstraints.minLen : `${bankConstraints.minLen}-${bankConstraints.maxLen}`}-digit account number`
                        : "Enter account number (9-18 digits)"
                    }
                  />
                  {bankErrors.accountNumber && (
                    <small style={{ color: "var(--cms-red, #dc2626)", fontSize: 11, fontWeight: 600, marginTop: 4, display: "block" }}>
                      {bankErrors.accountNumber}
                    </small>
                  )}
                </div>

                {/* Row 2 */}
                <div className="cms-field">
                  <label>
                    IFSC Code <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={profileData.ifsc || ""}
                    disabled={!isEditingProfile}
                    style={bankErrors.ifsc ? { borderColor: "var(--cms-red, #dc2626)" } : undefined}
                    onChange={(e) =>
                      applyBankChange({
                        ifsc: e.target.value.toUpperCase().replace(/\s+/g, ""),
                        ifscCode: e.target.value.toUpperCase().replace(/\s+/g, ""),
                      })
                    }
                    placeholder={`Enter IFSC code (e.g. ${bankConstraints.sampleIfsc})`}
                  />
                  {bankErrors.ifsc && (
                    <small style={{ color: "var(--cms-red, #dc2626)", fontSize: 11, fontWeight: 600, marginTop: 4, display: "block" }}>
                      {bankErrors.ifsc}
                    </small>
                  )}
                </div>
                <div className="cms-field">
                  <label>
                    Branch Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.branch || ""}
                    disabled={!isEditingProfile}
                    style={bankErrors.branch ? { borderColor: "var(--cms-red, #dc2626)" } : undefined}
                    onChange={(e) => applyBankChange({ branch: e.target.value })}
                    placeholder="Enter branch name"
                  />
                  {bankErrors.branch && (
                    <small style={{ color: "var(--cms-red, #dc2626)", fontSize: 11, fontWeight: 600, marginTop: 4, display: "block" }}>
                      {bankErrors.branch}
                    </small>
                  )}
                </div>
                <div className="cms-field">
                  <label>
                    Account Type <span className="req">*</span>
                  </label>
                  <SelectInput
                    value={profileData.accountType || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => applyBankChange({ accountType: e.target.value })}
                    placeholder="Select Account Type"
                    options={["Salary Account", "Savings Account", "Current Account"]}
                  />
                </div>

                {/* Row 3 */}
                <div className="cms-field">
                  <label>PF Number / UAN</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    value={profileData.uanNumber || profileData.pfNumber || ""}
                    disabled={!isEditingProfile}
                    style={bankErrors.uanNumber ? { borderColor: "var(--cms-red, #dc2626)" } : undefined}
                    onChange={(e) =>
                      applyBankChange({
                        uanNumber: e.target.value.trim(),
                        pfNumber: e.target.value.trim(),
                      })
                    }
                    placeholder="Enter 12-digit UAN number"
                  />
                  {bankErrors.uanNumber && (
                    <small style={{ color: "var(--cms-red, #dc2626)", fontSize: 11, fontWeight: 600, marginTop: 4, display: "block" }}>
                      {bankErrors.uanNumber}
                    </small>
                  )}
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
                    placeholder="Enter house / flat number"
                  />
                </div>
                <div className="cms-field">
                  <label>
                    Street / Area <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    list={pincodeAreas.length > 0 ? "sp-pincode-areas-list" : undefined}
                    value={profileData.street || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData({ ...profileData, street: e.target.value })}
                    placeholder="Enter street / locality"
                  />
                  {pincodeAreas.length > 0 && (
                    <datalist id="sp-pincode-areas-list">
                      {pincodeAreas.map((area) => (
                        <option key={area} value={area} />
                      ))}
                    </datalist>
                  )}
                </div>
                <div className="cms-field">
                  <label>
                    City / Village <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.city || profileData.cityVillage || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, city: e.target.value, cityVillage: e.target.value }))}
                    placeholder="Enter city / village"
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
                    inputMode="numeric"
                    maxLength={6}
                    value={profileData.pin || profileData.pincode || ""}
                    disabled={!isEditingProfile}
                    style={pinError ? { borderColor: "var(--cms-red, #dc2626)" } : undefined}
                    onChange={(e) => {
                      const pin = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setProfileData((prev) => ({
                        ...prev,
                        pin,
                        pincode: pin,
                      }));
                      if (pin.length === 6) {
                        lookupPincodeFromApi(
                          pin,
                          ({ country, state, district, city, suggestedArea }) => {
                            setProfileData((prev) => {
                              const currentStreet = String(prev.street || "").trim();
                              const shouldFillArea =
                                suggestedArea && (!currentStreet || currentStreet === lastAutoAreaRef.current);
                              return {
                                ...prev,
                                country: country || prev.country || "India",
                                state: state || prev.state,
                                district: district || prev.district,
                                city: city || prev.city,
                                cityVillage: city || prev.cityVillage,
                                ...(shouldFillArea ? { street: suggestedArea, streetArea: suggestedArea } : {}),
                              };
                            });
                          },
                          setPinError
                        );
                      } else {
                        setPinError("");
                        setPincodeAreas([]);
                      }
                    }}
                    placeholder="Enter 6-digit PIN code"
                  />
                  {pinError && (
                    <small style={{ color: "var(--cms-red, #dc2626)", fontSize: 11, fontWeight: 600, marginTop: 4, display: "block" }}>
                      {pinError}
                    </small>
                  )}
                </div>
                <div className="cms-field">
                  <label>
                    District <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.district || ""}
                    disabled={!isEditingProfile}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, district: e.target.value }))}
                    placeholder="Enter district"
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
                    onChange={(e) => setProfileData((prev) => ({ ...prev, state: e.target.value }))}
                    placeholder="Enter state"
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
                    disabled={true}
                    readOnly
                    placeholder="India"
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
                      placeholder="Enter institution / college name"
                    />
                  </div>
                  <div className="cms-field">
                    <label>Designation</label>
                    <input
                      type="text"
                      value={newExp.designation}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, designation: e.target.value })}
                      placeholder="Enter designation / position"
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
                      type="number"
                      min="0"
                      step="1"
                      value={newExp.totalExp}
                      disabled={!isEditingProfile}
                      onChange={(e) => setNewExp({ ...newExp, totalExp: e.target.value })}
                      placeholder="Years of experience"
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
                      const updatedExp = [...safeExperience, record];
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
                Experience History ({safeExperience.length})
              </h4>
              {safeExperience.length === 0 ? (
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
                      {safeExperience.map((x) => (
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
                                onClick={() => handleRemoveExperienceRecord(x.id)}
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
                            const targetStaffId = profileData.id || profileData.staffId || profileData.facultyId || getAuthUser()?.staffId || getAuthUser()?.id;
                            const docType = newDoc.type || "Other Document";
                            const formData = new FormData();
                            formData.append("file", newDoc.file);
                            formData.append("documentType", docType);
                            const upRes = await apiClient.post(apiEndpoints.faculty.uploadDocument(targetStaffId), formData, {
                              headers: { "Content-Type": "multipart/form-data" },
                            });
                            const upData = upRes?.data?.data || upRes?.data;
                            const serverDocs = Array.isArray(upData?.documentsList || upData?.documents)
                              ? (upData.documentsList || upData.documents)
                              : safeDocuments;
                            const updatedProfile = {
                              ...profileData,
                              documents: serverDocs,
                              documentsList: serverDocs,
                              ...(upData?.profileCompletionPercentage !== undefined ? { profileCompletionPercentage: upData.profileCompletionPercentage, profileCompletion: upData.profileCompletionPercentage } : {}),
                              ...(upData?.profileStatus ? { profileStatus: upData.profileStatus } : {}),
                            };
                            setProfileData(updatedProfile);
                            persistStaffProfile(updatedProfile);
                            setNewDoc({ type: "Aadhaar Card Copy", title: "", file: null });
                            if (docFileRef.current) docFileRef.current.value = "";
                            notify("Document uploaded and saved successfully!");
                          } catch (e) {
                            console.error("Document upload failed:", e);
                            const msg = e?.response?.data?.message || e?.response?.data?.Message || e?.message || "Failed to upload document.";
                            notify(msg, "error");
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
                Uploaded Documents ({safeDocuments.length})
              </h4>
              {safeDocuments.length === 0 ? (
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
                      {safeDocuments.map((d) => (
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
                                  onClick={() => handleRemoveDocumentRecord(d)}
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

          {/* Universal Navigation Footer for Steps 1 through 5 */}
          {profileStep < 6 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 24,
                paddingTop: 18,
                borderTop: "1px solid var(--cms-border)",
              }}
            >
              {profileStep > 1 ? (
                <button
                  type="button"
                  className="sp-btn-prev"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0 22px",
                    height: "38px",
                    fontWeight: 600,
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: "#ffffff",
                    border: "1px solid var(--cms-border, #cbd5e1)",
                    color: "var(--cms-text, #1e293b)",
                  }}
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
                  style={{
                    padding: "0 22px",
                    height: "38px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  disabled={isSavingStep}
                  onClick={handleSaveAndNext}
                >
                  {isSavingStep && <Loader2 size={16} className="animate-spin" />}
                  <span>{isSavingStep ? "Saving..." : (profileStep === 5 ? "Save & Review" : "Save & Next")}</span>
                  {!isSavingStep && <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: PREVIEW (Review & Submit with strict in-place inline editing) */}
          {profileStep === 6 && (
            <div>
              <div style={{ marginBottom: 22 }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "var(--cms-text, #0f172a)" }}>
                  Review &amp; Submit
                </h3>
                <p style={{ margin: 0, color: "var(--cms-muted, #64748b)", fontSize: 13 }}>
                  Review the saved employee details below before final submission. Click Edit on any card to modify approved fields in place.
                </p>
              </div>

              {/* 1. Personal Information Section (Exact same grid & boxes, Official Record label removed) */}
              <section className="sp-preview-section">
                <div className="sp-preview-header">
                  <h4 className="sp-preview-title">Personal Information</h4>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {editingSection !== "personal" ? (
                      <button
                        type="button"
                        className="sp-preview-edit-pill"
                        onClick={() => {
                          setEditPersonal({
                            maritalStatus: profileData.maritalStatus || "Single",
                            mobile: profileData.mobile || profileData.phone || "",
                            bloodGroup: profileData.bloodGroup || "",
                            aadhaar: profileData.aadhaar || "",
                            pan: profileData.pan || profileData.panNumber || "",
                            dob: profileData.dob || profileData.dateOfBirth || "",
                          });
                          setEditingSection("personal");
                        }}
                      >
                        Edit
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="sp-preview-edit-pill"
                          style={{ background: "#f1f5f9", color: "#475569" }}
                          onClick={() => setEditingSection(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="sp-preview-edit-pill"
                          style={{ background: "var(--cms-primary, #355e3b)", color: "#ffffff" }}
                          onClick={async () => {
                            const updated = {
                              ...profileData,
                              maritalStatus: editPersonal.maritalStatus,
                              mobile: editPersonal.mobile,
                              phone: editPersonal.mobile,
                              bloodGroup: editPersonal.bloodGroup,
                              aadhaar: editPersonal.aadhaar,
                              pan: editPersonal.pan,
                              panNumber: editPersonal.pan,
                              dob: editPersonal.dob,
                              dateOfBirth: editPersonal.dob,
                            };
                            setProfileData(updated);
                            persistStaffProfile(updated);
                            const targetStaffId = updated.id || updated.staffId || updated.facultyId || getAuthUser()?.staffId || getAuthUser()?.id;
                            try {
                              if (targetStaffId) {
                                await apiClient.post(apiEndpoints.faculty.saveProfileDraft(targetStaffId), {
                                  sectionName: "Personal",
                                  Personal: {
                                    maritalStatus: editPersonal.maritalStatus,
                                    mobile: editPersonal.mobile,
                                    phone: editPersonal.mobile,
                                    bloodGroup: editPersonal.bloodGroup,
                                    aadhaar: editPersonal.aadhaar,
                                    panNumber: editPersonal.pan,
                                    pan: editPersonal.pan,
                                    dateOfBirth: editPersonal.dob || null,
                                  },
                                });
                              }
                            } catch {}
                            setEditingSection(null);
                            if (targetStaffId) await syncAllSectionsToBackend(targetStaffId, updated).catch(() => {});
                            notify("Personal details updated successfully.");
                          }}
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
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
                    <div className="sp-preview-value">
                      {editingSection === "personal" && (!profileData.dob && !profileData.dateOfBirth) ? (
                        <input
                          type="date"
                          className="sp-inline-input"
                          value={editPersonal.dob ? String(editPersonal.dob).split("T")[0] : ""}
                          onChange={(e) => setEditPersonal((prev) => ({ ...prev, dob: e.target.value }))}
                        />
                      ) : (
                        profileData.dob ? String(profileData.dob).split("T")[0] : (profileData.dateOfBirth ? String(profileData.dateOfBirth).split("T")[0] : "—")
                      )}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">GENDER</div>
                    <div className="sp-preview-value">{profileData.gender || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">MARITAL STATUS</div>
                    <div className="sp-preview-value">
                      {editingSection === "personal" ? (
                        <select
                          className="sp-inline-select"
                          value={editPersonal.maritalStatus || "Single"}
                          onChange={(e) => setEditPersonal((prev) => ({ ...prev, maritalStatus: e.target.value }))}
                        >
                          {["Single", "Married", "Divorced", "Widowed"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        profileData.maritalStatus || "—"
                      )}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">PHONE NUMBER</div>
                    <div className="sp-preview-value">
                      {editingSection === "personal" ? (
                        <input
                          type="tel"
                          className="sp-inline-input"
                          value={editPersonal.mobile || ""}
                          onChange={(e) => setEditPersonal((prev) => ({ ...prev, mobile: e.target.value }))}
                          placeholder="Phone number"
                        />
                      ) : (
                        profileData.mobile || profileData.phone || "—"
                      )}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">EMAIL</div>
                    <div className="sp-preview-value">{profileData.email || "—"}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">AADHAAR NUMBER</div>
                    <div className="sp-preview-value">
                      {editingSection === "personal" ? (
                        <input
                          type="text"
                          maxLength={14}
                          className="sp-inline-input"
                          value={editPersonal.aadhaar || ""}
                          onChange={(e) => setEditPersonal((prev) => ({ ...prev, aadhaar: e.target.value }))}
                          placeholder="12-digit Aadhaar"
                        />
                      ) : (
                        profileData.aadhaar
                          ? profileData.aadhaar.length >= 12
                            ? `XXXX XXXX ${profileData.aadhaar.slice(-4)}`
                            : profileData.aadhaar
                          : "—"
                      )}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">PAN NUMBER</div>
                    <div className="sp-preview-value">
                      {editingSection === "personal" ? (
                        <input
                          type="text"
                          maxLength={10}
                          className="sp-inline-input"
                          value={editPersonal.pan || ""}
                          onChange={(e) => setEditPersonal((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                          placeholder="10-digit PAN"
                        />
                      ) : (
                        profileData.pan || profileData.panNumber || "—"
                      )}
                    </div>
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
                    <div className="sp-preview-value">{profileData.dateOfJoining ? String(profileData.dateOfJoining).split("T")[0] : (profileData.joiningDate ? String(profileData.joiningDate).split("T")[0] : "—")}</div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">EXPERIENCE (YEARS)</div>
                    <div className="sp-preview-value">
                      {profileData.experience?.length ? `${profileData.experience.length} Entries` : "0"}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">BLOOD GROUP</div>
                    <div className="sp-preview-value">
                      {editingSection === "personal" ? (
                        <select
                          className="sp-inline-select"
                          value={editPersonal.bloodGroup || ""}
                          onChange={(e) => setEditPersonal((prev) => ({ ...prev, bloodGroup: e.target.value }))}
                        >
                          <option value="">Select</option>
                          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        profileData.bloodGroup || "—"
                      )}
                    </div>
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

              {/* 2. Bank Details Section (Exact same grid & boxes) */}
              <section className="sp-preview-section">
                <div className="sp-preview-header">
                  <h4 className="sp-preview-title">Bank Details</h4>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {editingSection !== "bank" ? (
                      <button
                        type="button"
                        className="sp-preview-edit-pill"
                        onClick={() => {
                          const initBank = {
                            accountHolder: profileData.accountHolder || "",
                            bankName: profileData.bankName || "",
                            accountNumber: profileData.accountNumber || "",
                            accountType: profileData.accountType || "Salary Account",
                            ifsc: profileData.ifsc || "",
                            branch: profileData.branch || "",
                            uanNumber: profileData.uanNumber || profileData.pfNumber || "",
                          };
                          setEditBank(initBank);
                          setEditBankErrors(validateAllBankFields(initBank));
                          setEditingSection("bank");
                        }}
                      >
                        Edit
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="sp-preview-edit-pill"
                          style={{ background: "#f1f5f9", color: "#475569" }}
                          onClick={() => {
                            setEditBankErrors({});
                            setEditingSection(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="sp-preview-edit-pill"
                          style={{ background: "var(--cms-primary, #355e3b)", color: "#ffffff" }}
                          onClick={async () => {
                            if (!editBank.bankName || !editBank.accountNumber || !editBank.ifsc) {
                              notify("Please fill in Bank Name, Account Number, and IFSC Code.", "error");
                              return;
                            }
                            const errors = validateAllBankFields(editBank);
                            setEditBankErrors(errors);
                            const firstErr = Object.values(errors)[0];
                            if (firstErr) {
                              notify(firstErr, "error");
                              return;
                            }
                            const updated = {
                              ...profileData,
                              accountHolder: editBank.accountHolder,
                              bankName: editBank.bankName,
                              accountNumber: editBank.accountNumber,
                              accountType: editBank.accountType,
                              ifsc: editBank.ifsc,
                              ifscCode: editBank.ifsc,
                              branch: editBank.branch,
                              uanNumber: editBank.uanNumber,
                              pfNumber: editBank.uanNumber,
                            };
                            const targetStaffId = updated.id || updated.staffId || updated.facultyId || getAuthUser()?.staffId || getAuthUser()?.id;
                            try {
                              if (targetStaffId) {
                                await apiClient.post(apiEndpoints.faculty.saveProfileDraft(targetStaffId), {
                                  sectionName: "Bank",
                                  Bank: {
                                    accountHolderName: editBank.accountHolder || "",
                                    accountHolder: editBank.accountHolder || "",
                                    bankName: editBank.bankName || "",
                                    accountNumber: editBank.accountNumber || "",
                                    accountType: editBank.accountType || "Salary Account",
                                    ifscCode: (editBank.ifsc || "").toUpperCase(),
                                    ifsc: (editBank.ifsc || "").toUpperCase(),
                                    branch: editBank.branch || "",
                                    panNumber: updated.pan || updated.panNumber || "",
                                    uanNumber: editBank.uanNumber || "",
                                    pfNumber: editBank.uanNumber || "",
                                  },
                                });
                              }
                            } catch (err) {
                              notify(extractBackendErrorMsg(err, "Failed to save bank details."), "error");
                              return;
                            }
                            setProfileData(updated);
                            persistStaffProfile(updated);
                            setEditBankErrors({});
                            setEditingSection(null);
                            if (targetStaffId) await syncAllSectionsToBackend(targetStaffId, updated).catch(() => {});
                            notify("Bank details updated successfully.");
                          }}
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="sp-preview-grid">
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">ACCOUNT HOLDER NAME</div>
                    <div className="sp-preview-value">
                      {editingSection === "bank" ? (
                        <>
                          <input
                            type="text"
                            className="sp-inline-input"
                            style={editBankErrors.accountHolder ? { borderColor: "var(--cms-red, #dc2626)" } : undefined}
                            value={editBank.accountHolder || ""}
                            onChange={(e) => applyEditBankChange({ accountHolder: e.target.value })}
                            placeholder="Account holder name"
                          />
                          {editBankErrors.accountHolder && (
                            <small style={{ color: "var(--cms-red, #dc2626)", fontSize: 11, fontWeight: 600, marginTop: 4, display: "block" }}>
                              {editBankErrors.accountHolder}
                            </small>
                          )}
                        </>
                      ) : (
                        profileData.accountHolder || "—"
                      )}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">BANK NAME</div>
                    <div className="sp-preview-value">
                      {editingSection === "bank" ? (
                        <>
                          <select
                            className="sp-inline-select"
                            style={editBankErrors.bankName ? { borderColor: "var(--cms-red, #dc2626)" } : undefined}
                            value={editBank.bankName || ""}
                            onChange={(e) => applyEditBankChange({ bankName: e.target.value })}
                          >
                            <option value="">Select Bank</option>
                            {editBank.bankName && !INDIAN_BANKS.includes(editBank.bankName) && (
                              <option value={editBank.bankName}>{editBank.bankName}</option>
                            )}
                            {INDIAN_BANKS.map((bank) => (
                              <option key={bank} value={bank}>{bank}</option>
                            ))}
                          </select>
                          {editBankErrors.bankName && (
                            <small style={{ color: "var(--cms-red, #dc2626)", fontSize: 11, fontWeight: 600, marginTop: 4, display: "block" }}>
                              {editBankErrors.bankName}
                            </small>
                          )}
                        </>
                      ) : (
                        profileData.bankName || "—"
                      )}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">ACCOUNT NUMBER</div>
                    <div className="sp-preview-value">
                      {editingSection === "bank" ? (
                        <>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={editBankConstraints.maxLen}
                            className="sp-inline-input"
                            style={editBankErrors.accountNumber ? { borderColor: "var(--cms-red, #dc2626)" } : undefined}
                            value={editBank.accountNumber || ""}
                            onChange={(e) => applyEditBankChange({ accountNumber: e.target.value.trim() })}
                            placeholder={
                              editBankConstraints.isKnownBank
                                ? `${editBankConstraints.minLen === editBankConstraints.maxLen ? editBankConstraints.minLen : `${editBankConstraints.minLen}-${editBankConstraints.maxLen}`} digits`
                                : "Account number"
                            }
                          />
                          {editBankErrors.accountNumber && (
                            <small style={{ color: "var(--cms-red, #dc2626)", fontSize: 11, fontWeight: 600, marginTop: 4, display: "block" }}>
                              {editBankErrors.accountNumber}
                            </small>
                          )}
                        </>
                      ) : (
                        profileData.accountNumber ? `••••••${String(profileData.accountNumber).slice(-4)}` : "—"
                      )}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">ACCOUNT TYPE</div>
                    <div className="sp-preview-value">
                      {editingSection === "bank" ? (
                        <select
                          className="sp-inline-select"
                          value={editBank.accountType || "Salary Account"}
                          onChange={(e) => applyEditBankChange({ accountType: e.target.value })}
                        >
                          {["Salary Account", "Savings Account", "Current Account"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        profileData.accountType || "—"
                      )}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">IFSC CODE</div>
                    <div className="sp-preview-value">
                      {editingSection === "bank" ? (
                        <>
                          <input
                            type="text"
                            maxLength={11}
                            className="sp-inline-input"
                            style={editBankErrors.ifsc ? { borderColor: "var(--cms-red, #dc2626)" } : undefined}
                            value={editBank.ifsc || ""}
                            onChange={(e) => applyEditBankChange({ ifsc: e.target.value.toUpperCase().replace(/\s+/g, "") })}
                            placeholder={editBankConstraints.sampleIfsc}
                          />
                          {editBankErrors.ifsc && (
                            <small style={{ color: "var(--cms-red, #dc2626)", fontSize: 11, fontWeight: 600, marginTop: 4, display: "block" }}>
                              {editBankErrors.ifsc}
                            </small>
                          )}
                        </>
                      ) : (
                        profileData.ifsc || "—"
                      )}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">BRANCH NAME</div>
                    <div className="sp-preview-value">
                      {editingSection === "bank" ? (
                        <>
                          <input
                            type="text"
                            className="sp-inline-input"
                            style={editBankErrors.branch ? { borderColor: "var(--cms-red, #dc2626)" } : undefined}
                            value={editBank.branch || ""}
                            onChange={(e) => applyEditBankChange({ branch: e.target.value })}
                            placeholder="Branch name"
                          />
                          {editBankErrors.branch && (
                            <small style={{ color: "var(--cms-red, #dc2626)", fontSize: 11, fontWeight: 600, marginTop: 4, display: "block" }}>
                              {editBankErrors.branch}
                            </small>
                          )}
                        </>
                      ) : (
                        profileData.branch || "—"
                      )}
                    </div>
                  </div>
                  <div className="sp-preview-box full">
                    <div className="sp-preview-label">PF NUMBER / UAN</div>
                    <div className="sp-preview-value">
                      {editingSection === "bank" ? (
                        <>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={12}
                            className="sp-inline-input"
                            style={editBankErrors.uanNumber ? { borderColor: "var(--cms-red, #dc2626)" } : undefined}
                            value={editBank.uanNumber || ""}
                            onChange={(e) => applyEditBankChange({ uanNumber: e.target.value.trim() })}
                            placeholder="12-digit UAN number"
                          />
                          {editBankErrors.uanNumber && (
                            <small style={{ color: "var(--cms-red, #dc2626)", fontSize: 11, fontWeight: 600, marginTop: 4, display: "block" }}>
                              {editBankErrors.uanNumber}
                            </small>
                          )}
                        </>
                      ) : (
                        profileData.uanNumber || profileData.pfNumber || "—"
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Address Information Section (Exact same grid & boxes) */}
              <section className="sp-preview-section">
                <div className="sp-preview-header">
                  <h4 className="sp-preview-title">Address Information</h4>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {editingSection !== "address" ? (
                      <button
                        type="button"
                        className="sp-preview-edit-pill"
                        onClick={() => {
                          setEditAddress({
                            houseNumber: profileData.houseNumber || profileData.address || "",
                            street: profileData.street || profileData.streetArea || "",
                            city: profileData.city || profileData.cityVillage || "",
                            pin: profileData.pin || profileData.pincode || "",
                            district: profileData.district || "",
                            state: profileData.state || "",
                            country: profileData.country || "India",
                          });
                          setEditingSection("address");
                        }}
                      >
                        Edit
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="sp-preview-edit-pill"
                          style={{ background: "#f1f5f9", color: "#475569" }}
                          onClick={() => setEditingSection(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="sp-preview-edit-pill"
                          style={{ background: "var(--cms-primary, #355e3b)", color: "#ffffff" }}
                          onClick={async () => {
                            const pinVal = String(editAddress.pin || "").trim();
                            if (pinVal && !/^[1-9][0-9]{5}$/.test(pinVal)) {
                              const msg = "Pincode must be exactly 6 digits and cannot start with 0.";
                              setEditPinError(msg);
                              notify(msg, "error");
                              return;
                            }
                            const updated = {
                              ...profileData,
                              houseNumber: editAddress.houseNumber,
                              address: editAddress.houseNumber,
                              street: editAddress.street,
                              streetArea: editAddress.street,
                              city: editAddress.city,
                              cityVillage: editAddress.city,
                              pin: editAddress.pin,
                              pincode: editAddress.pin,
                              district: editAddress.district,
                              state: editAddress.state,
                              country: editAddress.country,
                            };
                            const targetStaffId = updated.id || updated.staffId || updated.facultyId || getAuthUser()?.staffId || getAuthUser()?.id;
                            try {
                              if (targetStaffId) {
                                await apiClient.post(apiEndpoints.faculty.saveProfileDraft(targetStaffId), {
                                  sectionName: "Address",
                                  Address: {
                                    houseNumber: editAddress.houseNumber,
                                    street: editAddress.street,
                                    currentAddress: [editAddress.houseNumber, editAddress.street].filter(Boolean).join(", "),
                                    city: editAddress.city,
                                    pincode: editAddress.pin,
                                    pin: editAddress.pin,
                                    district: editAddress.district,
                                    state: editAddress.state,
                                    country: editAddress.country,
                                  },
                                });
                              }
                            } catch (err) {
                              notify(extractBackendErrorMsg(err, "Failed to save address."), "error");
                              return;
                            }
                            setProfileData(updated);
                            persistStaffProfile(updated);
                            setEditPinError("");
                            setEditingSection(null);
                            if (targetStaffId) await syncAllSectionsToBackend(targetStaffId, updated).catch(() => {});
                            notify("Address updated successfully.");
                          }}
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="sp-preview-grid">
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">HOUSE NUMBER</div>
                    <div className="sp-preview-value">
                      {editingSection === "address" ? (
                        <input
                          type="text"
                          className="sp-inline-input"
                          value={editAddress.houseNumber || ""}
                          onChange={(e) => setEditAddress((prev) => ({ ...prev, houseNumber: e.target.value }))}
                          placeholder="House / flat number"
                        />
                      ) : (
                        profileData.houseNumber || profileData.address || "—"
                      )}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">STREET / AREA</div>
                    <div className="sp-preview-value">
                      {editingSection === "address" ? (
                        <input
                          type="text"
                          className="sp-inline-input"
                          value={editAddress.street || ""}
                          onChange={(e) => setEditAddress((prev) => ({ ...prev, street: e.target.value }))}
                          placeholder="Street / area"
                        />
                      ) : (
                        profileData.street || profileData.streetArea || "—"
                      )}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">CITY / VILLAGE</div>
                    <div className="sp-preview-value">
                      {editingSection === "address" ? (
                        <input
                          type="text"
                          className="sp-inline-input"
                          value={editAddress.city || ""}
                          onChange={(e) => setEditAddress((prev) => ({ ...prev, city: e.target.value }))}
                          placeholder="City / village"
                        />
                      ) : (
                        profileData.city || profileData.cityVillage || "—"
                      )}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">PINCODE</div>
                    <div className="sp-preview-value">
                      {editingSection === "address" ? (
                        <>
                          <input
                            type="text"
                            maxLength={6}
                            className="sp-inline-input"
                            value={editAddress.pin || ""}
                            style={editPinError ? { borderColor: "var(--cms-red, #dc2626)" } : undefined}
                          onChange={(e) => {
                            const pVal = e.target.value.replace(/\D/g, "").slice(0, 6);
                            setEditAddress((prev) => ({ ...prev, pin: pVal }));
                            if (pVal.length === 6) {
                              lookupPincodeFromApi(
                                pVal,
                                ({ country, state, district, city, suggestedArea }) => {
                                  setEditAddress((prev) => ({
                                    ...prev,
                                    country: country || prev.country || "India",
                                    state: state || prev.state,
                                    district: district || prev.district,
                                    city: city || prev.city,
                                    street: prev.street?.trim() ? prev.street : (suggestedArea || prev.street),
                                  }));
                                },
                                setEditPinError
                              );
                            } else {
                              setEditPinError("");
                            }
                          }}
                          placeholder="6-digit PIN"
                        />
                          {editPinError && (
                            <small style={{ color: "var(--cms-red, #dc2626)", fontSize: 11, fontWeight: 600, marginTop: 4, display: "block" }}>
                              {editPinError}
                            </small>
                          )}
                        </>
                      ) : (
                        profileData.pin || profileData.pincode || "—"
                      )}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">DISTRICT</div>
                    <div className="sp-preview-value">
                      {editingSection === "address" ? (
                        <input
                          type="text"
                          className="sp-inline-input"
                          value={editAddress.district || ""}
                          onChange={(e) => setEditAddress((prev) => ({ ...prev, district: e.target.value }))}
                          placeholder="District"
                        />
                      ) : (
                        profileData.district || "—"
                      )}
                    </div>
                  </div>
                  <div className="sp-preview-box">
                    <div className="sp-preview-label">STATE</div>
                    <div className="sp-preview-value">
                      {editingSection === "address" ? (
                        <input
                          type="text"
                          className="sp-inline-input"
                          value={editAddress.state || ""}
                          onChange={(e) => setEditAddress((prev) => ({ ...prev, state: e.target.value }))}
                          placeholder="State"
                        />
                      ) : (
                        profileData.state || "—"
                      )}
                    </div>
                  </div>
                  <div className="sp-preview-box full">
                    <div className="sp-preview-label">COUNTRY</div>
                    <div className="sp-preview-value">
                      {editingSection === "address" ? (
                        <input
                          type="text"
                          className="sp-inline-input"
                          value={editAddress.country || "India"}
                          onChange={(e) => setEditAddress((prev) => ({ ...prev, country: e.target.value }))}
                          placeholder="Country"
                        />
                      ) : (
                        profileData.country || "India"
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. Experience Section (Preserved layout with inline add & delete) */}
              <section className="sp-preview-section">
                <div className="sp-preview-header">
                  <h4 className="sp-preview-title">Experience ({safeExperience.length})</h4>
                  <button
                    type="button"
                    className="sp-preview-edit-pill"
                    onClick={() => {
                      setEditingSection(editingSection === "experience" ? null : "experience");
                    }}
                  >
                    {editingSection === "experience" ? "Done" : "Edit / Add"}
                  </button>
                </div>

                {editingSection === "experience" && (
                  <div style={{ background: "var(--cms-subtle, #f8fafc)", padding: "18px", borderRadius: "12px", border: "1px solid var(--cms-border)", marginBottom: "16px" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "var(--cms-text)" }}>Add New Experience</div>
                    <div className="sp-grid-3" style={{ marginBottom: "12px" }}>
                      <div className="cms-field">
                        <label>Institution / College Name</label>
                        <input
                          type="text"
                          value={newExp.institution}
                          onChange={(e) => setNewExp((prev) => ({ ...prev, institution: e.target.value }))}
                          placeholder="e.g. Sri Chaitanya Junior College"
                        />
                      </div>
                      <div className="cms-field">
                        <label>Designation</label>
                        <input
                          type="text"
                          value={newExp.designation}
                          onChange={(e) => setNewExp((prev) => ({ ...prev, designation: e.target.value }))}
                          placeholder="e.g. Lecturer Mathematics"
                        />
                      </div>
                      <div className="cms-field">
                        <label>From Date</label>
                        <input
                          type="date"
                          value={newExp.fromDate}
                          onChange={(e) => setNewExp((prev) => ({ ...prev, fromDate: e.target.value }))}
                        />
                      </div>
                      <div className="cms-field">
                        <label>To Date</label>
                        <input
                          type="date"
                          value={newExp.toDate}
                          onChange={(e) => setNewExp((prev) => ({ ...prev, toDate: e.target.value }))}
                        />
                      </div>
                      <div className="cms-field">
                        <label>Subjects Taught</label>
                        <input
                          type="text"
                          value={newExp.subjectsTeached}
                          onChange={(e) => setNewExp((prev) => ({ ...prev, subjectsTeached: e.target.value }))}
                          placeholder="e.g. Mathematics"
                        />
                      </div>
                      <div className="cms-field">
                        <label>Total Experience (Years)</label>
                        <input
                          type="number"
                          value={newExp.totalExp}
                          onChange={(e) => setNewExp((prev) => ({ ...prev, totalExp: e.target.value }))}
                          placeholder="e.g. 2"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cms-btn cms-btn-primary"
                      style={{ fontSize: 13, padding: "7px 16px" }}
                      onClick={() => {
                        if (!newExp.institution) {
                          notify("Please enter Institution name.", "error");
                          return;
                        }
                        const rec = { ...newExp, id: Date.now() };
                        const updated = [...safeExperience, rec];
                        setProfileData({ ...profileData, experience: updated });
                        persistStaffProfile({ ...profileData, experience: updated });
                        setNewExp({ institution: "", designation: "", fromDate: "", toDate: "", subjectsTeached: "", totalExp: "" });
                        const targetStaffId = resolveStaffId(profileData);
                        if (targetStaffId) syncAllSectionsToBackend(targetStaffId, { ...profileData, experience: updated }).catch(() => {});
                        notify("Experience added.");
                      }}
                    >
                      + Add Experience
                    </button>
                  </div>
                )}

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
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div className="sp-preview-subcard-title">Experience {idx + 1}</div>
                        {editingSection === "experience" && (
                          <button
                            type="button"
                            className="cms-action-btn"
                            style={{ color: "var(--cms-red)" }}
                            onClick={() => handleRemoveExperienceRecord(exp.id)}
                            title="Delete Experience"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>
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

              {/* 5. Uploaded Documents Section (Preserved layout with inline upload & delete) */}
              <section className="sp-preview-section">
                <div className="sp-preview-header">
                  <h4 className="sp-preview-title">Uploaded Documents ({safeDocuments.length})</h4>
                  <button
                    type="button"
                    className="sp-preview-edit-pill"
                    onClick={() => {
                      setEditingSection(editingSection === "documents" ? null : "documents");
                    }}
                  >
                    {editingSection === "documents" ? "Done" : "Edit / Upload"}
                  </button>
                </div>

                {editingSection === "documents" && (
                  <div style={{ background: "var(--cms-subtle, #f8fafc)", padding: "18px", borderRadius: "12px", border: "1px solid var(--cms-border)", marginBottom: "16px" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "var(--cms-text)" }}>Upload New Document</div>
                    <div className="sp-grid-3" style={{ marginBottom: "12px" }}>
                      <div className="cms-field">
                        <label>Document Type</label>
                        <SelectInput
                          value={newDoc.type || "Aadhaar Card Copy"}
                          onChange={(e) => setNewDoc((prev) => ({ ...prev, type: e.target.value }))}
                          options={[
                            "Aadhaar Card Copy",
                            "PAN Card Copy",
                            "10th Standard Marks Sheet",
                            "Intermediate / 10+2 Certificate",
                            "Degree Certificate",
                            "Relieving Letter from Previous College",
                            "Cancelled Cheque / Bank Passbook",
                            "Other",
                          ]}
                        />
                      </div>
                      <div className="cms-field">
                        <label>Document Title</label>
                        <input
                          type="text"
                          value={newDoc.title}
                          onChange={(e) => setNewDoc((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g. Official Relieving Letter"
                        />
                      </div>
                      <div className="cms-field">
                        <label>Select File</label>
                        <input
                          type="file"
                          ref={docFileRef}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setNewDoc((prev) => ({ ...prev, file, title: prev.title || file.name }));
                            }
                          }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cms-btn cms-btn-primary"
                      style={{ fontSize: 13, padding: "7px 16px" }}
                      onClick={async () => {
                        if (!newDoc.file) {
                          notify("Please select a file to upload.", "error");
                          return;
                        }
                        const targetStaffId = profileData.id || profileData.staffId || profileData.facultyId || getAuthUser()?.staffId || getAuthUser()?.id;
                        if (!targetStaffId) {
                          notify("Staff record not resolved. Please reload.", "error");
                          return;
                        }
                        try {
                          const docType = newDoc.type || "Aadhaar Card Copy";
                          const formData = new FormData();
                          formData.append("file", newDoc.file);
                          formData.append("documentType", docType);
                          const upRes = await apiClient.post(apiEndpoints.faculty.uploadDocument(targetStaffId), formData, {
                            headers: { "Content-Type": "multipart/form-data" },
                          });
                          const upData = upRes?.data?.data || upRes?.data;
                          const serverDocs = Array.isArray(upData?.documentsList || upData?.documents)
                            ? (upData.documentsList || upData.documents)
                            : safeDocuments;
                          const updatedProfile = {
                            ...profileData,
                            documents: serverDocs,
                            documentsList: serverDocs,
                            ...(upData?.profileCompletionPercentage !== undefined ? { profileCompletionPercentage: upData.profileCompletionPercentage, profileCompletion: upData.profileCompletionPercentage } : {}),
                            ...(upData?.profileStatus ? { profileStatus: upData.profileStatus } : {}),
                          };
                          setProfileData(updatedProfile);
                          persistStaffProfile(updatedProfile);
                          setNewDoc({ type: "Aadhaar Card Copy", title: "", file: null });
                          if (docFileRef.current) docFileRef.current.value = "";
                          notify("Document uploaded successfully!");
                        } catch (e) {
                          const msg = e?.response?.data?.message || e?.response?.data?.Message || e?.message || "Failed to upload document.";
                          notify(msg, "error");
                        }
                      }}
                    >
                      + Upload Document
                    </button>
                  </div>
                )}

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
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div className="sp-preview-subcard-title">Document {idx + 1}</div>
                        {editingSection === "documents" && (
                          <button
                            type="button"
                            className="cms-action-btn"
                            style={{ color: "var(--cms-red)" }}
                            onClick={() => handleRemoveDocumentRecord(doc)}
                            title="Delete Document"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>
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
                          <div className="sp-preview-label">STATUS</div>
                          <div className="sp-preview-value">
                            <span className="cms-badge cms-badge-active" style={{ fontSize: 11, minHeight: 20 }}>
                              {doc.status || "Verified"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </section>

              {/* Bottom Actions for Step 6 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 24,
                  paddingTop: 18,
                  borderTop: "1px solid var(--cms-border)",
                }}
              >
                <button
                  type="button"
                  className="sp-btn-prev"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "0 22px",
                    height: "38px",
                    fontWeight: 600,
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: "#ffffff",
                    border: "1px solid var(--cms-border, #cbd5e1)",
                    color: "var(--cms-text, #1e293b)",
                  }}
                  onClick={() => setProfileStep(5)}
                >
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
        </div>
      </div>
    
      {/* Profile Submission Success Modal */}
      {showSuccessModal && (
        <div
          className="sp-modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "36px 30px",
              maxWidth: "460px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              animation: "fadeIn 0.2s ease-out"
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "#ecfdf5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              <CheckCircle2 size={36} strokeWidth={2.2} />
            </div>
            <h3 style={{ margin: "0 0 10px", fontSize: "21px", fontWeight: 700, color: "#0f172a" }}>
              Official Appointment &amp; Offer Letter Dispatched!
            </h3>
            
            {/* Registered Email Delivery Pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "600",
                margin: "0 auto 16px",
                maxWidth: "100%",
                wordBreak: "break-all"
              }}
            >
              <Mail size={15} />
              <span>Sent to: {profileData?.email || getAuthUser()?.email || "registered email"}</span>
            </div>

            <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#475569", lineHeight: 1.6 }}>
              Your official appointment and offer letter has been generated from the institutional template and sent to your registered email: <strong style={{ color: "#0f172a" }}>{profileData?.email || getAuthUser()?.email || "your registered email"}</strong>.
              <br /><br />
              Please relogin to access your complete Staff Portal with your assigned classes, subjects, and timetable.
            </p>

            <button
              type="button"
              className="cms-btn cms-btn-primary"
              style={{
                width: "100%",
                padding: "13px 20px",
                fontSize: "15px",
                fontWeight: 600,
                borderRadius: "10px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "var(--cms-primary, #355e3b)",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(53, 94, 59, 0.25)"
              }}
              onClick={() => {
                clearAuthSession();
                window.location.href = "/login";
              }}
            >
              <span>Go to Login &amp; Access Portal</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Profile Submission Sent for Admin Approval Modal */}
      {showPendingApprovalModal && (
        <div
          className="sp-modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "36px 30px",
              maxWidth: "480px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              animation: "fadeIn 0.2s ease-out"
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "#fef3c7",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              <Clock size={36} strokeWidth={2.2} />
            </div>
            <h3 style={{ margin: "0 0 10px", fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>
              Submitted for Admin Approval
            </h3>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#334155",
                padding: "16px",
                borderRadius: "12px",
                fontSize: "14px",
                lineHeight: "1.6",
                textAlign: "left",
                margin: "0 0 24px"
              }}
            >
              Your details have been submitted successfully. Your request has been sent to the Admin for approval. Once your request is approved, your offer letter will be generated and sent to your registered email address.
            </div>

            <button
              type="button"
              className="cms-btn cms-btn-primary"
              style={{
                width: "100%",
                padding: "12px 20px",
                fontSize: "15px",
                fontWeight: 600,
                borderRadius: "10px",
                background: "var(--cms-primary, #355e3b)",
                color: "#ffffff",
                border: "none",
                cursor: "pointer"
              }}
              onClick={() => {
                clearAuthSession();
                window.location.href = "/login";
              }}
            >
              Go to Login &amp; Access Portal
            </button>
          </div>
        </div>
      )}

      {/* Profile Incomplete (Under 50%) Guidance Modal */}
      {showIncompleteModal && (
        <div
          className="sp-modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "20px"
          }}
          onClick={() => setShowIncompleteModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "32px 28px",
              maxWidth: "460px",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              animation: "fadeIn 0.2s ease-out"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#fef3c7",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              <AlertTriangle size={28} strokeWidth={2.2} />
            </div>

            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
              Submission Incomplete
            </h3>

            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
              Institutional onboarding bylaws require a minimum of <strong>50% profile completion</strong> before official submission and Offer Letter generation.
            </p>

            {/* Visual Progress Bar Card */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "22px",
                textAlign: "left"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>Current Progress</span>
                <span style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: profileCompletion >= 50 ? "var(--cms-primary, #355e3b)" : "#d97706"
                }}>
                  {profileCompletion}% / 50%
                </span>
              </div>
              <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
                <div
                  style={{
                    width: `${Math.min(profileCompletion, 100)}%`,
                    height: "100%",
                    background: profileCompletion >= 50 ? "var(--cms-primary, #355e3b)" : "#f59e0b",
                    borderRadius: "4px",
                    transition: "width 0.3s ease"
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>
                <span>0%</span>
                <span style={{ fontWeight: 700, color: "#d97706" }}>▲ 50% Required</span>
                <span>100%</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                style={{ flex: 1, padding: "10px", fontSize: "13px" }}
                onClick={() => setShowIncompleteModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                style={{
                  flex: 2,
                  padding: "10px",
                  fontSize: "13px",
                  fontWeight: 700,
                  borderRadius: "8px"
                }}
                onClick={() => {
                  setShowIncompleteModal(false);
                  setProfileStep(2); // Jump to Bank Details
                }}
              >
                Complete Details &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

</div>
  );
}

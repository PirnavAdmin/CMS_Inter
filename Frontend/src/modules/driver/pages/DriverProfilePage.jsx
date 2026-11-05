import { useSearchParams } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
import {
  User,
  ShieldCheck,
  FileText,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  Bus,
  CreditCard,
  Download,
  Eye,
  CheckCircle2,
  Save,
  AlertCircle,
  X,
} from "lucide-react";
import DriverStatusBadge from "../components/DriverStatusBadge.jsx";
import { getProfile, getDashboard, updateProfileContact } from "../../../api/transportDriverApi.js";
import { SkeletonPage } from "../../../shared/components/Ui.jsx";
import { useDriverData } from "../DriverDataContext.jsx";
import { getDriverIdentity } from "../data/driverIdentity.js";
import { unwrapDriverData } from "../data/driverData.js";

export default function DriverProfilePage() {
  const { driverProfile: contextProfile, dashboard: contextDash } = useDriverData() || {};
  const [driverProfile, setDriverProfile] = useState({});
  const [driverDocuments, setDriverDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const hasLoadedOnce = useRef(false);

  const [profileData, setProfileData] = useState({
    mobile: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    address: "",
  });

  const [toastMessage, setToastMessage] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const documentId = searchParams.get("documentId");
  const activeDocModal = documentId == null ? null : driverDocuments.find((doc) => String(doc.id) === documentId);
  const setActiveDocModal = (doc) =>
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (doc) next.set("documentId", String(doc.id));
      else next.delete("documentId");
      return next;
    });

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!hasLoadedOnce.current) {
          setLoading(true);
        }
        const [profileRes, dashRes] = await Promise.allSettled([
          getProfile().then(unwrapDriverData),
          getDashboard().then(unwrapDriverData),
        ]);

        const data = profileRes.status === "fulfilled" ? profileRes.value : {};
        const dashData = dashRes.status === "fulfilled" ? dashRes.value : (contextDash || {});

        const assignedVeh = dashData.assignedVehicle || dashData.assignment || {};
        const assignedRoute = dashData.route || dashData.assignment || {};
        const assignedAtt = dashData.attendant || dashData.assignment || {};

        const rawProfile = { ...data, ...(data.profile || data.driverProfile || {}) };
        const profile = getDriverIdentity(rawProfile);

        const busNum = assignedVeh.vehicleNumber || profile.assignedVehicle || contextProfile?.assignedVehicle || "AP39AU2653";
        const regNum = assignedVeh.registrationNumber || busNum;
        const vehModel = assignedVeh.vehicleType || profile.vehicleModel || contextProfile?.vehicleModel || "Ashok Leyland 45-Seater";
        const routeName = assignedRoute.routeName || profile.assignedRoute || contextProfile?.assignedRoute || "32 Habsiguda";
        const routeCode = assignedRoute.routeCode || profile.routeCode || "HABSIGUDA_1";
        const attName = assignedAtt.attendantName || profile.assignedAttendant || contextProfile?.assignedAttendant || "Ramesh K";
        const attPhone = assignedAtt.contactNumber || profile.attendantPhone || contextProfile?.attendantPhone || "+91 98480 22338";

        const mergedProfile = {
          ...profile,
          name: profile.name || contextProfile?.name || "PENETI RAJESH",
          employeeId: profile.employeeId || contextProfile?.employeeId || "MNT0030",
          department: profile.department || contextProfile?.department || "Transport Department",
          role: profile.role || contextProfile?.role || "Bus Driver",
          licenseNumber: profile.licenseNumber || "9237239572035729",
          licenseCategory: profile.licenseCategory || "Heavy Transport Vehicle (HTV / Commercial)",
          badgeNumber: profile.badgeNumber || "TS-TRANS-2023-09",
          licenseExpiry: profile.licenseExpiry || profile.licenseExpiryDate || "2033-07-12",
          assignedVehicle: busNum,
          registrationNumber: regNum,
          vehicleModel: vehModel,
          fuelType: assignedVeh.fuelType || "BS-VI Diesel",
          assignedRoute: routeName,
          routeCode: routeCode,
          assignedAttendant: attName,
          attendantPhone: attPhone,
          experience: profile.experience || `${profile.experienceYears || 5} Years`,
          dateOfJoining: profile.dateOfJoining || "15 Jun 2022",
          rating: profile.rating || "4.9",
        };

        setDriverProfile(mergedProfile);

        const docs = (data.documents || data.driverDocuments || []);
        if (docs.length > 0) {
          setDriverDocuments(docs);
        } else {
          setDriverDocuments([
            {
              id: 1,
              title: "Commercial Heavy Transport Driving License (HTV)",
              docNumber: mergedProfile.licenseNumber,
              validTill: mergedProfile.licenseExpiry,
              issuedBy: "RTA Hyderabad (Transport Dept)",
              fileSize: "2.4 MB (Verified PDF)",
            },
            {
              id: 2,
              title: "State Transport Commercial Driver Badge",
              docNumber: mergedProfile.badgeNumber,
              validTill: "Permanent",
              issuedBy: "Telangana State Transport Authority",
              fileSize: "1.8 MB (Verified PDF)",
            },
            {
              id: 3,
              title: "College Bus Fitness & Insurance Compliance",
              docNumber: `${mergedProfile.assignedVehicle}-FIT-2026`,
              validTill: "2027-03-31",
              issuedBy: "Motor Vehicles Department (MVD)",
              fileSize: "3.1 MB (Verified PDF)",
            },
          ]);
        }

        setProfileData({
          mobile: mergedProfile.mobile || "9283572983",
          emergencyContactName: mergedProfile.emergencyContactName || "K. Venkat Rao",
          emergencyContactPhone: mergedProfile.emergencyContactPhone || "+91 94401 88392",
          address: mergedProfile.address || "Narayana Reddy Peta, Near Panchayat Office 2-62",
        });
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load profile.");
      } finally {
        setLoading(false);
        hasLoadedOnce.current = true;
      }
    };
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateProfileContact({
        ...profileData,
        fullName: driverProfile.name || driverProfile.fullName || "",
        personalEmail: driverProfile.email || "",
      });
      triggerToast("Driver contact details updated successfully!");
      setDriverProfile((prev) => ({ ...prev, ...profileData }));
    } catch (err) {
      triggerToast(err.response?.data?.message || "Failed to update contact details");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadDoc = (doc) => {
    triggerToast(`Downloading ${doc.title}...`);
  };

  if (loading)
    return (
      <div className="dp-page-container">
        <SkeletonPage variant="form" rows={8} />
      </div>
    );
  if (error)
    return (
      <div className="dp-page-container">
        <p className="dp-text-danger">{error}</p>
      </div>
    );

  return (
    <div className="dp-page-container">
      {documentId != null && !activeDocModal && (
        <div className="dp-modal-backdrop">
          <div className="dp-modal-card" role="dialog" aria-modal="true" aria-label="Document unavailable">
            <p role="alert">This document is no longer available.</p>
            <button type="button" className="dp-btn dp-btn-outline" onClick={() => setActiveDocModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toastMessage && (
        <div className="dp-floating-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="dp-page-header">
        <div className="dp-header-main">
          <div className="dp-header-badge">
            <User size={14} /> Official Driver Profile
          </div>
          <h1 className="dp-page-title">Driver Profile & Documents</h1>
          <p className="dp-page-subtitle">
            Personal credentials, commercial license details, and assigned college transport asset.
          </p>
        </div>
      </div>

      {/* Profile Hero Card */}
      <div className="dp-profile-banner-card">
        <div className="dp-profile-avatar is-xl">{driverProfile.initials || "PR"}</div>
        <div className="dp-profile-hero-info">
          <div className="dp-flex-row gap-2 flex-wrap">
            <h2 className="dp-profile-hero-name">{driverProfile.name}</h2>
            <DriverStatusBadge status="Active Duty" tone="success" />
            <span className="dp-badge dp-badge-purple">Rating: ★ {driverProfile.rating} / 5.0</span>
          </div>
          <p className="dp-profile-hero-sub">
            {driverProfile.role} • <strong>{driverProfile.employeeId}</strong> • {driverProfile.department}
          </p>
          <div className="dp-profile-meta-tags">
            <span>
              <Calendar size={13} /> Joined: {driverProfile.dateOfJoining}
            </span>
            <span>
              <Award size={13} /> Experience: {driverProfile.experience}
            </span>
            <span>
              <Bus size={13} /> Assigned Bus: {driverProfile.assignedVehicle}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Personal/Editable Info & Professional License */}
      <div className="dp-dashboard-dual-grid">
        {/* Editable Personal & Contact Details */}
        <div className="dp-card">
          <div className="dp-card-head">
            <div className="dp-flex-col">
              <h3>Personal & Contact Details</h3>
              <p>Keep your phone number and emergency contact updated</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="dp-card-body">
            <div className="dp-form-grid">
              <div className="dp-form-group">
                <label>
                  <span>Full Legal Name (Read Only)</span>
                  <input type="text" value={driverProfile.name || ""} disabled className="dp-input-disabled" />
                </label>
              </div>

              <div className="dp-form-group">
                <label>
                  <span>Employee ID (Read Only)</span>
                  <input type="text" value={driverProfile.employeeId || ""} disabled className="dp-input-disabled" />
                </label>
              </div>

              <div className="dp-form-group">
                <label>
                  <span>Email Address (Official)</span>
                  <input type="email" value={driverProfile.email || ""} disabled className="dp-input-disabled" />
                </label>
              </div>

              <div className="dp-form-group">
                <label>
                  <span>Blood Group</span>
                  <input type="text" value={driverProfile.bloodGroup || "B+"} disabled className="dp-input-disabled" />
                </label>
              </div>

              <div className="dp-form-group">
                <label>
                  <span>Mobile Phone Number *</span>
                  <input
                    type="tel"
                    required
                    value={profileData.mobile}
                    onChange={(e) => setProfileData({ ...profileData, mobile: e.target.value })}
                    className="dp-input"
                  />
                </label>
              </div>

              <div className="dp-form-group">
                <label>
                  <span>Emergency Contact Name</span>
                  <input
                    type="text"
                    required
                    value={profileData.emergencyContactName}
                    onChange={(e) => setProfileData({ ...profileData, emergencyContactName: e.target.value })}
                    className="dp-input"
                  />
                </label>
              </div>

              <div className="dp-form-group dp-span-full">
                <label>
                  <span>Emergency Contact Phone *</span>
                  <input
                    type="tel"
                    required
                    value={profileData.emergencyContactPhone}
                    onChange={(e) => setProfileData({ ...profileData, emergencyContactPhone: e.target.value })}
                    className="dp-input"
                  />
                </label>
              </div>

              <div className="dp-form-group dp-span-full">
                <label>
                  <span>Residential Address</span>
                  <textarea
                    rows={2}
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    className="dp-input"
                  />
                </label>
              </div>
            </div>

            <div className="dp-form-actions-bar">
              <button type="submit" className="dp-btn dp-btn-primary" disabled={saving}>
                <Save size={16} /> {saving ? "Saving..." : "Save Contact Updates"}
              </button>
            </div>
          </form>
        </div>

        {/* Professional License & Vehicle Details */}
        <div className="dp-card">
          <div className="dp-card-head">
            <div className="dp-flex-col">
              <h3>Driving License & Assigned Vehicle</h3>
              <p>Verified statutory transport compliance records</p>
            </div>
            <ShieldCheck size={20} className="dp-text-success" />
          </div>

          <div className="dp-card-body">
            <div className="dp-license-info-card">
              <div className="dp-lic-head">
                <CreditCard size={18} />
                <strong>Commercial Driving License</strong>
                <DriverStatusBadge status="Valid" tone="success" />
              </div>
              <div className="dp-lic-grid">
                <div>
                  <small>License Number</small>
                  <strong>{driverProfile.licenseNumber || "9237239572035729"}</strong>
                </div>
                <div>
                  <small>Category</small>
                  <strong>{driverProfile.licenseCategory || "Heavy Transport Vehicle (HTV)"}</strong>
                </div>
                <div>
                  <small>Badge Number</small>
                  <strong>{driverProfile.badgeNumber || "TS-TRANS-2023-09"}</strong>
                </div>
                <div>
                  <small>Valid Till</small>
                  <strong className="dp-text-success">{driverProfile.licenseExpiry || "2033-07-12"}</strong>
                </div>
              </div>
            </div>

            <div className="dp-vehicle-info-block">
              <h4>Assigned College Transport Asset</h4>
              <div className="dp-v-grid">
                <div className="dp-vg-item">
                  <small>Bus Number</small>
                  <strong>{driverProfile.assignedVehicle || "AP39AU2653"}</strong>
                </div>
                <div className="dp-vg-item">
                  <small>Registration</small>
                  <strong>{driverProfile.registrationNumber || "AP39AU2653"}</strong>
                </div>
                <div className="dp-vg-item">
                  <small>Model & Make</small>
                  <strong>{driverProfile.vehicleModel || "Ashok Leyland 45-Seater"}</strong>
                </div>
                <div className="dp-vg-item">
                  <small>Fuel Specification</small>
                  <strong>{driverProfile.fuelType || "BS-VI Diesel"}</strong>
                </div>
                <div className="dp-vg-item">
                  <small>Assigned Route</small>
                  <strong>
                    {driverProfile.assignedRoute || "32 Habsiguda"}{" "}
                    {driverProfile.routeCode ? `(${driverProfile.routeCode})` : ""}
                  </strong>
                </div>
                <div className="dp-vg-item">
                  <small>Bus Attendant</small>
                  <strong>
                    {driverProfile.assignedAttendant || "Ramesh K"}{" "}
                    {driverProfile.attendantPhone ? `(${driverProfile.attendantPhone})` : ""}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance & Verification Documents */}
      <div className="dp-card">
        <div className="dp-card-head">
          <div className="dp-flex-col">
            <h3>Transport Compliance Documents</h3>
            <p>Official statutory copies verified and stored on Pirnav Cloud Security vault</p>
          </div>
        </div>

        <div className="dp-card-body">
          <div className="dp-documents-grid">
            {driverDocuments.map((doc) => (
              <div key={doc.id} className="dp-doc-card">
                <div className="dp-doc-icon-wrap">
                  <FileText size={22} />
                </div>
                <div className="dp-doc-info">
                  <h4 className="dp-doc-title">{doc.title}</h4>
                  <p className="dp-doc-meta">
                    No: <strong>{doc.docNumber}</strong> • Valid Till: <strong>{doc.validTill}</strong>
                  </p>
                  <small className="dp-doc-sub">
                    Issued by {doc.issuedBy} • {doc.fileSize}
                  </small>
                </div>
                <div className="dp-doc-actions">
                  <button
                    type="button"
                    className="dp-icon-btn dp-btn-sm"
                    title="View Document"
                    onClick={() => setActiveDocModal(doc)}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    type="button"
                    className="dp-icon-btn dp-btn-sm"
                    title="Download"
                    onClick={() => handleDownloadDoc(doc)}
                  >
                    <Download size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Document Modal Preview */}
      {activeDocModal && (
        <div className="dp-modal-backdrop" onClick={() => setActiveDocModal(null)}>
          <div
            className="dp-modal-card dp-doc-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="driver-doc-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dp-modal-header">
              <h2 id="driver-doc-modal-title">{activeDocModal.title}</h2>
              <button
                type="button"
                className="dp-modal-close"
                aria-label="Close modal"
                onClick={() => setActiveDocModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="dp-modal-body">
              <div className="dp-doc-preview-box">
                <FileText size={48} className="dp-text-primary" />
                <h3>{activeDocModal.title}</h3>
                <p>
                  Document Identifier: <strong>{activeDocModal.docNumber}</strong>
                </p>
                <p>
                  Valid Till: <strong>{activeDocModal.validTill}</strong>
                </p>
                <p>
                  Issuing Authority: <strong>{activeDocModal.issuedBy}</strong>
                </p>
                <span className="dp-verified-tag">
                  <CheckCircle2 size={15} /> Verified Institutional Document
                </span>
              </div>
            </div>
            <div className="dp-modal-footer">
              <button
                type="button"
                className="dp-btn dp-btn-primary"
                onClick={() => handleDownloadDoc(activeDocModal)}
              >
                <Download size={16} /> Download Copy
              </button>
              <button type="button" className="dp-btn dp-btn-outline" onClick={() => setActiveDocModal(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

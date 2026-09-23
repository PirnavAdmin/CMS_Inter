import React, { useState, useEffect } from "react";
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
import { getProfile, updateProfileContact } from "../../../api/transportDriverApi.js";

export default function DriverProfilePage() {
  const [driverProfile, setDriverProfile] = useState({});
  const [driverDocuments, setDriverDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    mobile: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    address: "",
  });

  const [toastMessage, setToastMessage] = useState("");
  const [activeDocModal, setActiveDocModal] = useState(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await getProfile();
        const data = res.data || res;
        const profile = data.profile || data || {};
        setDriverProfile(profile);
        setDriverDocuments(data.documents || data.driverDocuments || []);
        setProfileData({
          mobile: profile.mobile || "",
          emergencyContactName: profile.emergencyContactName || "",
          emergencyContactPhone: profile.emergencyContactPhone || "",
          address: profile.address || "",
        });
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateProfileContact(profileData);
      triggerToast("Driver contact details updated successfully!");
      setDriverProfile((prev) => ({ ...prev, ...profileData }));
    } catch (err) {
      triggerToast("Failed to update contact details");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadDoc = (doc) => {
    triggerToast(`Downloading ${doc.title}...`);
  };

  if (loading) return <div className="dp-page-container"><p>Loading Profile Data...</p></div>;
  if (error) return <div className="dp-page-container"><p className="dp-text-danger">{error}</p></div>;

  return (
    <div className="dp-page-container">
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
            Personal credentials, license details, and assigned vehicle information.
          </p>
        </div>
      </div>

      {/* Profile Hero Card */}
      <div className="dp-profile-banner-card">
        <div className="dp-profile-avatar is-xl">{driverProfile.initials}</div>
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
            <span><Calendar size={13} /> Joined: {driverProfile.dateOfJoining}</span>
            <span><Award size={13} /> Experience: {driverProfile.experience}</span>
            <span><Bus size={13} /> Assigned Bus: {driverProfile.assignedVehicle}</span>
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
                  <input type="text" value={driverProfile.name} disabled className="dp-input-disabled" />
                </label>
              </div>

              <div className="dp-form-group">
                <label>
                  <span>Employee ID (Read Only)</span>
                  <input type="text" value={driverProfile.employeeId} disabled className="dp-input-disabled" />
                </label>
              </div>

              <div className="dp-form-group">
                <label>
                  <span>Email Address (Official)</span>
                  <input type="email" value={driverProfile.email} disabled className="dp-input-disabled" />
                </label>
              </div>

              <div className="dp-form-group">
                <label>
                  <span>Blood Group</span>
                  <input type="text" value={driverProfile.bloodGroup} disabled className="dp-input-disabled" />
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
              <button type="submit" className="dp-btn dp-btn-primary">
                <Save size={16} /> Save Contact Updates
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
                  <strong>{driverProfile.licenseNumber}</strong>
                </div>
                <div>
                  <small>Category</small>
                  <strong>{driverProfile.licenseCategory}</strong>
                </div>
                <div>
                  <small>Badge Number</small>
                  <strong>{driverProfile.badgeNumber}</strong>
                </div>
                <div>
                  <small>Valid Till</small>
                  <strong className="dp-text-success">{driverProfile.licenseExpiry}</strong>
                </div>
              </div>
            </div>

            <div className="dp-vehicle-info-block">
              <h4>Assigned College Transport Asset</h4>
              <div className="dp-v-grid">
                <div className="dp-vg-item">
                  <small>Bus Number</small>
                  <strong>{driverProfile.assignedVehicle}</strong>
                </div>
                <div className="dp-vg-item">
                  <small>Registration</small>
                  <strong>{driverProfile.registrationNumber}</strong>
                </div>
                <div className="dp-vg-item">
                  <small>Model & Make</small>
                  <strong>{driverProfile.vehicleModel}</strong>
                </div>
                <div className="dp-vg-item">
                  <small>Fuel Specification</small>
                  <strong>{driverProfile.fuelType}</strong>
                </div>
                <div className="dp-vg-item">
                  <small>Assigned Route</small>
                  <strong>{driverProfile.assignedRoute} ({driverProfile.routeCode})</strong>
                </div>
                <div className="dp-vg-item">
                  <small>Bus Attendant</small>
                  <strong>{driverProfile.assignedAttendant} ({driverProfile.attendantPhone})</strong>
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
            <p>Official copies stored on Pirnav Cloud Security vault</p>
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
                    title="Download Document"
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

      {/* Document View Modal */}
      {activeDocModal && (
        <div className="dp-modal-backdrop" onClick={() => setActiveDocModal(null)}>
          <div className="dp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="dp-modal-header">
              <div>
                <h3 className="dp-modal-title">{activeDocModal.title}</h3>
                <p className="dp-modal-subtitle">Document ID: {activeDocModal.docNumber}</p>
              </div>
              <button type="button" className="dp-modal-close" onClick={() => setActiveDocModal(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="dp-modal-body">
              <div className="dp-doc-preview-box">
                <FileText size={48} className="dp-text-primary" />
                <h4>{activeDocModal.title}</h4>
                <p>Issued by: <strong>{activeDocModal.issuedBy}</strong></p>
                <p>Status: <span className="dp-badge dp-badge-success">{activeDocModal.status}</span></p>
                <p>Valid Through: <strong>{activeDocModal.validTill}</strong></p>
                <div className="dp-doc-verified-stamp">
                  <ShieldCheck size={20} /> Verified by Pirnav Transport Authority
                </div>
              </div>
            </div>
            <div className="dp-modal-footer">
              <button type="button" className="dp-btn dp-btn-outline" onClick={() => setActiveDocModal(null)}>
                Close
              </button>
              <button
                type="button"
                className="dp-btn dp-btn-primary"
                onClick={() => {
                  handleDownloadDoc(activeDocModal);
                  setActiveDocModal(null);
                }}
              >
                <Download size={15} /> Download Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


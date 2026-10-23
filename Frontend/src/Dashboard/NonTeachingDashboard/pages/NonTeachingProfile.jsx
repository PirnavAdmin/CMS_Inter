import React, { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  MapPin,
  Heart,
  ShieldCheck,
  Award,
  Clock,
  Save,
  CheckCircle2,
  Edit3,
} from "lucide-react";
import { nonTeachingService } from "../services/nonTeachingService.js";

export default function NonTeachingProfile() {
  const [profile, setProfile] = useState(() => nonTeachingService.getProfile());
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    mobile: profile.mobile && profile.mobile !== "--" ? profile.mobile : "",
    emergencyContact: profile.emergencyContact && profile.emergencyContact !== "--" ? profile.emergencyContact : "",
    address: profile.address && profile.address !== "--" ? profile.address : "",
  });
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updated = nonTeachingService.updateProfile(formData);
    setProfile(updated);
    setIsEditing(false);
    showToast("Contact details updated successfully.");
  };

  const cleanName = (profile.displayName || profile.name || "Non-Teaching Staff")
    .replace(/\bDemo\s*/gi, "")
    .trim() || "Non-Teaching Staff";

  const initials = cleanName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {toastMessage && (
        <div className="cms-toast-banner cms-toast-success" role="alert" style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}>
          <CheckCircle2 size={16} /> {toastMessage}
        </div>
      )}

      {/* Profile Header Hero */}
      <section className="nts-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--nts-primary), #2563eb)",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontSize: 22,
                fontWeight: 800,
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--nts-text)" }}>
                  {cleanName}
                </h2>
                <span className="nts-status-badge present">
                  <ShieldCheck size={12} /> {profile.status || "Active Employee"}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--nts-muted)", marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span><strong>ID:</strong> {profile.employeeId}</span>
                <span>•</span>
                <span>{profile.designationName || profile.designation}</span>
                <span>•</span>
                <span>{profile.departmentName || profile.department}</span>
                <span>•</span>
                <span>{profile.campusName}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="nts-action-btn"
            style={{ backgroundColor: isEditing ? "var(--nts-subtle)" : "var(--nts-primary)", color: isEditing ? "var(--nts-text)" : "#ffffff", border: "none" }}
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit3 size={14} /> {isEditing ? "Cancel Editing" : "Edit Contact Info"}
          </button>
        </div>
      </section>

      {/* Edit Form Modal/Drawer if editing */}
      {isEditing && (
        <section className="nts-card">
          <div className="nts-card-head">
            <h3><Edit3 size={15} /> Update Personal Contact Information</h3>
          </div>
          <form onSubmit={handleSave} className="nts-card-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              <div className="nts-form-group">
                <label>Mobile Number</label>
                <input
                  type="text"
                  className="nts-form-control"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  required
                />
              </div>
              <div className="nts-form-group">
                <label>Emergency Contact</label>
                <input
                  type="text"
                  className="nts-form-control"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  required
                />
              </div>
              <div className="nts-form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Residential Address</label>
                <input
                  type="text"
                  className="nts-form-control"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
              <button type="button" className="nts-action-btn" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="nts-punch-btn in" style={{ padding: "8px 16px" }}>
                <Save size={14} /> Save Changes
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Information Cards Grid */}
      <div className="nts-two-col">
        {/* Employment & Service Records */}
        <div className="nts-card">
          <div className="nts-card-head">
            <h3><Briefcase size={16} style={{ color: "var(--nts-primary)" }} /> Employment & Role Details</h3>
          </div>
          <div className="nts-card-body" style={{ gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <span className="nts-kpi-label">Employee ID</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.employeeId}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Department</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.departmentName || profile.department}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Designation</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.designationName || profile.designation}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Reporting Officer</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.reportingManager}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Date of Joining</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.joiningDate}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Employment Type</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.employmentType}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Campus Branch</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.campusName}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Standard Working Shift</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.shift}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Personal & Contact Details */}
        <div className="nts-card">
          <div className="nts-card-head">
            <h3><User size={16} style={{ color: "#2563eb" }} /> Personal & Contact Details</h3>
          </div>
          <div className="nts-card-body" style={{ gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <span className="nts-kpi-label">Official Email</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.email}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Mobile Contact</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.mobile}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Date of Birth</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.dob}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Blood Group</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.bloodGroup}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span className="nts-kpi-label">Emergency Contact</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.emergencyContact}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span className="nts-kpi-label">Residential Address</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.address}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span className="nts-kpi-label">Academic Credentials & Qualification</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.qualification}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

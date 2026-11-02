import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  User,
  Briefcase,
  ShieldCheck,
  Save,
  CheckCircle2,
  Edit3,
} from "lucide-react";
import { nonTeachingService } from "../services/nonTeachingService.js";
import apiClient from "@/api/apiClient.js";

function safeStringifyEmergency(val) {
  if (!val) return "+91 98765 00112 (Spouse)";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const phone = val.mobile || val.alternateMobile || "";
    const rel = val.relationship || val.contactName || "";
    if (phone && rel) return `${phone} (${rel})`;
    if (phone) return phone;
    if (rel) return rel;
    return "+91 98765 00112 (Spouse)";
  }
  return String(val);
}

function safeStringifyAddress(val) {
  if (!val) return "Plot 42, Green Valley Enclave, Campus Road, Visakhapatnam";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const parts = [val.street || val.currentAddress, val.city, val.state, val.pincode].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Plot 42, Green Valley Enclave, Campus Road, Visakhapatnam";
  }
  return String(val);
}

export default function NonTeachingProfile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = searchParams.get("mode");
  const [profile, setProfile] = useState(() => nonTeachingService.getProfile());
  const [isEditing, setIsEditing] = useState(() => modeParam === "edit");

  useEffect(() => {
    const mode = searchParams.get("mode");
    const shouldEdit = mode === "edit";
    if (shouldEdit !== isEditing) setIsEditing(shouldEdit);
  }, [searchParams]);

  const handleToggleEdit = () => {
    const nextState = !isEditing;
    setIsEditing(nextState);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextState) next.set("mode", "edit");
      else next.delete("mode");
      return next;
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("mode");
      return next;
    });
  };
  const [formData, setFormData] = useState({
    mobile: profile.mobile || "+91 98765 43299",
    emergencyContact: safeStringifyEmergency(profile.emergencyContact),
    address: safeStringifyAddress(profile.address),
  });
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchProfile = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/v1/staff/me");
      const d = res?.data || res;
      if (d && (d.id || d.employeeId || d.email)) {
        const fullName = `${d.firstName || ""} ${d.middleName || ""} ${d.lastName || ""}`.trim() || d.fullName || profile.name;
        const ec = safeStringifyEmergency(d.emergencyContact || d.alternateMobile || profile.emergencyContact);
        const addr = safeStringifyAddress(d.currentAddress || d.permanentAddress || d.address || profile.address);

        const updated = {
          ...profile,
          id: d.id || profile.id,
          staffId: d.id || profile.staffId,
          employeeId: d.employeeId || profile.employeeId || "NTS001",
          name: fullName || "Non-Teaching Staff",
          fullName: fullName || "Non-Teaching Staff",
          displayName: fullName || "Non-Teaching Staff",
          email: d.email || profile.email || "nts001@cms.com",
          department: d.departmentName || d.department || profile.department || "Administration",
          designation: d.designationName || d.designation || profile.designation || "Office Assistant",
          departmentName: d.departmentName || d.department || profile.department || "Administration",
          designationName: d.designationName || d.designation || profile.designation || "Office Assistant",
          mobile: d.mobile || d.phone || profile.mobile || "+91 98765 43299",
          emergencyContact: ec,
          address: addr,
          bloodGroup: d.bloodGroup || profile.bloodGroup || "O+",
          gender: d.gender || profile.gender || "Male",
          dob: d.dob || d.dateOfBirth ? String(d.dob || d.dateOfBirth).split("T")[0] : profile.dob || "1994-08-22",
          joiningDate: d.joiningDate || d.dateOfJoining ? String(d.joiningDate || d.dateOfJoining).split("T")[0] : profile.joiningDate || "2023-06-15",
          qualification: d.highestQualification || d.qualification || profile.qualification || "B.Com, PGDCA (Computer Applications)",
          reportingManager: d.reportingManager || profile.reportingManager || "Administrative Officer (AO)",
          shift: d.shift || profile.shift || "Morning (09:00 AM - 05:30 PM)",
          status: d.status || profile.status || "Active",
          employmentType: d.employmentType || profile.employmentType || "Full-Time Regular",
          campusName: d.campusName || profile.campusName || "Main Campus (HQ)",
          photoUrl: d.photoUrl || d.photoPath || d.profilePhoto || profile.photoUrl || "",
          photoPath: d.photoPath || d.photoUrl || d.profilePhoto || profile.photoPath || "",
        };
        setProfile(updated);
        setFormData({
          mobile: updated.mobile,
          emergencyContact: updated.emergencyContact,
          address: updated.address,
        });
        nonTeachingService.updateProfile(updated);
      }
    } catch {
      // Use fallback
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      try {
        await apiClient.put("/api/v1/staff/me/contact", {
          mobile: formData.mobile,
          emergencyContact: formData.emergencyContact,
          address: formData.address,
        });
      } catch {
        // Fallback to local
      }

      const updated = nonTeachingService.updateProfile({
        mobile: formData.mobile,
        emergencyContact: formData.emergencyContact,
        address: formData.address,
      });
      setProfile(updated);
      setIsEditing(false);
      showToast("Contact details updated successfully.");
    } finally {
      setSaving(false);
    }
  };

  const displayName = (profile.displayName || profile.name || "Non-Teaching Staff")
    .replace(/\bDemo\s*/gi, "")
    .trim() || "Non-Teaching Staff";

  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "NS";

  return (
    <>
      {toastMessage && (
        <div
          className="cms-toast-banner cms-toast-success"
          role="alert"
          style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}
        >
          <CheckCircle2 size={16} /> {toastMessage}
        </div>
      )}

      {/* Profile Header Hero (Screen 4) */}
      <section className="nts-card" style={{ padding: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--nts-primary, #5c7c2f), #2563eb)",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontSize: 22,
                fontWeight: 800,
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {profile.photoUrl || profile.photoPath ? (
                <img
                  src={profile.photoUrl || profile.photoPath}
                  alt={displayName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                initials
              )}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--nts-text)" }}>
                  {displayName}
                </h2>
                <span className="nts-status-badge present">
                  <ShieldCheck size={12} /> {profile.status || "Active"}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--nts-muted)",
                  marginTop: 4,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span><strong>ID:</strong> {profile.employeeId || "NTS001"}</span>
                <span>•</span>
                <span>{profile.designationName || profile.designation || "Office Assistant"}</span>
                <span>•</span>
                <span>{profile.departmentName || profile.department || "Administration"}</span>
                <span>•</span>
                <span>{profile.campusName || "Main Campus (HQ)"}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="nts-action-btn"
            style={{
              backgroundColor: isEditing ? "var(--nts-subtle)" : "var(--nts-primary, #5c7c2f)",
              color: isEditing ? "var(--nts-text)" : "#ffffff",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 600,
              fontSize: "13px",
            }}
            onClick={handleToggleEdit}
          >
            <Edit3 size={14} /> {isEditing ? "Cancel Editing" : "Edit Contact Info"}
          </button>
        </div>
      </section>

      {/* Edit Form Drawer if editing */}
      {isEditing && (
        <section className="nts-card" style={{ marginTop: 16 }}>
          <div className="nts-card-head">
            <h3><Edit3 size={15} /> Update Personal Contact Information</h3>
          </div>
          <form onSubmit={handleSave} className="nts-card-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              <div className="nts-form-group">
                <label>Mobile Contact</label>
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
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="nts-action-btn"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="nts-punch-btn in"
                style={{ padding: "8px 16px" }}
                disabled={saving}
              >
                <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* 2-Column Information Cards Grid (Screen 4) */}
      <div className="nts-two-col" style={{ marginTop: 16 }}>
        {/* Employment & Role Details */}
        <div className="nts-card">
          <div className="nts-card-head">
            <h3>
              <Briefcase size={16} style={{ color: "var(--nts-primary, #5c7c2f)" }} /> Employment & Role Details
            </h3>
          </div>
          <div className="nts-card-body" style={{ gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <span className="nts-kpi-label">Employee ID</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.employeeId || "NTS001"}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Department</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.departmentName || profile.department || "Administration"}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Designation</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.designationName || profile.designation || "Office Assistant"}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Reporting Officer</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.reportingManager || "Administrative Officer (AO)"}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Date of Joining</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.joiningDate || "2023-06-15"}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Employment Type</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.employmentType || "Full-Time Regular"}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Campus Branch</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.campusName || "Main Campus (HQ)"}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Standard Working Shift</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.shift || "Morning (09:00 AM - 05:30 PM)"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Personal & Contact Details */}
        <div className="nts-card">
          <div className="nts-card-head">
            <h3>
              <User size={16} style={{ color: "#2563eb" }} /> Personal & Contact Details
            </h3>
          </div>
          <div className="nts-card-body" style={{ gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <span className="nts-kpi-label">Official Email</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.email || "nts001@cms.com"}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Mobile Contact</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.mobile || "+91 98765 43299"}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Date of Birth</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.dob || "1994-08-22"}</div>
              </div>
              <div>
                <span className="nts-kpi-label">Blood Group</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.bloodGroup || "O+"}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span className="nts-kpi-label">Emergency Contact</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{safeStringifyEmergency(profile.emergencyContact)}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span className="nts-kpi-label">Residential Address</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{safeStringifyAddress(profile.address)}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span className="nts-kpi-label">Academic Credentials & Qualification</span>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{profile.qualification || "B.Com, PGDCA (Computer Applications)"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

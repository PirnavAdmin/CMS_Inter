import { useState, useEffect } from "react";
import { User, Phone, Mail, MapPin, Edit3, Shield, Users, CheckCircle2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useParentPortal, getStoredParentProfile, saveStoredParentProfile } from "../parentData.js";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import "../ParentDashboard.css";

export default function ParentProfilePage() {
  const { parentUser, availableChildren } = useParentPortal();
  const [profile, setProfile] = useState(() => getStoredParentProfile(parentUser?.id));
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [mobileInput, setMobileInput] = useState(profile?.mobile || "");
  const [emailInput, setEmailInput] = useState(profile?.email || "");
  const [addressInput, setAddressInput] = useState(profile?.address || "");
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (parentUser?.id) {
      const p = getStoredParentProfile(parentUser.id);
      setProfile(p);
      setMobileInput(p?.mobile || "");
      setEmailInput(p?.email || "");
      setAddressInput(p?.address || "");
    }
  }, [parentUser?.id]);

  const initials = (profile?.name || "SK")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSaveContact = (e) => {
    e.preventDefault();
    const updated = {
      ...profile,
      mobile: mobileInput.trim(),
      email: emailInput.trim(),
      address: addressInput.trim(),
    };
    setProfile(updated);
    saveStoredParentProfile(updated, parentUser?.id);
    setEditModalOpen(false);
    setToastMessage("Parent contact details updated successfully!");
  };

  return (
    <DashboardLayout
      title="Parent Profile"
      subtitle="Guardian information, emergency contacts, and linked student affiliations"
      breadcrumb={["Parent Portal", "Profile"]}
      actions={
        <button type="button" className="cms-btn cms-btn-primary cms-btn-sm" onClick={() => setEditModalOpen(true)}>
          <Edit3 size={14} /> Edit Contact Info
        </button>
      }
    >
      <div className="parent-dashboard-wrapper">
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />

        {/* Parent Primary Info Card */}
        <div className="parent-card">
          <div className="parent-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: "var(--cms-primary-soft)",
                  color: "var(--cms-primary-dark)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {initials}
              </div>
              <div>
                <h2 style={{ margin: "0 0 4px 0", fontSize: 18, color: "var(--cms-text)" }}>{profile.name}</h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--cms-muted)" }}>{profile.relation}</p>
              </div>
            </div>
            <span className="cms-badge cms-badge-active">Verified Guardian</span>
          </div>
          <div className="parent-card-body">
            <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--cms-muted)", marginBottom: 14 }}>Guardian Contact Details</h3>
            <div className="parent-profile-meta-grid" style={{ marginBottom: 24 }}>
              <div className="parent-meta-item"><span className="parent-meta-label">Primary Mobile</span><span className="parent-meta-val">{profile.mobile}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Alternate Mobile</span><span className="parent-meta-val">{profile.altMobile}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Primary Email</span><span className="parent-meta-val">{profile.email}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Alternate Email</span><span className="parent-meta-val">{profile.altEmail}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Emergency Helpline</span><span className="parent-meta-val" style={{ color: "var(--cms-red)" }}>{profile.emergencyContact}</span></div>
              <div className="parent-meta-item"><span className="parent-meta-label">Aadhaar (Masked)</span><span className="parent-meta-val">{profile.aadhaarMasked}</span></div>
            </div>

            <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--cms-muted)", marginBottom: 10 }}>Residential Address</h3>
            <div style={{ padding: 14, background: "var(--cms-bg)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
              <MapPin size={18} color="var(--cms-primary-dark)" />
              <span>{profile.address}</span>
            </div>
          </div>
        </div>

        {/* Linked Children Cards */}
        <div className="parent-card">
          <div className="parent-card-header">
            <h3 className="parent-card-title">
              <Users size={18} /> Linked Enrolled Children ({availableChildren.length})
            </h3>
          </div>
          <div className="parent-card-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {availableChildren.map((c) => (
                <div key={c.id} style={{ border: "1px solid var(--cms-border)", borderRadius: 12, padding: 14, background: "var(--cms-bg)" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                    <img src={c.avatar} alt={c.name} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} />
                    <div>
                      <strong style={{ fontSize: 14, display: "block" }}>{c.name}</strong>
                      <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>{c.programme} • Roll: {c.roll}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--cms-muted)" }}>Admission: <strong>{c.admissionNo}</strong></div>
                  <div style={{ fontSize: 12.5, color: "var(--cms-muted)" }}>Mentor: <strong>{c.mentor}</strong></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Edit Contact Details Modal */}
        {editModalOpen && (
          <Modal
            title="Edit Contact Information"
            onClose={() => setEditModalOpen(false)}
            size="md"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={() => setEditModalOpen(false)}>Cancel</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={handleSaveContact}>
                  Save Changes
                </button>
              </>
            }
          >
            <form onSubmit={handleSaveContact} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="cms-label" htmlFor="edit-mobile">Primary Mobile Number *</label>
                <input
                  id="edit-mobile"
                  type="text"
                  className="cms-input"
                  value={mobileInput}
                  onChange={(e) => setMobileInput(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="cms-label" htmlFor="edit-email">Email Address *</label>
                <input
                  id="edit-email"
                  type="email"
                  className="cms-input"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="cms-label" htmlFor="edit-address">Residential Address *</label>
                <textarea
                  id="edit-address"
                  className="cms-textarea"
                  rows={3}
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  required
                />
              </div>
            </form>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}

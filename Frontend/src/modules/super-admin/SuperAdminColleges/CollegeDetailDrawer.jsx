import { useState } from "react";
import { Modal } from "@/shared/components/Ui.jsx";
import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";
import { 
  Building2, 
  Layers, 
  UserCheck, 
  CreditCard, 
  MapPin, 
  Mail, 
  Phone, 
  Globe, 
  Calendar, 
  ShieldCheck, 
  AlertTriangle,
  KeyRound,
  ExternalLink
} from "lucide-react";
import "./CollegeDetailDrawer.css";

export default function CollegeDetailDrawer({ 
  college, 
  onClose, 
  onEdit, 
  onStatusToggle,
  onAssignAdmin,
  onResetPassword,
  activeAccountCount = 0,
  plans = []
}) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!college) return null;

  const plan = plans.find((p) => p.name === college.plan) || { name: college.plan || "Free", limit: college.accountLimit || 50, modules: [] };
  const accountsUsed = activeAccountCount;
  const limit = college.accountLimit || plan.limit || 50;
  const usagePercent = limit > 0 ? Math.min(100, Math.round((accountsUsed / limit) * 100)) : 0;

  const tabs = [
    { id: "overview", label: "Overview & Profile", icon: Building2 },
    { id: "campuses", label: "Campuses Roll-Up", icon: MapPin },
    { id: "modules", label: "Module Entitlements", icon: Layers },
    { id: "subscription", label: "Plan & Quota", icon: CreditCard },
    { id: "admins", label: "Administrators", icon: UserCheck },
  ];

  return (
    <Modal
      title={
        <div className="sa-drawer-title-wrap">
          <ThreeDIcon name="campus-configuration" size={24} />
          <div>
            <h3>{college.name}</h3>
            <span className="sa-code-pill">{college.code}</span>
          </div>
        </div>
      }
      onClose={onClose}
      className="sa-detail-drawer-modal"
    >
      <div className="sa-detail-drawer">
        {/* Navigation Tabs */}
        <div className="sa-drawer-tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={`sa-drawer-tab ${activeTab === tab.id ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panes */}
        <div className="sa-drawer-content">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="sa-drawer-pane">
              <div className="sa-overview-header-card">
                <div className="sa-college-avatar">
                  {college.logo ? (
                    <img src={college.logo} alt={college.name} />
                  ) : (
                    <span>{(college.name || "C").slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="sa-overview-title">
                  <h2>{college.name}</h2>
                  <div className="sa-badge-row">
                    <span className={`cms-badge sa-status-badge status-${(college.status || college.collegeStatus || "Active").toLowerCase()}`}>
                      {college.status || college.collegeStatus || "Active"}
                    </span>
                    <span className="cms-badge sa-plan-badge">{college.plan || "Free"} Plan</span>
                  </div>
                </div>
              </div>

              <div className="sa-info-grid">
                <div className="sa-info-item">
                  <div className="sa-info-label"><Mail size={14} /> Official Email</div>
                  <div className="sa-info-value">{college.email || "Not recorded"}</div>
                </div>

                <div className="sa-info-item">
                  <div className="sa-info-label"><Phone size={14} /> Contact Phone</div>
                  <div className="sa-info-value">{college.phone || college.contact || "Not recorded"}</div>
                </div>

                <div className="sa-info-item full">
                  <div className="sa-info-label"><MapPin size={14} /> Head Office / Campus Address</div>
                  <div className="sa-info-value">{college.address || "Not recorded"}</div>
                </div>

                <div className="sa-info-item">
                  <div className="sa-info-label"><Calendar size={14} /> Registered On</div>
                  <div className="sa-info-value">{college.registered || college.createdAt || "Not recorded"}</div>
                </div>

                <div className="sa-info-item">
                  <div className="sa-info-label"><Globe size={14} /> College Domain</div>
                  <div className="sa-info-value">{college.code ? `${college.code.toLowerCase()}.pirnav.edu` : "—"}</div>
                </div>
              </div>

              <div className="sa-drawer-actions-bar">
                <button
                  type="button"
                  className="cms-btn"
                  onClick={() => onEdit(college)}
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  className={`cms-btn ${college.status === "Active" ? "cms-btn-danger" : "cms-btn-primary"}`}
                  onClick={() => onStatusToggle(college)}
                >
                  {college.status === "Active" ? "Suspend / Deactivate College" : "Activate College"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CAMPUSES ROLL-UP */}
          {activeTab === "campuses" && (
            <div className="sa-drawer-pane">
              <div className="sa-hierarchy-notice">
                <ShieldCheck size={18} />
                <div>
                  <strong>Architectural Rule: Campus Management belongs to College Admin</strong>
                  <p>Individual campuses, buildings, classrooms, and timetables are managed directly by the College Admin within their institution portal.</p>
                </div>
              </div>

              <div className="sa-campuses-summary-card">
                <div className="sa-campuses-count-badge">
                  <span>Registered Campuses</span>
                  <strong>{college.campuses && college.campuses !== "-" ? college.campuses : "—"}</strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MODULE ENTITLEMENTS */}
          {activeTab === "modules" && (
            <div className="sa-drawer-pane">
              <div className="sa-pane-intro">
                <h4>Active ERP Modules</h4>
                <p>Features enabled for this college. The College Admin's navigation menu is gated by this configuration.</p>
              </div>

              <div className="sa-modules-pill-grid">
                {[
                  "Students", "Staff", "Attendance", "StaffAttendance", 
                  "Fees", "Examinations", "Timetable", "Transport", 
                  "Hostel", "Payroll", "Certificates"
                ].map((modName) => {
                  const isEnabled = (plan.modules || []).includes(modName) || ["Students", "Staff", "Attendance", "Fees"].includes(modName);
                  return (
                    <div key={modName} className={`sa-mod-pill ${isEnabled ? "enabled" : "disabled"}`}>
                      <span className="sa-mod-dot" />
                      <strong>{modName}</strong>
                      <small>{isEnabled ? "Enabled" : "Locked"}</small>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: PLAN & QUOTA */}
          {activeTab === "subscription" && (
            <div className="sa-drawer-pane">
              <div className="sa-quota-overview">
                <div className="sa-quota-stat-card">
                  <span>Current Subscription</span>
                  <h3>{college.plan || "Free"} Tier</h3>
                  <small>{plan.price > 0 ? `₹${plan.price.toLocaleString("en-IN")}/mo` : "Complimentary tier"}</small>
                </div>

                <div className="sa-quota-stat-card">
                  <span>Renewal Due</span>
                  <h3>{college.renewal || "Annual Free"}</h3>
                  <small>Automatic billing active</small>
                </div>
              </div>

              <div className="sa-quota-gauge-card">
                <div className="sa-gauge-header">
                  <strong>User Account Capacity</strong>
                  <span>{accountsUsed} / {limit} Accounts ({usagePercent}%)</span>
                </div>
                <div className="sa-progress-bar-wrap">
                  <div 
                    className={`sa-progress-bar ${usagePercent >= 90 ? "danger" : usagePercent >= 75 ? "warn" : "ok"}`} 
                    style={{ width: `${usagePercent}%` }} 
                  />
                </div>
                <p className="sa-muted">Counts distinct active login accounts (Students, Faculty, Staff, and Admins).</p>
              </div>
            </div>
          )}

          {/* TAB 5: ADMINISTRATORS */}
          {activeTab === "admins" && (
            <div className="sa-drawer-pane">
              <div className="sa-pane-intro">
                <h4>Designated College Administrators</h4>
                <p>Central administrators holding institutional authority for this college.</p>
              </div>

              <div className="sa-admins-list">
                <div className="sa-admin-row-card">
                  <div className="sa-admin-avatar">
                    <UserCheck size={20} />
                  </div>
                  <div className="sa-admin-meta">
                    <strong>{college.admin || "Primary College Admin"}</strong>
                    <span>{college.email || "admin@" + (college.code || "college").toLowerCase() + ".edu"}</span>
                    <small>Role: College Admin · Full Institution Access</small>
                  </div>
                  <div className="sa-admin-actions">
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      onClick={() => onResetPassword(college)}
                    >
                      <KeyRound size={14} /> Reset Password
                    </button>
                  </div>
                </div>
              </div>

              <div className="sa-drawer-footer-action">
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={() => onAssignAdmin(college.id || college.collegeId)}
                >
                  Assign Additional Admin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

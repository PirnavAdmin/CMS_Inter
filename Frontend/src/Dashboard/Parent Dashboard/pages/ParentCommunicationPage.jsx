import { Users } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { teachersDirectory } from "../parentData.js";
import "../ParentDashboard.css";

export default function ParentCommunicationPage() {
  return (
    <DashboardLayout
      title="Communication"
      subtitle="Connect with class teachers, academic mentors, and college leadership"
      breadcrumb={["Parent Portal", "Communication"]}
    >
      <div className="parent-dashboard-wrapper">
        {/* Teachers Directory Cards */}
        <div className="parent-card">
          <div className="parent-card-header">
            <h3 className="parent-card-title">
              <Users size={18} /> Faculty & Mentor Directory
            </h3>
            <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>Available for parent consultations</span>
          </div>
          <div className="parent-card-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {teachersDirectory.map((tea) => (
                <div key={tea.id} style={{ border: "1px solid var(--cms-border)", borderRadius: 12, padding: 16, background: "var(--cms-bg)" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                    <img src={tea.avatar} alt={tea.name} style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover" }} />
                    <div>
                      <strong style={{ fontSize: 14.5, display: "block" }}>{tea.name}</strong>
                      <span style={{ fontSize: 12.5, color: "var(--cms-muted)" }}>{tea.subject} • {tea.role}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--cms-muted)", marginBottom: 12 }}>
                    Consultation Hours: <strong>{tea.availableHours}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

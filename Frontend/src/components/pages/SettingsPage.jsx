import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ListOrdered, ShieldCheck, ArrowRight, Landmark, FileText, CalendarDays } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import boardAcademicYearImage from "@/assets/settings-3d/board-academic-year.png";
import numberSeriesImage from "@/assets/settings-3d/number-series.png";
import templatesImage from "@/assets/settings-3d/templates.png";
import auditLogsImage from "@/assets/settings-3d/audit-logs.png";
import "./SettingsPage.css";

export default function SettingsPage() {
  const navigate = useNavigate();

  const settingsCards = [
    {
      id: "board-academic-year",
      title: "Board & Academic Year Management",
      description: "Create, edit and manage education boards, board codes, academic years, date ranges and status.",
      icon: Landmark,
      image: boardAcademicYearImage,
      to: "/dashboard/board-academic-year",
      buttonText: "Manage Board & Academic Year",
      primary: true,
    },
    {
      id: "number-series",
      title: "ID & Number Series",
      description: "Configure Employee IDs, Admission Numbers and Roll Number formats.",
      icon: ListOrdered,
      image: numberSeriesImage,
      to: "/dashboard/settings/number-series",
      buttonText: "Manage Number Series",
      primary: true,
    },
    {
      id: "templates",
      title: "Templates",
      description: "Manage certificate templates, document templates and downloadable bulk-upload templates.",
      icon: FileText,
      image: templatesImage,
      to: "/dashboard/settings/templates",
      buttonText: "Manage Templates",
      primary: true,
    },
    {
      id: "leave-types",
      title: "Leave Types & Policy Configuration",
      description: "Define annual leave quotas, staff eligibility, carry-forward policies, and proof requirements.",
      icon: CalendarDays,
      to: "/dashboard/settings/leave-types",
      buttonText: "Manage Leave Types",
      primary: true,
    },
    {
      id: "audit",
      title: "Audit Logs",
      description: "View system audit trail, security events and administrator activity logs.",
      icon: ShieldCheck,
      image: auditLogsImage,
      to: "/dashboard/settings/audit-logs",
      buttonText: "View Audit Logs",
      primary: false,
    },
  ];

  return (
    <DashboardLayout
      title="Settings"
      subtitle="Manage system configurations, numbering rules, user permissions and preferences."
      breadcrumb={["Home", "Settings"]}
    >
      <main className="settings-dashboard-container">
        <section className="settings-grid">
          {settingsCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.id} className={`settings-card ${card.primary ? "is-featured" : ""}`}>
                <div className="settings-card-header">
                  <div className="settings-card-icon">
                    {card.image ? <img className="settings-card-image" src={card.image} alt="" aria-hidden="true" /> : <Icon size={20} />}
                  </div>
                  <h3>{card.title}</h3>
                </div>
                <p>{card.description}</p>
                <div className="settings-card-footer">
                  <button
                    type="button"
                    className={`cms-btn ${card.primary ? "cms-btn-primary" : "cms-btn-ghost"}`}
                    onClick={() => navigate(card.to)}
                  >
                    {card.buttonText} <ArrowRight size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </DashboardLayout>
  );
}

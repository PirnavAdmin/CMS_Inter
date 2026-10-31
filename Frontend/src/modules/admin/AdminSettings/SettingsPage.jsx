import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ListOrdered, ShieldCheck, ArrowRight, Landmark, FileText, CalendarDays, Clock, Building2, Palette, Pipette } from "lucide-react";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { useTheme } from "@/hooks/useTheme.js";
import ThemePalettePicker, { THEME_OPTIONS } from "@/shared/components/ThemePalettePicker.jsx";
import themeLightImage from "@/assets/navbar-3d/theme-light.png";
import campusConfigImage from "@/assets/settings-3d/campus-configuration.png";
import boardAcademicYearImage from "@/assets/settings-3d/board-academic-year.png";
import numberSeriesImage from "@/assets/settings-3d/number-series.png";
import templatesImage from "@/assets/settings-3d/templates.png";
import rolesPermissionsImage from "@/assets/settings-3d/roles-permissions.png";
import leaveTypesImage from "@/assets/settings-3d/leave-types.png";
import attendanceTimingImage from "@/assets/settings-3d/attendance-timing.png";
import auditLogsImage from "@/assets/settings-3d/audit-logs.png";
import "./SettingsPage.css";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { palette, customColor, themePolicy, updateThemePolicy } = useTheme();
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [policyUpdating, setPolicyUpdating] = useState(false);

  const currentTheme = THEME_OPTIONS.find((t) => t.id === palette);
  const currentThemeName = palette === "custom" ? "Custom Color" : currentTheme ? currentTheme.name : "Olive";
  const currentThemeColor = palette === "custom" ? (customColor || "#00b4d8") : currentTheme ? currentTheme.swatches[0] : "var(--cms-primary)";

  const handlePolicyModeChange = async (mode) => {
    if (policyUpdating || themePolicy?.themeMode === mode) return;
    setPolicyUpdating(true);
    try {
      await updateThemePolicy({
        themeMode: mode,
        adminPalette: palette,
        adminCustomColor: customColor,
      });
    } catch (err) {
      console.error("Failed to update theme policy:", err);
    } finally {
      setPolicyUpdating(false);
    }
  };

  const settingsCards = [
    {
      id: "landing-configuration",
      title: "Landing Page Configuration",
      description: "Set the college name, headline, descriptions, logos, home-page image and footer contact details.",
      icon: Building2,
      image: campusConfigImage,
      to: "/dashboard/settings/landing-page",
      buttonText: "Configure Landing Page",
      primary: true,
    },
    {
      id: "login-configuration",
      title: "Login Page Configuration",
      description: "Set the college name, tagline, login form text, logo and background image.",
      icon: Building2,
      image: campusConfigImage,
      to: "/dashboard/settings/login-page",
      buttonText: "Configure Login Page",
      primary: true,
    },
    {
      id: "campus-configuration",
      title: "Campus Configuration",
      description: "Configure multi-campus branches, branch codes, address, affiliated education boards and active header branch selector.",
      icon: Building2,
      image: campusConfigImage,
      to: "/dashboard/settings/campus-configuration",
      buttonText: "Configure Campuses",
      primary: true,
    },
    {
      id: "board-academic-year",
      title: "Board & Academic Year Management",
      description: "Create, edit and manage education boards, board codes, academic years, date ranges and status.",
      icon: Landmark,
      image: boardAcademicYearImage,
      to: "/dashboard/settings/board-academic-year",
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
      id: "roles-permissions",
      title: "Roles & Permissions",
      description: "Manage system roles and module-level permissions for dashboard access control.",
      icon: ShieldCheck,
      image: rolesPermissionsImage,
      to: "/dashboard/settings/roles-permissions",
      buttonText: "Manage Roles",
      primary: true,
    },
    {
      id: "leave-types-policy",
      title: "Leave Types & Policy Configuration",
      description: "Define annual leave quotas, staff eligibility, carry-forward policies, and proof requirements.",
      icon: CalendarDays,
      image: leaveTypesImage,
      to: "/dashboard/settings/leave-types",
      buttonText: "Manage Leave Types",
      primary: true,
    },
    {
      id: "attendance-timing",
      title: "Attendance Timing Configuration",
      description: "Configure work shifts, check-in & check-out timings, late arrival thresholds, and early checkout rules for staff.",
      icon: Clock,
      image: attendanceTimingImage,
      to: "/dashboard/settings/attendance-timing",
      buttonText: "Manage Timing Rules",
      primary: true,
    },
    {
      id: "lop-configuration",
      title: "LOP Configuration",
      description: "Assign staff unpaid leave days and preview salary deductions for additional leave.",
      icon: CalendarDays,
      image: leaveTypesImage,
      to: "/dashboard/settings/lop-configuration",
      buttonText: "Configure LOP",
      primary: true,
    },
    {
      id: "theme-configuration",
      title: "Theme & Appearance",
      description: "Select the primary color theme to style your sidebar, navbar and dashboard.",
      icon: Palette,
      image: themeLightImage,
      buttonText: "Change Theme",
      primary: true,
      isThemeCard: true,
    },
    {
      id: "audit",
      title: "Audit Logs",
      description: "View system audit trail, security events and administrator activity logs.",
      icon: ShieldCheck,
      image: auditLogsImage,
      to: "/dashboard/settings/audit-logs",
      buttonText: "View Audit Logs",
      primary: true,
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
                <div className="settings-card-body">
                  <div className="settings-card-header">
                    <div className="settings-card-icon">
                      {card.image ? <img className="settings-card-image" src={card.image} alt="" aria-hidden="true" /> : <Icon size={20} />}
                    </div>
                    <h3>{card.title}</h3>
                  </div>
                  <p>{card.description}</p>
                  {card.isThemeCard && (
                    <div className="settings-theme-policy-bar" onClick={(e) => e.stopPropagation()}>
                      <span className="settings-theme-policy-caption">Policy:</span>
                      <div className="settings-theme-segmented-pill" role="radiogroup" aria-label="Theme Control Policy">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={themePolicy?.themeMode !== "admin"}
                          className={`settings-theme-seg-tab ${themePolicy?.themeMode !== "admin" ? "is-active" : ""}`}
                          onClick={() => handlePolicyModeChange("independent")}
                          disabled={policyUpdating}
                          title="Independent: Users choose their own theme"
                        >
                          User Choice
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={themePolicy?.themeMode === "admin"}
                          className={`settings-theme-seg-tab ${themePolicy?.themeMode === "admin" ? "is-active" : ""}`}
                          onClick={() => handlePolicyModeChange("admin")}
                          disabled={policyUpdating}
                          title="Admin Enforced: Admin sets global theme for all users"
                        >
                          Admin Enforced
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="settings-card-footer">
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={() => {
                      if (card.isThemeCard) {
                        setThemeModalOpen(true);
                      } else {
                        navigate(card.to);
                      }
                    }}
                  >
                    {card.isThemeCard ? (themePolicy?.themeMode === "admin" ? "Global Theme" : "Change Theme") : card.buttonText} <ArrowRight size={14} />
                  </button>
                  {card.isThemeCard ? (
                    <span
                      className="settings-selected-theme-pill"
                      title={`Active: ${currentThemeName} (${themePolicy?.themeMode === "admin" ? "Admin Enforced" : "User Choice"})`}
                    >
                      <span className="settings-selected-theme-dot" style={{ backgroundColor: currentThemeColor }} />
                      <span className="settings-selected-theme-name">{currentThemeName}</span>
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      </main>
      <ThemePalettePicker
        open={themeModalOpen}
        onOpenChange={setThemeModalOpen}
        hideTrigger={true}
        isAdmin={true}
      />
    </DashboardLayout>
  );
}

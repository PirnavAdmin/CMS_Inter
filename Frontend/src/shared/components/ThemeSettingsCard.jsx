import React, { useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import useTheme from "@/hooks/useTheme.js";
import ThemePalettePicker, { THEME_OPTIONS } from "@/shared/components/ThemePalettePicker.jsx";
import themeLightImage from "@/assets/navbar-3d/theme-light.png";

export default function ThemeSettingsCard({ className = "", isCard = true }) {
  const { palette, customColor, isThemeLocked } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);

  const currentTheme = THEME_OPTIONS.find((t) => t.id === palette || t.key === palette);
  const currentThemeName = palette === "custom" ? "Custom Color" : currentTheme ? currentTheme.name : "Olive";
  const currentThemeColor = palette === "custom" ? (customColor || "#00b4d8") : currentTheme ? (currentTheme.swatches ? currentTheme.swatches[0] : currentTheme.topbar[0]) : "var(--cms-primary)";

  const cardContent = (
    <>
      <div className="faculty-settings-card-body settings-card-body">
        <div className="faculty-settings-card-header settings-card-header">
          <div className="faculty-settings-card-icon settings-card-icon">
            <img
              src={themeLightImage}
              alt="Theme & Appearance"
              className="faculty-settings-card-image settings-card-image"
              aria-hidden="true"
            />
          </div>
          <div>
            <h3>Theme &amp; Appearance</h3>
            {isThemeLocked && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: "var(--cms-primary)",
                  background: "color-mix(in srgb, var(--cms-primary) 15%, transparent)",
                  padding: "1px 6px",
                  borderRadius: "999px",
                  marginTop: "3px",
                }}
              >
                <Lock size={10} /> Admin Enforced
              </span>
            )}
          </div>
        </div>

        <p>
          {isThemeLocked
            ? "Your college administrator has set a global theme for all portals. Theme customization is centrally locked."
            : "Select the primary color theme to style your sidebar, navbar and overall application surfaces."}
        </p>
      </div>

      <div className="faculty-settings-card-footer settings-card-footer">
        {isThemeLocked ? (
          <button
            type="button"
            className="cms-btn cms-btn-outline"
            disabled
            style={{
              opacity: 0.65,
              cursor: "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
            title="Theme is centrally managed by your college administrator."
          >
            <Lock size={13} /> Locked by Admin
          </button>
        ) : (
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => setModalOpen(true)}
          >
            Change Theme <ArrowRight size={14} />
          </button>
        )}
        <span className="settings-selected-theme-pill" title={`Active: ${currentThemeName}${isThemeLocked ? " (Enforced by Admin)" : ""}`}>
          <span className="settings-selected-theme-dot" style={{ backgroundColor: currentThemeColor }} />
          <span className="settings-selected-theme-name">{currentThemeName}</span>
        </span>
      </div>

      {!isThemeLocked && (
        <ThemePalettePicker
          open={modalOpen}
          onOpenChange={setModalOpen}
          hideTrigger={true}
        />
      )}
    </>
  );

  if (!isCard) {
    return <div className={`cms-theme-settings-wrapper ${className}`}>{cardContent}</div>;
  }

  return (
    <article className={`faculty-settings-card settings-card is-featured ${className}`}>
      {cardContent}
    </article>
  );
}

import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import useTheme from "@/hooks/useTheme.js";
import ThemePalettePicker, { THEME_OPTIONS } from "@/shared/components/ThemePalettePicker.jsx";
import themeLightImage from "@/assets/navbar-3d/theme-light.png";

export default function ThemeSettingsCard({ className = "", isCard = true }) {
  const { palette, customColor } = useTheme();
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
          <h3>Theme &amp; Appearance</h3>
        </div>

        <p>
          Select the primary color theme to style your sidebar, navbar and overall application surfaces.
        </p>
      </div>

      <div className="faculty-settings-card-footer settings-card-footer">
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          onClick={() => setModalOpen(true)}
        >
          Change Theme <ArrowRight size={14} />
        </button>
        <span className="settings-selected-theme-pill" title={`Active: ${currentThemeName}`}>
          <span className="settings-selected-theme-dot" style={{ backgroundColor: currentThemeColor }} />
          <span className="settings-selected-theme-name">{currentThemeName}</span>
        </span>
      </div>

      <ThemePalettePicker
        open={modalOpen}
        onOpenChange={setModalOpen}
        hideTrigger={true}
      />
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

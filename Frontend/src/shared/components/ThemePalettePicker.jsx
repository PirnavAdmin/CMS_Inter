import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Palette, Pipette, Check, X, Lock, Globe } from "lucide-react";
import { useTheme, VALID_PALETTES } from "@/hooks/useTheme.js";
import "./ThemePalettePicker.css";

export const THEME_OPTIONS = [
  { id: "olive", name: "Current Olive", swatches: ["#617800", "#b8cb79", "#e4ecce"] },
  { id: "cobalt", name: "Cobalt Blue", swatches: ["#1d4ed8", "#93c5fd", "#dbeafe"] },
  { id: "sapphire", name: "Sapphire Blue", swatches: ["#0284c7", "#7dd3fc", "#e0f2fe"] },
  { id: "ocean", name: "Ocean Blue", swatches: ["#1c5d9f", "#93c5fd", "#dbeafe"] },
  { id: "midnight", name: "Midnight Navy", swatches: ["#1e3a5f", "#94a3b8", "#cbd5e1"] },
  { id: "graphite", name: "Graphite Dark", swatches: ["#475569", "#94a3b8", "#cbd5e1"] },
  { id: "teal", name: "Teal Breeze", swatches: ["#08777c", "#5eead4", "#ccfbf1"] },
  { id: "emerald", name: "Forest Emerald", swatches: ["#15803d", "#86efac", "#dcfce7"] },
  { id: "amber", name: "Golden Amber", swatches: ["#b45309", "#fcd34d", "#fef3c7"] },
  { id: "cinnamon", name: "Warm Cinnamon", swatches: ["#c2410c", "#fdba74", "#ffedd5"] },
  { id: "bronze", name: "Mocha Bronze", swatches: ["#78350f", "#fde047", "#fef9c3"] },
  { id: "crimson", name: "Crimson Rose", swatches: ["#be123c", "#fda4af", "#ffe4e6"] },
  { id: "wine", name: "Burgundy Wine", swatches: ["#881337", "#f472b6", "#fce7f3"] },
  { id: "plum", name: "Orchid Plum", swatches: ["#7e22ce", "#d8b4fe", "#fae8ff"] },
  { id: "purple", name: "Royal Purple", swatches: ["#65409a", "#c4b5fd", "#ede9fe"] },
];

function hslToHex(h, s, l) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHue(hex) {
  let c = (hex || "#00b4d8").replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  if (c.length !== 6) return 190;
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = Math.round(h * 60);
  }
  return h;
}

export default function ThemePalettePicker({
  className = "",
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  showTrigger = true,
  isAdmin: isAdminProp,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (val) => {
    if (isControlled) {
      onOpenChange?.(val);
    } else {
      setInternalOpen(val);
    }
  };

  const {
    palette,
    setPalette,
    customColor,
    setCustomColor,
    themePolicy,
    isAdmin: isAdminHook,
  } = useTheme();

  const isAdmin = isAdminProp !== undefined ? Boolean(isAdminProp) : Boolean(isAdminHook);
  const isThemeLocked = themePolicy?.themeMode === "admin" && !isAdmin;

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentHex, setCurrentHex] = useState(customColor || "#00b4d8");
  const [sliderHue, setSliderHue] = useState(() => hexToHue(customColor || "#00b4d8"));
  const nativeColorInputRef = useRef(null);

  // Keep internal custom color state in sync with hook
  useEffect(() => {
    if (customColor) {
      setCurrentHex(customColor);
      setSliderHue(hexToHue(customColor));
    }
  }, [customColor]);

  const handleHueChange = (e) => {
    if (isThemeLocked) return;
    const hue = Number(e.target.value);
    setSliderHue(hue);
    const newHex = hslToHex(hue, 95, 45);
    setCurrentHex(newHex);
    setCustomColor(newHex);
  };

  const handleHexInput = (e) => {
    if (isThemeLocked) return;
    const val = e.target.value;
    setCurrentHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setSliderHue(hexToHue(val));
      setCustomColor(val);
    }
  };

  const handleNativeColorPick = (e) => {
    if (isThemeLocked) return;
    const val = e.target.value;
    setCurrentHex(val);
    setSliderHue(hexToHue(val));
    setCustomColor(val);
  };

  const handleEyeDropper = async () => {
    if (isThemeLocked) return;
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          const hex = result.sRGBHex.toLowerCase();
          setCurrentHex(hex);
          setSliderHue(hexToHue(hex));
          setCustomColor(hex);
        }
      } catch {
        // User dismissed the eyedropper
      }
    } else if (nativeColorInputRef.current) {
      nativeColorInputRef.current.click();
    }
  };

  const shouldRenderTrigger = !hideTrigger && showTrigger && !isThemeLocked;

  return (
    <>
      {shouldRenderTrigger && (
        <button
          type="button"
          className={`cms-icon-btn cms-theme-picker-trigger cms-theme-picker-${palette} ${className}`}
          aria-label={`Change color theme. Current theme: ${palette}`}
          title={`Theme color: ${palette}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span className="cms-theme-picker-indicator" aria-hidden="true" />
          <Palette size={17} aria-hidden="true" />
        </button>
      )}

      {open && typeof document !== "undefined" && createPortal(
        <div
          className="cms-dashboard-theme-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            className="cms-dashboard-theme-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cms-theme-dialog-title"
            aria-describedby="cms-theme-dialog-desc"
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
          >
            <div className="cms-dashboard-theme-heading">
              <div>
                <h2 id="cms-theme-dialog-title">
                  {isAdmin && themePolicy?.themeMode === "admin"
                    ? "Set Global Application Theme"
                    : "Pick a theme colour"}
                </h2>
                <p id="cms-theme-dialog-desc">
                  {isAdmin && themePolicy?.themeMode === "admin"
                    ? "Select a palette to apply across the entire college management system for all portals."
                    : "Choose a professional palette or pick a custom color to style your application."}
                </p>
              </div>
              <button
                type="button"
                className="cms-dashboard-theme-close"
                aria-label="Close appearance"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>

            {/* Locked warning banner: ONLY for non-admins when themeMode === admin */}
            {isThemeLocked && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 12px",
                  marginBottom: "12px",
                  borderRadius: "8px",
                  background: "color-mix(in srgb, var(--cms-primary) 14%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--cms-primary) 30%, transparent)",
                  fontSize: "12px",
                  color: "var(--cms-text)",
                }}
              >
                <Lock size={15} style={{ flexShrink: 0, color: "var(--cms-primary)" }} />
                <span>
                  The application theme is currently centrally managed by your administrator. Individual changes are locked.
                </span>
              </div>
            )}

            {/* Admin Global Enforce Banner */}
            {isAdmin && themePolicy?.themeMode === "admin" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "8px 12px",
                  marginBottom: "12px",
                  borderRadius: "8px",
                  background: "color-mix(in srgb, var(--cms-primary) 12%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--cms-primary) 28%, transparent)",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--cms-primary)",
                }}
              >
                <Globe size={15} style={{ flexShrink: 0 }} />
                <span>🌐 Global Mode Active: Selecting a theme below will immediately apply it across all portals and users.</span>
              </div>
            )}

            {/* Presets Grid */}
            <div
              className="cms-dashboard-theme-grid"
              role="radiogroup"
              aria-label="Color theme"
              style={isThemeLocked ? { opacity: 0.75, pointerEvents: "none" } : undefined}
            >
              {THEME_OPTIONS.map((theme) => {
                const isSelected = palette === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    title={theme.name}
                    className={`cms-theme-card ${isSelected ? "is-selected" : ""}`}
                    onClick={() => {
                      if (isThemeLocked) return;
                      setPalette(theme.id);
                      setShowColorPicker(false);
                    }}
                    disabled={isThemeLocked}
                  >
                    <span className="cms-theme-circle-swatch" aria-hidden="true">
                      <span className="swatch-top" style={{ backgroundColor: theme.swatches[2] }} />
                      <span className="swatch-bottom-left" style={{ backgroundColor: theme.swatches[0] }} />
                      <span className="swatch-bottom-right" style={{ backgroundColor: theme.swatches[1] }} />
                    </span>
                    <span className="cms-theme-card-name">{theme.name}</span>
                    {isSelected && (
                      <span className="cms-theme-card-check" aria-hidden="true">
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Custom Color Card */}
              <button
                type="button"
                role="radio"
                aria-checked={palette === "custom"}
                title="Custom Color Picker"
                className={`cms-theme-card ${palette === "custom" ? "is-selected" : ""}`}
                style={{ "--cms-custom-preview-color": currentHex }}
                onClick={() => {
                  if (isThemeLocked) return;
                  setCustomColor(currentHex);
                  setShowColorPicker((prev) => !prev);
                }}
                disabled={isThemeLocked}
              >
                <span className="cms-theme-circle-swatch is-custom" aria-hidden="true">
                  <Pipette size={20} />
                </span>
                <span className="cms-theme-card-name">Custom</span>
                {palette === "custom" && (
                  <span className="cms-theme-card-check" aria-hidden="true">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </button>
            </div>

            {/* Colour Picker Popover (Image 3 Style with Rainbow Slider) */}
            {showColorPicker && !isThemeLocked && (
              <div className="cms-colour-picker-popover" role="region" aria-label="Colour picker">
                <div className="cms-colour-picker-header">
                  <span className="cms-colour-picker-title">Colour picker</span>
                  <button
                    type="button"
                    className="cms-colour-picker-close-btn"
                    aria-label="Close colour picker"
                    onClick={() => setShowColorPicker(false)}
                  >
                    ×
                  </button>
                </div>

                {/* Rainbow Hue Slider Bar */}
                <div className="cms-hue-slider-wrap">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={sliderHue}
                    onChange={handleHueChange}
                    className="cms-hue-slider"
                    style={{ "--cms-custom-thumb-color": currentHex }}
                    aria-label="Adjust colour hue"
                  />
                </div>

                {/* Controls Row */}
                <div className="cms-colour-picker-controls">
                  <label className="cms-colour-preview-wrap" title="Click to pick colour">
                    <span
                      className="cms-colour-preview-badge"
                      style={{ backgroundColor: currentHex }}
                      aria-hidden="true"
                    />
                    <input
                      type="color"
                      value={currentHex}
                      onChange={handleNativeColorPick}
                      className="cms-colour-native-input"
                      disabled={isThemeLocked}
                      aria-label="Pick custom colour"
                    />
                  </label>

                  <div className="cms-hex-input-wrap">
                    <span className="cms-hex-prefix">#</span>
                    <input
                      type="text"
                      value={currentHex.replace("#", "")}
                      onChange={(e) => handleHexInput({ target: { value: `#${e.target.value}` } })}
                      maxLength={6}
                      className="cms-hex-input"
                      placeholder="00b4d8"
                      aria-label="Hex color code"
                      spellCheck="false"
                    />
                  </div>

                  <label className="cms-colour-native-wrap" title="Open Color Picker & Eye Dropper">
                    <input
                      type="color"
                      value={currentHex}
                      onChange={handleNativeColorPick}
                      className="cms-colour-native-input"
                      disabled={isThemeLocked}
                      aria-label="Open Color Picker and Eye Dropper"
                    />
                    <span className="cms-colour-native-btn">
                      <Pipette size={14} />
                      <span>Eye Dropper</span>
                    </span>
                  </label>

                  <button
                    type="button"
                    className="cms-colour-apply-btn"
                    onClick={() => {
                      setCustomColor(currentHex);
                      setShowColorPicker(false);
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            <div className="cms-dashboard-theme-footer">
              <button
                type="button"
                className="cms-dashboard-theme-done"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}

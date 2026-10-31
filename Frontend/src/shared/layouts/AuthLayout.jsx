import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import HeroSlider from "@/shared/components/HeroSlider.jsx";
import { heroCopy } from "@/data/heroSlides.js";
import { useCampusImages } from "../../modules/admin/AdminSettings/campusImages.js";
import { getCampusContent } from "../../modules/admin/AdminSettings/campusContent.js";
import "@/modules/auth/styles/auth.css";

export default function AuthLayout({ title, subtitle, children, cardClass = "" }) {
  const images = useCampusImages();
  const content = getCampusContent(images);

  const loginPalette = images.loginThemePalette || localStorage.getItem("pirnav-login-palette") || "olive";
  const loginCustomColor = images.loginCustomColor || localStorage.getItem("pirnav-login-custom-color") || "#00b4d8";

  // Login theme mode is completely independent from dashboard theme mode
  const [loginMode, setLoginMode] = useState(() => {
    try {
      return localStorage.getItem("pirnav-login-mode") || "light";
    } catch {
      return "light";
    }
  });

  const toggleLoginMode = () => {
    setLoginMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("pirnav-login-mode", next);
      } catch {}
      return next;
    });
  };

  const customStyles = loginPalette === "custom" && loginCustomColor ? {
    "--cms-primary": loginCustomColor,
    "--cms-primary-dark": loginCustomColor,
    "--cms-primary-hover": loginCustomColor,
    "--cms-primary-soft": `${loginCustomColor}25`,
    "--cms-primary-border": `${loginCustomColor}60`,
  } : {};

  return (
    <div
      className="cms-auth"
      data-theme={loginMode}
      data-login-mode={loginMode}
      data-theme-palette={loginPalette}
      data-login-palette={loginPalette}
      style={customStyles}
    >
      <div className="cms-auth-bg">
        <HeroSlider variant="bg" />
      </div>
      <aside className="cms-auth-aside">
        <div className="cms-anim-up cms-auth-hero-copy">
          {images.loginLogo && (
            <img
              src={images.loginLogo}
              alt={`${content.loginCollegeName} logo`}
              style={{ maxWidth: 240, maxHeight: 100, objectFit: "contain", marginBottom: 20 }}
            />
          )}
          <h2 className="cms-auth-hero-title">{images.loginCollegeName ?? heroCopy.headline}</h2>
          <p className="cms-auth-hero-desc">{images.loginTagline ?? heroCopy.subtitle}</p>
        </div>
      </aside>

      <main className="cms-auth-main">
        <div className={`cms-auth-card ${cardClass}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <h1>{title}</h1>
            </div>
            <button
              type="button"
              className="cms-icon-btn"
              aria-label={loginMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={loginMode === "dark" ? "Light mode" : "Dark mode"}
              onClick={toggleLoginMode}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: "1px solid",
                borderColor: loginMode === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
                background: loginMode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.04)",
                color: loginMode === "dark" ? "#f8fafc" : "#1e293b",
                display: "inline-grid",
                placeItems: "center",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {loginMode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
          <p>{subtitle}</p>
          {children}
          <div className="cms-auth-links" style={{ marginTop: 20 }}>
            <Link to="/">Back to home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

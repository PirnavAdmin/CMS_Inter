import { SkeletonPage } from "@/shared/components/Skeleton.jsx";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ImagePlus, Save, Palette, Check, Pipette } from "lucide-react";
import { createPortal } from "react-dom";
import { THEME_OPTIONS } from "@/shared/components/ThemePalettePicker.jsx";
import DashboardLayout from "../../../shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { useCampusContext } from "../../../context/CampusContext.jsx";
import {
  campusImageFields,
  readCampusImages,
  saveCampusImages,
  readCampusImageFile,
} from "./campusImages.js";
import defaultLogo from "../../../assets/pirnav-colleges-logo.png";
import CampusBrandImage from "@/shared/components/CampusBrandImage.jsx";
import { campusContentDefaults, campusTextFields } from "./campusContent.js";
import "./CampusImagesConfigurationPage.css";

export default function CampusImagesConfigurationPage({ page = "landing" }) {
  const title = page === "login" ? "Login Page Configuration" : "Landing Page Configuration";
  const imageFields = campusImageFields.filter(([slot]) =>
    page === "login"
      ? ["loginLogo", "loginImage"].includes(slot)
      : ["dashboardLogo", "headerLogo", "footerLogo", "heroImage"].includes(slot),
  );
  const textFields = campusTextFields[page];
  const { selectedCampusId, selectedCampus } = useCampusContext();
  const [images, setImages] = useState({});
  const [text, setText] = useState(campusContentDefaults);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loginTheme, setLoginTheme] = useState(() => localStorage.getItem("pirnav-login-palette") || "olive");
  const [loginCustomColor, setLoginCustomColor] = useState(() => localStorage.getItem("pirnav-login-custom-color") || "#00b4d8");
  const [loginThemeModalOpen, setLoginThemeModalOpen] = useState(false);
  const pageScope = `${selectedCampusId}:${page}`;
  const scope = useRef(pageScope);
  scope.current = pageScope;
  const uploadSequence = useRef({});
  const saveLock = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setImages({});
    setText(campusContentDefaults);
    setError("");
    setMessage("");
    setUploading(0);
    readCampusImages(selectedCampusId)
      .then((value) => {
        if (active) {
          setImages(value);
          setText({ ...campusContentDefaults, ...value });
          if (value?.loginThemePalette) {
            setLoginTheme(value.loginThemePalette);
            localStorage.setItem("pirnav-login-palette", value.loginThemePalette);
          }
          if (value?.loginCustomColor) {
            setLoginCustomColor(value.loginCustomColor);
            localStorage.setItem("pirnav-login-custom-color", value.loginCustomColor);
          }
        }
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCampusId, page]);
  const upload = async (slot, file) => {
    if (!file) return;
    const campus = pageScope;
    const sequence = (uploadSequence.current[slot] || 0) + 1;
    uploadSequence.current[slot] = sequence;
    setUploading((value) => value + 1);
    setError("");
    setMessage("");
    try {
      const src = await readCampusImageFile(file);
      if (scope.current === campus && uploadSequence.current[slot] === sequence)
        setImages((previous) => ({ ...previous, [slot]: src }));
    } catch (failure) {
      if (scope.current === campus && uploadSequence.current[slot] === sequence)
        setError(failure.message);
    } finally {
      if (scope.current === campus) setUploading((value) => Math.max(0, value - 1));
    }
  };
  const save = async () => {
    if (saveLock.current || uploading || loading) return;
    const campus = selectedCampusId;
    const activeScope = pageScope;
    if (textFields.some(([key, , type]) => !type && !text[key].trim())) {
      setError("Complete the required text fields before saving.");
      return;
    }
    saveLock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const latest = await readCampusImages(campus);
      const next = { ...latest };
      imageFields.forEach(([slot]) => {
        if (images[slot]) next[slot] = images[slot];
        else delete next[slot];
      });
      textFields.forEach(([key]) => {
        next[key] = text[key].trim();
      });
      if (page === "login") {
        next.loginThemePalette = loginTheme;
        next.loginCustomColor = loginCustomColor;
        localStorage.setItem("pirnav-login-palette", loginTheme);
        if (loginCustomColor) localStorage.setItem("pirnav-login-custom-color", loginCustomColor);
      }
      await saveCampusImages(campus, next);
      if (scope.current === activeScope)
        setMessage(`${title} saved in this browser. Open the page to see your changes.`);
    } catch (failure) {
      if (scope.current === activeScope) setError(failure.message);
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  };
  return (
    <DashboardLayout
      title={title}
      subtitle="Customize the college name, text, logos and images."
      breadcrumb={["Home", "Settings", title]}
    >
      <main className="campus-images-page">
        <Link className="cms-back-link" to="/dashboard/settings">
          <ArrowLeft size={15} /> Back to Settings
        </Link>
        <section className="campus-images-scope">
          <h2>
            <ImagePlus size={21} />{" "}
            {selectedCampus?.campusName || selectedCampus?.name || "Selected campus"}
          </h2>
          <p>
            PNG, JPEG, or WebP. Maximum 2 MB per image. Logo images work best with a transparent
            background.
          </p>
          <p>
            Text and images are saved for this campus in this browser. A backend API is required to
            share them across devices and users.
          </p>
          <Link
            to={page === "login" ? "/login" : "/"}
            target="_blank"
            rel="noopener noreferrer"
            className="cms-btn cms-btn-ghost"
          >
            Open {page === "login" ? "Login" : "Landing"} Page
          </Link>
        </section>
        {error && (
          <p className="campus-images-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="campus-images-success" role="status">
            {message}
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          {!loading && (
            <section className="campus-images-scope">
              <h2>Page Text &amp; College Details</h2>
              <div className="campus-content-fields">
                {textFields.map(([key, label, type]) => (
                  <label key={key}>
                    {label}
                    {type === "textarea" ? (
                      <textarea
                        rows={3}
                        maxLength={1200}
                        disabled={busy}
                        value={text[key]}
                        onChange={(event) => {
                          setText((previous) => ({ ...previous, [key]: event.target.value }));
                          setMessage("");
                        }}
                      />
                    ) : (
                      <input
                        type={type || "text"}
                        required={!type}
                        maxLength={300}
                        disabled={busy}
                        value={text[key]}
                        onChange={(event) => {
                          setText((previous) => ({ ...previous, [key]: event.target.value }));
                          setMessage("");
                        }}
                      />
                    )}
                  </label>
                ))}
              </div>
            </section>
          )}
          {loading ? (
            <SkeletonPage variant="form" rows={4} />
          ) : (
            <div className="campus-images-grid">
              {page === "login" && (
                <section className="campus-images-card campus-images-theme-card">
                  <h2>Login Page Theme</h2>
                  <p>Independent color theme for the login screen.</p>
                  <div className="campus-images-preview" style={{ background: "var(--cms-surface)", display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        className="cms-theme-circle-swatch"
                        style={{
                          width: 44,
                          height: 44,
                          position: "relative",
                          borderRadius: "50%",
                          overflow: "hidden",
                          display: "inline-block",
                          flexShrink: 0,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                          backgroundColor: loginTheme === "custom" ? loginCustomColor : undefined
                        }}
                      >
                        {loginTheme !== "custom" && (() => {
                          const opt = THEME_OPTIONS.find((t) => t.id === loginTheme) || THEME_OPTIONS[0];
                          return (
                            <>
                              <span className="swatch-top" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", backgroundColor: opt.swatches[2] }} />
                              <span className="swatch-bottom-left" style={{ position: "absolute", bottom: 0, left: 0, width: "50%", height: "50%", backgroundColor: opt.swatches[0] }} />
                              <span className="swatch-bottom-right" style={{ position: "absolute", bottom: 0, right: 0, width: "50%", height: "50%", backgroundColor: opt.swatches[1] }} />
                            </>
                          );
                        })()}
                      </span>
                      <div style={{ textAlign: "left" }}>
                        <strong style={{ fontSize: "13px", display: "block", color: "var(--cms-text)" }}>
                          {loginTheme === "custom" ? "Custom Color" : (THEME_OPTIONS.find((t) => t.id === loginTheme)?.name || "Current Olive")}
                        </strong>
                        <small style={{ color: "var(--cms-muted)", fontSize: "11px" }}>Independent theme</small>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    style={{ marginTop: "auto" }}
                    onClick={() => setLoginThemeModalOpen(true)}
                  >
                    <Palette size={14} /> Change Login Theme
                  </button>
                </section>
              )}
              {imageFields.map(([slot, title, description, kind]) => (
                <section className="campus-images-card" key={slot}>
                  <h2>{title}</h2>
                  <p>{description}</p>
                  <div className={`campus-images-preview ${kind}`}>
                    {images[slot] ? (
                      kind === "logo" ? <CampusBrandImage slot={slot} src={images[slot]} alt={`${title} preview`} /> : <img src={images[slot]} alt={`${title} preview`} />
                    ) : kind === "logo" ? (
                      <CampusBrandImage slot={slot} src={defaultLogo} alt="Default college logo" />
                    ) : (
                      <span>Existing image slider will be used</span>
                    )}
                  </div>
                  <label className="campus-images-upload">
                    Choose {title}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={busy || !selectedCampusId}
                      onChange={(event) => {
                        upload(slot, event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    disabled={busy || !images[slot]}
                    onClick={() => {
                      uploadSequence.current[slot] = (uploadSequence.current[slot] || 0) + 1;
                      setImages((previous) => {
                        const next = { ...previous };
                        delete next[slot];
                        return next;
                      });
                      setMessage("");
                    }}
                  >
                    Restore default
                  </button>
                </section>
              ))}
            </div>
          )}
          <div className="campus-images-actions">
            <button
              type="submit"
              className="cms-btn cms-btn-primary"
              disabled={loading || busy || uploading > 0 || !selectedCampusId}
            >
              <Save size={16} />{" "}
              {busy ? "Saving..." : uploading ? "Reading images..." : "Save Configuration"}
            </button>
          </div>
        </form>
      </main>
    {loginThemeModalOpen && typeof document !== "undefined" && createPortal(
        <div
          className="cms-dashboard-theme-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLoginThemeModalOpen(false);
          }}
        >
          <section
            className="cms-dashboard-theme-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-theme-modal-title"
          >
            <div className="cms-dashboard-theme-heading">
              <div>
                <h2 id="login-theme-modal-title">Select Login Page Theme</h2>
                <p>Choose an independent color palette specifically for the login screen.</p>
              </div>
              <button
                type="button"
                className="cms-dashboard-theme-close"
                onClick={() => setLoginThemeModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="cms-dashboard-theme-grid">
              {THEME_OPTIONS.map((theme) => {
                const isSelected = loginTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    className={`cms-theme-card ${isSelected ? "is-selected" : ""}`}
                    onClick={() => {
                      setLoginTheme(theme.id);
                      setLoginThemeModalOpen(false);
                    }}
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
            </div>

            <div className="cms-dashboard-theme-footer">
              <span>This theme will only apply to the login page.</span>
              <button
                type="button"
                className="cms-dashboard-theme-done"
                onClick={() => setLoginThemeModalOpen(false)}
              >
                Done
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}
    </DashboardLayout>
  );
}

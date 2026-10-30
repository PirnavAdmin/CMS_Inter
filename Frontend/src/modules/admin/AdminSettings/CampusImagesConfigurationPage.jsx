import { SkeletonPage } from "@/shared/components/Skeleton.jsx";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ImagePlus, Save, Settings, AlignLeft, AlignCenter, AlignRight, Palette, Check, Pipette } from "lucide-react";
import { Modal } from "../../../shared/components/Ui.jsx";
import { createPortal } from "react-dom";
import { THEME_OPTIONS } from "@/shared/components/ThemePalettePicker.jsx";
import DashboardLayout from "../../../shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { useCampusContext } from "../../../context/CampusContext.jsx";
import {
  campusImageFields,
  readCampusImages,
  saveCampusImages,
  readCampusImageFile,
  headerBrandDefaults,
  getHeaderBrand,
} from "./campusImages.js";
import defaultLogo from "../../../assets/pirnav-colleges-logo.png";
import defaultHeaderLogo from "../../../assets/pirnav-college-crest.png";
import { HeaderBrand } from "../../../shared/components/CampusBrandImage.jsx";
import CampusBrandImage from "@/shared/components/CampusBrandImage.jsx";
import { campusContentDefaults, campusTextFields } from "./campusContent.js";
import "./CampusImagesConfigurationPage.css";

const brandLines = [
  { key: "dashboardTitle", label: "First Line Text", description: "Main college title", min: 12, max: 48 },
  { key: "dashboardSubtitle", label: "Second Line Text", description: "College subtitle", min: 8, max: 48 },
  { key: "dashboardTagline", label: "Tagline Text", description: "Optional college tagline", min: 6, max: 24 },
];

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
  const [headerSnapshot, setHeaderSnapshot] = useState(null);
  const configureButton = useRef(null);
  const [text, setText] = useState({ ...campusContentDefaults, ...headerBrandDefaults });
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
    setHeaderSnapshot(null);
    setText({ ...campusContentDefaults, ...headerBrandDefaults });
    setError("");
    setMessage("");
    setUploading(0);
    readCampusImages(selectedCampusId)
      .then((value) => {
        if (active) {
          setImages(value);
          setText({ ...campusContentDefaults, ...value, ...getHeaderBrand(value) });
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
      const src = await readCampusImageFile(file, { allowSvg: slot === "dashboardLogo" });
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
    if (page === "landing" && !text.dashboardTitle.trim()) {
      setError("Enter the Header Title Text before saving.");
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
      if (page === "landing") Object.assign(next, getHeaderBrand({ ...text, dashboardTitle: text.dashboardTitle.trim() }));
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
  const cancelHeader = useCallback(() => {
    if (saveLock.current || !headerSnapshot) return;
    uploadSequence.current.dashboardLogo = (uploadSequence.current.dashboardLogo || 0) + 1;
    setText((previous) => ({ ...previous, ...headerSnapshot.brand }));
    setImages((previous) => {
      const next = { ...previous };
      if (headerSnapshot.logo) next.dashboardLogo = headerSnapshot.logo;
      else delete next.dashboardLogo;
      return next;
    });
    setHeaderSnapshot(null);
    setError("");
    queueMicrotask(() => configureButton.current?.focus());
  }, [headerSnapshot]);
  useEffect(() => {
    if (!headerSnapshot) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") cancelHeader();
      if (event.key !== "Tab") return;
      const dialog = document.querySelector(".campus-header-dialog");
      const controls = dialog?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [headerSnapshot, cancelHeader]);
  const saveHeader = async () => {
    if (saveLock.current || uploading || !headerSnapshot || !selectedCampusId) return;
    if (!text.dashboardTitle.trim()) { setError("Enter the First Line Text before saving."); return; }
    const activeScope = pageScope;
    const campus = selectedCampusId;
    const brand = getHeaderBrand({ ...text, dashboardTitle: text.dashboardTitle.trim() });
    const logo = images.dashboardLogo;
    saveLock.current = true;
    setBusy(true);
    setError("");
    try {
      const latest = await readCampusImages(campus);
      const next = { ...latest, ...brand };
      if (logo) next.dashboardLogo = logo;
      else delete next.dashboardLogo;
      await saveCampusImages(campus, next);
      if (scope.current === activeScope) {
        setText((previous) => ({ ...previous, ...brand }));
        setHeaderSnapshot(null);
        setMessage("Header configuration saved in this browser.");
        queueMicrotask(() => configureButton.current?.focus());
      }
    } catch (failure) {
      if (scope.current === activeScope) setError(failure.message);
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  };
  const renderImageCards = (fields) => fields.map(([slot, title, description, kind]) => (
                <Fragment key={slot}>
                <section className={`campus-images-card ${slot === "dashboardLogo" ? "campus-header-logo-card" : ""}`}>
                  <h2>{slot === "dashboardLogo" ? "Header Logo" : title}</h2>
                  <p>{slot === "dashboardLogo" ? "Logo shown at the top left of the application. Upload the logo only; configure the name separately." : description}</p>
                  <div className={`campus-images-preview ${kind}`}>
                    {images[slot] ? (
                      slot !== "dashboardLogo" && kind === "logo" ? <CampusBrandImage slot={slot} src={images[slot]} alt={`${title} preview`} /> : <img src={images[slot]} alt={`${title} preview`} style={slot === "dashboardLogo" ? { width: Number(text.dashboardLogoSize), height: Number(text.dashboardLogoSize), padding: 0 } : undefined} />
                    ) : kind === "logo" ? (
                      slot !== "dashboardLogo" ? <CampusBrandImage slot={slot} src={defaultLogo} alt="Default college logo" /> : <img src={defaultHeaderLogo} alt="Default college logo" style={{ width: Number(text.dashboardLogoSize), height: Number(text.dashboardLogoSize), padding: 0 }} />
                    ) : (
                      <span>Existing image slider will be used</span>
                    )}
                  </div>
                  <label className="campus-images-upload">
                    Choose {slot === "dashboardLogo" ? "Header Logo" : title}
                    <input
                      type="file"
                      autoFocus={slot === "dashboardLogo"}
                      accept={slot === "dashboardLogo" ? "image/png,image/svg+xml,image/jpeg,image/webp" : "image/png,image/jpeg,image/webp"}
                      disabled={busy || !selectedCampusId}
                      onChange={(event) => {
                        upload(slot, event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {slot === "dashboardLogo" && <label className="campus-brand-control">
                    Logo Size <output>{text.dashboardLogoSize}px</output>
                    <input type="range" min="24" max="72" value={text.dashboardLogoSize} disabled={busy} onChange={(event) => { setText((previous) => ({ ...previous, dashboardLogoSize: event.target.value })); setMessage(""); }} />
                  </label>}
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
                {slot === "dashboardLogo" && <>
                  <section className="campus-images-card campus-header-title-card">
                    <h2>Header Title Text</h2>
                    <p>Customize each header line independently.</p>
                    {brandLines.map((line) => <fieldset key={line.key} className="campus-brand-line-fields">
                      <legend>{line.label}{line.key === "dashboardTagline" ? " (Optional)" : ""}</legend>
                      <label className="campus-brand-control">{line.label}
                        <input type="text" maxLength={300} required={line.key === "dashboardTitle"} disabled={busy} value={text[line.key]} onChange={(event) => { setText((previous) => ({ ...previous, [line.key]: event.target.value })); setMessage(""); }} />
                      </label>
                      <label className="campus-brand-control">{line.label.replace(" Text", "")} Font Size <output>{Math.round(Number(text[line.key + "Size"]))}px</output>
                        <input type="range" min={line.min} max={line.max} step="1" disabled={busy} value={text[line.key + "Size"]} onChange={(event) => { setText((previous) => ({ ...previous, [line.key + "Size"]: event.target.value })); setMessage(""); }} />
                      </label>
                      <label className="campus-brand-control">Text Color
                        <span className="campus-brand-color"><input type="color" disabled={busy} value={text[line.key + "Color"]} onChange={(event) => { setText((previous) => ({ ...previous, [line.key + "Color"]: event.target.value })); setMessage(""); }} /><output>{text[line.key + "Color"]}</output></span>
                      </label>
                      <label className="campus-brand-control">Font Weight
                        <select disabled={busy} value={text[line.key + "Weight"]} onChange={(event) => { setText((previous) => ({ ...previous, [line.key + "Weight"]: event.target.value })); setMessage(""); }}>
                          <option value="400">Regular</option><option value="500">Medium</option><option value="600">Semi Bold</option><option value="700">Bold</option><option value="800">Extra Bold</option>
                        </select>
                      </label>
                      <fieldset className="campus-brand-alignment"><legend>Text Alignment</legend>
                        {[["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]].map(([alignment, Icon]) => <button key={alignment} type="button" disabled={busy} aria-label={`${line.label}: align ${alignment}`} aria-pressed={text[line.key + "Align"] === alignment} onClick={() => { setText((previous) => ({ ...previous, [line.key + "Align"]: alignment })); setMessage(""); }}><Icon size={18} /></button>)}
                      </fieldset>
                    </fieldset>)}
                  </section>
                  <section className="campus-images-card campus-header-preview-card">
                    <h2>Live Preview (Header)</h2>
                    <div className="campus-header-live-preview"><HeaderBrand configuration={{ ...text, dashboardLogo: images.dashboardLogo }} /></div>
                    <p>The header scales to the available space. Long lines use ellipsis without wrapping.</p>
                  </section>
                </>}
                </Fragment>
  ));

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
            PNG, JPEG, or WebP (also SVG for Header Logo). Maximum 2 MB per image. Logo images work best with a transparent
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
            <div className={`campus-images-grid ${page === "landing" ? "campus-images-grid-with-brand" : ""}`}>
              {page === "landing" && <section className="campus-images-card campus-header-summary">
                <h2>Header Configuration</h2>
                <p>Manage header logo, title text and preview.</p>
                <div className="campus-header-summary-row">
                  <div className="campus-header-summary-preview"><HeaderBrand configuration={{ ...text, dashboardLogo: images.dashboardLogo }} /></div>
                  <button ref={configureButton} type="button" className="cms-btn cms-btn-primary" disabled={busy || !selectedCampusId} onClick={() => { setHeaderSnapshot({ brand: getHeaderBrand(text), logo: images.dashboardLogo }); setError(""); }}><Settings size={16} /> Configure</button>
                </div>
              </section>}

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
              {renderImageCards(imageFields.filter(([slot]) => slot !== "dashboardLogo"))}
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
        {headerSnapshot && page === "landing" && <Modal title="Header Configuration" className="campus-header-dialog" onClose={cancelHeader} closeOnOverlay={!busy} footer={<>
          <button type="button" className="cms-btn cms-btn-ghost" disabled={busy} onClick={cancelHeader}>Cancel</button>
          <button type="button" className="cms-btn cms-btn-primary" disabled={busy || uploading > 0 || !selectedCampusId} onClick={saveHeader}>{busy ? "Saving..." : uploading ? "Reading image..." : "Save Changes"}</button>
        </>}>
          {error && <p className="campus-images-error" role="alert">{error}</p>}
          <div className="campus-images-page campus-header-dialog-content"><div className="campus-images-grid campus-images-grid-with-brand">{renderImageCards(imageFields.filter(([slot]) => slot === "dashboardLogo"))}</div></div>
        </Modal>}
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

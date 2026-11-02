import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Check,
  CheckCircle2,
  Camera,
  Trash2,
  ExternalLink,
  RotateCw,
  UploadCloud,
  Eye,
  Monitor,
  Sparkles,
} from "lucide-react";
import { ScreenVisualMockup } from "../screenPreviews";
import {
  getScreenImageUrl,
  resolveScreenImage,
  uploadScreenScreenshot,
  deleteScreenScreenshot,
  subscribeScreenImages,
  sanitizeScreenKey,
} from "../services/screenImageService";

export function ScreenPreviewModal({
  isOpen,
  onClose,
  screen,
  module,
  preview,
  isSelected,
  onToggleSelect,
  initialImageUrl = null,
}) {
  const [activeTab, setActiveTab] = useState("screenshot"); // "screenshot" | "live" | "upload"
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const fileInputRef = useRef(null);

  const screenKey = screen && module ? `${module.id}:${screen.id}` : "";
  const safeKey = sanitizeScreenKey(screenKey);
  const screenRoute = preview?.route || screen?.route || "/dashboard";

  // Resolve screenshot image & sync
  useEffect(() => {
    if (!isOpen || !safeKey) return;

    let isMounted = true;
    const immediate = getScreenImageUrl(safeKey, preview?.screenshotUrl);
    if (immediate) setImageUrl(immediate);

    resolveScreenImage(safeKey, preview?.screenshotUrl).then((resolved) => {
      if (isMounted && resolved) setImageUrl(resolved);
    });

    const unsubscribe = subscribeScreenImages((key, newUrl) => {
      if (key === "*" || key === safeKey) {
        if (newUrl) setImageUrl(newUrl);
        else if (newUrl === null) setImageUrl(preview?.screenshotUrl || null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isOpen, safeKey, preview?.screenshotUrl]);

  // Support Ctrl+V paste of screenshot anywhere in the modal
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            await handleProcessUpload(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, safeKey]);

  if (!isOpen || !screen || !preview) return null;

  const handleProcessUpload = async (file) => {
    if (!file) return;
    try {
      setIsUploading(true);
      setUploadError("");
      const newUrl = await uploadScreenScreenshot(safeKey, file);
      setImageUrl(newUrl);
      setActiveTab("screenshot");
    } catch (err) {
      setUploadError(err.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer?.files?.[0]) {
      await handleProcessUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveCustomImage = async () => {
    try {
      await deleteScreenScreenshot(safeKey);
      setImageUrl(preview.screenshotUrl || null);
      setActiveTab("screenshot");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="screen-preview-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(16, 32, 60, 0.5)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <div
        className="screen-preview-modal-dialog"
        style={{
          width: "100%",
          maxWidth: "920px",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid var(--cms-border, #e4e8f0)",
          boxShadow: "0 24px 60px rgba(16, 32, 60, 0.22)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "92vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && handleProcessUpload(e.target.files[0])}
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
        />

        {/* Modal Top Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--cms-border, #e4e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, var(--cms-primary-soft, #F1F4E2) 0%, #ffffff 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {preview.badgeIcon && (
              <img
                src={preview.badgeIcon}
                alt=""
                style={{ width: "38px", height: "38px", objectFit: "contain" }}
              />
            )}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "var(--cms-text, #10203c)" }}>
                  {preview.title || screen.name}
                </h3>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: "#eef5e7",
                    color: "var(--cms-primary-dark, #566900)",
                    border: "1px solid rgba(111, 132, 0, 0.2)",
                  }}
                >
                  {module?.name || "Module"}
                </span>
                {imageUrl && (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      background: "#dcfce7",
                      color: "#166534",
                      border: "1px solid #bbf7d0",
                    }}
                  >
                    REAL SCREENSHOT
                  </span>
                )}
              </div>
              <div style={{ fontSize: "12px", color: "var(--cms-muted, #7B8275)", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                <span>Route:</span>
                <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: "4px", color: "#334155", fontSize: "11.5px", border: "1px solid #e2e8f0" }}>
                  {screenRoute}
                </code>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Preview"
            style={{
              background: "transparent",
              border: "1px solid var(--cms-border, #e4e8f0)",
              color: "var(--cms-muted, #7B8275)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.16s",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div
          style={{
            padding: "8px 24px",
            borderBottom: "1px solid var(--cms-border, #e4e8f0)",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => setActiveTab("screenshot")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: activeTab === "screenshot" ? "1px solid var(--cms-primary, #6F8400)" : "1px solid transparent",
                background: activeTab === "screenshot" ? "var(--cms-primary-soft, #F1F4E2)" : "transparent",
                color: activeTab === "screenshot" ? "var(--cms-primary-dark, #566900)" : "var(--cms-muted, #7B8275)",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Eye size={14} />
              <span>{imageUrl ? "Screenshot View" : "Mockup View"}</span>
            </button>

            <button
              onClick={() => setActiveTab("live")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: activeTab === "live" ? "1px solid var(--cms-primary, #6F8400)" : "1px solid transparent",
                background: activeTab === "live" ? "var(--cms-primary-soft, #F1F4E2)" : "transparent",
                color: activeTab === "live" ? "var(--cms-primary-dark, #566900)" : "var(--cms-muted, #7B8275)",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Monitor size={14} />
              <span>Live Interactive Screen</span>
            </button>

            <button
              onClick={() => setActiveTab("upload")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: activeTab === "upload" ? "1px solid var(--cms-primary, #6F8400)" : "1px solid transparent",
                background: activeTab === "upload" ? "var(--cms-primary-soft, #F1F4E2)" : "transparent",
                color: activeTab === "upload" ? "var(--cms-primary-dark, #566900)" : "var(--cms-muted, #7B8275)",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Camera size={14} />
              <span>{imageUrl ? "Replace Screenshot" : "Upload Screenshot"}</span>
            </button>
          </div>

          {/* Quick Actions for active image */}
          {imageUrl && activeTab === "screenshot" && (
            <button
              onClick={handleRemoveCustomImage}
              title="Reset to default vector mockup"
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "1px solid #fee2e2",
                background: "#fef2f2",
                color: "#dc2626",
                fontSize: "11.5px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Trash2 size={12} />
              <span>Reset to Mockup</span>
            </button>
          )}
        </div>

        {/* Modal Main Content */}
        <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "18px", background: "#f8fafc" }}>
          {/* TAB 1: SCREENSHOT / MOCKUP VIEW */}
          {activeTab === "screenshot" && (
            <div
              style={{
                width: "100%",
                height: "360px",
                borderRadius: "10px",
                overflow: "hidden",
                border: "1px solid var(--cms-border, #e4e8f0)",
                background: "#ffffff",
                boxShadow: "0 4px 14px rgba(16, 32, 60, 0.06)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {imageUrl ? (
                /* High-Res Browser Frame with Real Image */
                <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
                  <div
                    style={{
                      height: "26px",
                      background: "#f1f5f9",
                      borderBottom: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 12px",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", gap: "5px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: "18px",
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "4px",
                        fontSize: "10.5px",
                        color: "#475569",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 8px",
                        fontWeight: 500,
                      }}
                    >
                      {screenRoute}
                    </div>
                  </div>
                  <div style={{ flex: 1, position: "relative", overflow: "auto", background: "#f8fafc" }}>
                    <img
                      src={imageUrl}
                      alt={screen.name}
                      style={{ width: "100%", height: "auto", display: "block" }}
                    />
                  </div>
                </div>
              ) : (
                /* Vector Micro-UI Mockup Engine */
                <ScreenVisualMockup preview={preview} isSelected={isSelected} />
              )}
            </div>
          )}

          {/* TAB 2: LIVE INTERACTIVE SCREEN (IFRAME SANDBOX) */}
          {activeTab === "live" && (
            <div
              style={{
                width: "100%",
                height: "380px",
                borderRadius: "10px",
                overflow: "hidden",
                border: "1px solid var(--cms-border, #e4e8f0)",
                background: "#ffffff",
                boxShadow: "0 4px 14px rgba(16, 32, 60, 0.06)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Live Sandbox Control Toolbar */}
              <div
                style={{
                  height: "32px",
                  background: "#f1f5f9",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
                  <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#166534" }}>LIVE REACT COMPONENT SANDBOX</span>
                  <code style={{ fontSize: "10.5px", color: "#64748b", background: "#ffffff", padding: "1px 6px", borderRadius: "4px" }}>
                    {screenRoute}
                  </code>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    onClick={() => setIframeKey((prev) => prev + 1)}
                    title="Reload live screen"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#64748b",
                      cursor: "pointer",
                      padding: "4px",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <RotateCw size={13} />
                  </button>
                  <a
                    href={screenRoute}
                    target="_blank"
                    rel="noreferrer"
                    title="Open screen in new tab"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#64748b",
                      cursor: "pointer",
                      padding: "4px",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>

              {/* Sandboxed Live Iframe */}
              <div style={{ flex: 1, position: "relative", background: "#ffffff" }}>
                <iframe
                  key={iframeKey}
                  src={screenRoute}
                  title={screen.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    display: "block",
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD / REPLACE SCREENSHOT */}
          {activeTab === "upload" && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleFileDrop}
              style={{
                width: "100%",
                height: "360px",
                borderRadius: "10px",
                border: `2px dashed ${dragActive ? "var(--cms-primary, #6F8400)" : "#cbd5e1"}`,
                background: dragActive ? "var(--cms-primary-soft, #F1F4E2)" : "#ffffff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "30px",
                textAlign: "center",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "12px",
                  background: "var(--cms-primary-soft, #F1F4E2)",
                  color: "var(--cms-primary, #6F8400)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "14px",
                }}
              >
                <UploadCloud size={28} />
              </div>

              <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "var(--cms-text, #10203c)" }}>
                Drag & Drop Real Screen Screenshot
              </h4>
              <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--cms-muted, #7B8275)", maxWidth: "420px" }}>
                Supports <strong>PNG, JPG, or WEBP</strong> up to 15MB. Or simply copy a screenshot and press{" "}
                <kbd style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "1px 6px" }}>
                  Ctrl + V
                </kbd>{" "}
                to paste directly!
              </p>

              {uploadError && (
                <div style={{ color: "#dc2626", fontSize: "12px", marginBottom: "12px", fontWeight: 600 }}>
                  {uploadError}
                </div>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{
                  padding: "9px 20px",
                  borderRadius: "8px",
                  background: "var(--cms-primary, #6F8400)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: "none",
                  cursor: isUploading ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(111, 132, 0, 0.25)",
                }}
              >
                <Camera size={15} />
                <span>{isUploading ? "Uploading..." : "Browse Image File"}</span>
              </button>
            </div>
          )}

          {/* Description & Metadata Card */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "10px",
              padding: "16px 20px",
              border: "1px solid var(--cms-border, #e4e8f0)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              boxShadow: "0 1px 3px rgba(16, 32, 60, 0.04)",
            }}
          >
            <div>
              <div style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--cms-muted, #7B8275)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                Screen Purpose & Scope
              </div>
              <p style={{ margin: 0, fontSize: "13.5px", color: "var(--cms-text, #10203c)", lineHeight: 1.55 }}>
                {preview.description || screen.description || "Administrative view for this management area."}
              </p>
            </div>

            {/* Key Capabilities */}
            {preview.features && preview.features.length > 0 && (
              <div>
                <div style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--cms-muted, #7B8275)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  Key Capabilities in this Screen
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {preview.features.map((feat, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: "#eef5e7",
                        color: "var(--cms-primary-dark, #566900)",
                        border: "1px solid rgba(111, 132, 0, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <CheckCircle2 size={13} color="#6F8400" />
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--cms-border, #e4e8f0)",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: "13px", color: "var(--cms-muted, #7B8275)" }}>
            Status:{" "}
            <span
              style={{
                fontWeight: 700,
                color: isSelected ? "var(--cms-primary-dark, #566900)" : "var(--cms-muted, #7B8275)",
              }}
            >
              {isSelected ? "Selected for Role" : "Not Selected"}
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--cms-border, #e4e8f0)",
                background: "transparent",
                color: "var(--cms-text, #10203c)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Done Viewing
            </button>
            <button
              onClick={() => {
                onToggleSelect(screen.id);
              }}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                background: isSelected ? "#dc2626" : "var(--cms-primary, #6F8400)",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: isSelected ? "0 2px 8px rgba(220, 38, 38, 0.25)" : "0 2px 8px rgba(111, 132, 0, 0.3)",
              }}
            >
              {isSelected ? (
                <>
                  <X size={15} /> Remove Screen from Role
                </>
              ) : (
                <>
                  <Check size={15} /> Select Screen for Role
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

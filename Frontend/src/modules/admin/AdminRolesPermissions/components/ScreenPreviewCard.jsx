import React, { useState, useEffect, useRef } from "react";
import { Check, Maximize2, Camera, Trash2, Image as ImageIcon } from "lucide-react";
import { getScreenPreview, ScreenVisualMockup } from "../screenPreviews";
import {
  getScreenImageUrl,
  resolveScreenImage,
  uploadScreenScreenshot,
  deleteScreenScreenshot,
  subscribeScreenImages,
  sanitizeScreenKey,
} from "../services/screenImageService";

export const ScreenPreviewCard = React.memo(function ScreenPreviewCard({
  screen,
  module,
  isSelected = false,
  onToggleSelect,
  onInspect,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const preview = getScreenPreview(module.id, screen.id);
  const screenKey = `${module.id}:${screen.id}`;
  const safeKey = sanitizeScreenKey(screenKey);

  // Check and resolve image on mount & when key changes
  useEffect(() => {
    let isMounted = true;

    // Check immediate cache/explicit URL
    const immediateUrl = getScreenImageUrl(safeKey, preview.screenshotUrl);
    if (immediateUrl) {
      setImageUrl(immediateUrl);
    }

    // Resolve from IndexedDB or static folder
    resolveScreenImage(safeKey, preview.screenshotUrl).then((resolved) => {
      if (isMounted && resolved) {
        setImageUrl(resolved);
      }
    });

    // Subscribe to updates (e.g. upload from modal or another card)
    const unsubscribe = subscribeScreenImages((updatedKey, newUrl) => {
      if (updatedKey === "*" || updatedKey === safeKey) {
        if (newUrl) {
          setImageUrl(newUrl);
        } else if (newUrl === null) {
          setImageUrl(preview.screenshotUrl || null);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [safeKey, preview.screenshotUrl]);

  const handleCardClick = (e) => {
    // If user clicked inside an action button (inspect, upload, delete), don't toggle selection
    if (e.target.closest(".preview-inspect-btn") || e.target.closest(".preview-action-btn")) {
      return;
    }
    onToggleSelect?.(screen.id);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const newUrl = await uploadScreenScreenshot(safeKey, file);
      setImageUrl(newUrl);
    } catch (err) {
      console.error("Failed to upload screenshot:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async (e) => {
    e.stopPropagation();
    try {
      await deleteScreenScreenshot(safeKey);
      setImageUrl(preview.screenshotUrl || null);
    } catch (err) {
      console.error("Failed to delete screenshot:", err);
    }
  };

  return (
    <div
      className={`screen-preview-card ${isSelected ? "is-selected" : ""}`}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderRadius: "12px",
        background: "#ffffff",
        border: isSelected
          ? "2px solid var(--cms-primary, #6F8400)"
          : "1.5px solid var(--cms-border, #e4e8f0)",
        boxShadow: isSelected
          ? "0 0 0 1px var(--cms-primary, #6F8400), 0 6px 18px rgba(111, 132, 0, 0.16)"
          : isHovered
          ? "0 6px 16px rgba(16, 32, 60, 0.08)"
          : "0 1px 3px rgba(16, 32, 60, 0.04)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
      />

      {/* Top Card Header */}
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          borderBottom: "1px solid var(--cms-border, #e4e8f0)",
          background: isSelected ? "var(--cms-primary-soft, #F1F4E2)" : "#ffffff",
          transition: "background 0.2s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
          {/* Custom Checkbox Pill */}
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "6px",
              background: isSelected ? "var(--cms-primary, #6F8400)" : "#ffffff",
              border: isSelected ? "none" : "1.5px solid #94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.18s ease",
              flexShrink: 0,
              boxShadow: isSelected ? "0 2px 6px rgba(111, 132, 0, 0.3)" : "none",
            }}
          >
            {isSelected && <Check size={13} color="#ffffff" strokeWidth={3} />}
          </div>

          <h4
            style={{
              margin: 0,
              fontSize: "13.5px",
              fontWeight: 700,
              color: isSelected ? "var(--cms-primary-dark, #566900)" : "var(--cms-text, #10203c)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={screen.name}
          >
            {screen.name}
          </h4>
        </div>

        {/* Action Buttons in Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {/* Upload / Replace Screenshot Quick Button */}
          <button
            className="preview-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            title={imageUrl ? "Replace Screenshot" : "Upload Screenshot"}
            style={{
              background: "var(--cms-bg, #f4f6fb)",
              border: "1px solid var(--cms-border, #e4e8f0)",
              borderRadius: "6px",
              color: imageUrl ? "var(--cms-primary-dark, #566900)" : "var(--cms-muted, #7B8275)",
              padding: "4px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.16s ease",
            }}
          >
            <Camera size={12} />
          </button>

          {/* Inspect Preview Button */}
          <button
            className="preview-inspect-btn"
            onClick={(e) => {
              e.stopPropagation();
              onInspect?.(screen, module, preview, imageUrl);
            }}
            title="Inspect Screen Details & Full Preview"
            style={{
              background: "var(--cms-bg, #f4f6fb)",
              border: "1px solid var(--cms-border, #e4e8f0)",
              borderRadius: "6px",
              color: "var(--cms-muted, #7B8275)",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.16s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#ffffff";
              e.currentTarget.style.background = "var(--cms-primary, #6F8400)";
              e.currentTarget.style.borderColor = "var(--cms-primary, #6F8400)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--cms-muted, #7B8275)";
              e.currentTarget.style.background = "var(--cms-bg, #f4f6fb)";
              e.currentTarget.style.borderColor = "var(--cms-border, #e4e8f0)";
            }}
          >
            <Maximize2 size={12} />
            <span>Zoom</span>
          </button>
        </div>
      </div>

      {/* Screen Visual Mockup or Real Screenshot Window */}
      <div
        style={{
          height: "135px",
          padding: "8px 10px 4px 10px",
          position: "relative",
          overflow: "hidden",
          background: "#fafbfc",
        }}
      >
        {imageUrl ? (
          /* Real High-Resolution Screenshot Frame */
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: "#ffffff",
              border: `1px solid ${isSelected ? "var(--cms-primary, #6F8400)" : "#e2e8f0"}`,
              display: "flex",
              flexDirection: "column",
              boxShadow: isSelected
                ? "0 0 0 2px rgba(111, 132, 0, 0.2), 0 4px 12px rgba(111, 132, 0, 0.08)"
                : "0 2px 6px rgba(16, 32, 60, 0.05)",
              position: "relative",
            }}
          >
            {/* Mini Browser Bar */}
            <div
              style={{
                height: "20px",
                background: "#f1f5f9",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                padding: "0 8px",
                gap: "6px",
                zIndex: 2,
              }}
            >
              <div style={{ display: "flex", gap: "4px" }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#ef4444" }} />
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#f59e0b" }} />
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981" }} />
              </div>
              <div
                style={{
                  flex: 1,
                  height: "13px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "3px",
                  fontSize: "8.5px",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 6px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontWeight: 500,
                }}
              >
                {preview.route || screen.route || "/dashboard"}
              </div>

              {/* Badge: Real Screenshot */}
              <span
                style={{
                  fontSize: "8px",
                  fontWeight: 800,
                  color: "#166534",
                  background: "#dcfce7",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  letterSpacing: "0.2px",
                }}
              >
                REAL SCREEN
              </span>
            </div>

            {/* Real Screenshot Image with Smooth Zoom */}
            <div
              style={{
                flex: 1,
                position: "relative",
                overflow: "hidden",
                background: "#f8fafc",
              }}
            >
              <img
                src={imageUrl}
                alt={screen.name}
                onError={() => setImageUrl(null)} // fallback to mockup on error
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top center",
                  transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: isHovered ? "scale(1.06)" : "scale(1)",
                }}
              />

              {/* Floating 3D Badge Icon */}
              {preview.badgeIcon && (
                <div
                  style={{
                    position: "absolute",
                    right: "8px",
                    bottom: "8px",
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(4px)",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 3px 8px rgba(16, 32, 60, 0.14)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 3,
                  }}
                >
                  <img
                    src={preview.badgeIcon}
                    alt=""
                    style={{ width: "24px", height: "24px", objectFit: "contain" }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Graceful Fallback: Vector Micro-UI Mockup Engine */
          <ScreenVisualMockup
            preview={preview}
            isHovered={isHovered}
            isSelected={isSelected}
          />
        )}
      </div>

      {/* Card Footer Info */}
      <div
        style={{
          padding: "10px 14px 12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          marginTop: "auto",
          background: "#ffffff",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            color: "var(--cms-muted, #7B8275)",
            lineHeight: 1.45,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            height: "34px",
          }}
        >
          {preview.description || screen.description}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11.5px",
            borderTop: "1px solid var(--cms-border, #e4e8f0)",
            paddingTop: "8px",
          }}
        >
          <span style={{ color: "var(--cms-primary-dark, #566900)", fontWeight: 700 }}>
            {module.name}
          </span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "999px",
              background: isSelected ? "#eef5e7" : "var(--cms-bg, #f4f6fb)",
              color: isSelected ? "var(--cms-primary-dark, #566900)" : "var(--cms-muted, #7B8275)",
              fontWeight: 800,
              fontSize: "10.5px",
            }}
          >
            {isSelected ? "Selected" : "Click to Add"}
          </span>
        </div>
      </div>
    </div>
  );
});

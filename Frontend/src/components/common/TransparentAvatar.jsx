import React from "react";

/**
 * TransparentAvatar
 * An elegant, modern human silhouette avatar with transparent background.
 * Uses currentColor with semi-transparent opacities to harmonize seamlessly
 * with the portal's light/dark modes and theme color tokens.
 */
export default function TransparentAvatar({ size = 36, className = "", style = {} }) {
  const pixelSize = typeof size === "number" ? `${size}px` : size;

  return (
    <span
      className={`cms-transparent-avatar ${className}`.trim()}
      style={{
        width: pixelSize,
        height: pixelSize,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        flexShrink: 0,
        overflow: "hidden",
        verticalAlign: "middle",
        color: "var(--cms-primary, #6F8400)",
        ...style,
      }}
      aria-label="Default avatar"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {/* Soft translucent circular background tint */}
        <circle cx="50" cy="50" r="48" fill="currentColor" fillOpacity="0.09" />
        
        {/* Head outline / silhouette */}
        <circle cx="50" cy="37" r="17" fill="currentColor" fillOpacity="0.55" />
        
        {/* Ergonomic shoulders & chest contour */}
        <path
          d="M50 61C33.5 61 20 74 17.5 91C21 95 26.5 98 32 98H68C73.5 98 79 95 82.5 91C80 74 66.5 61 50 61Z"
          fill="currentColor"
          fillOpacity="0.55"
        />
      </svg>
    </span>
  );
}

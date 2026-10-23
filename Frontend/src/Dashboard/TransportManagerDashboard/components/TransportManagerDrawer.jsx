import React, { useEffect } from "react";
import { X } from "lucide-react";

export default function TransportManagerDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = "480px",
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="tm-drawer-backdrop" onClick={onClose}>
      <div
        className="tm-drawer-content"
        style={{ width, maxWidth: "100%" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="tm-drawer-header">
          <div>
            <h3 className="tm-drawer-title">{title}</h3>
            {subtitle && <p className="tm-drawer-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="tm-drawer-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="tm-drawer-body">{children}</div>
      </div>
    </div>
  );
}

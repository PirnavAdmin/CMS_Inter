import React, { useEffect } from "react";
import { X } from "lucide-react";

export default function TransportManagerModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "560px",
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
    <div className="tm-modal-backdrop" onClick={onClose}>
      <div
        className="tm-modal-content"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="tm-modal-header">
          <div>
            <h3 className="tm-modal-title">{title}</h3>
            {subtitle && <p className="tm-modal-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="tm-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="tm-modal-body">{children}</div>
      </div>
    </div>
  );
}

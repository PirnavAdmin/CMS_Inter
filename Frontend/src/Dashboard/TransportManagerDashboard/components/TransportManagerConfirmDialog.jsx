import React from "react";
import TransportManagerModal from "./TransportManagerModal.jsx";
import { AlertTriangle } from "lucide-react";

export default function TransportManagerConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed with this action?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDanger = false,
  loading = false,
}) {
  return (
    <TransportManagerModal isOpen={isOpen} onClose={onClose} title={title} maxWidth="420px">
      <div className="tm-confirm-dialog">
        <div className="tm-confirm-dialog__icon-wrap">
          <AlertTriangle
            size={28}
            className={isDanger ? "tm-confirm-dialog__icon--danger" : "tm-confirm-dialog__icon--warn"}
          />
        </div>
        <p className="tm-confirm-dialog__message">{message}</p>
        <div className="tm-confirm-dialog__actions">
          <button
            type="button"
            className="tm-btn tm-btn--secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`tm-btn ${isDanger ? "tm-btn--danger" : "tm-btn--primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </TransportManagerModal>
  );
}

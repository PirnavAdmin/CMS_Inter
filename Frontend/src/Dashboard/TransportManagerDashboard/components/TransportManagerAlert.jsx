import React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export default function TransportManagerAlert({
  type = "info",
  title,
  message,
  onClose,
  action,
}) {
  const Icon = {
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: AlertCircle,
    info: Info,
  }[type] || Info;

  return (
    <div className={`tm-alert tm-alert--${type}`} role="alert">
      <div className="tm-alert__icon-wrap">
        <Icon size={18} className="tm-alert__icon" />
      </div>
      <div className="tm-alert__body">
        {title && <h5 className="tm-alert__title">{title}</h5>}
        {message && <div className="tm-alert__message">{message}</div>}
      </div>
      {action && <div className="tm-alert__action">{action}</div>}
      {onClose && (
        <button
          type="button"
          className="tm-alert__close"
          onClick={onClose}
          aria-label="Dismiss alert"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

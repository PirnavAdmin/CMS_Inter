import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X, AlertTriangle, Eye, EyeOff, Info } from "lucide-react";

export function StatusBadge({ value }) {
  const v = String(value || "").toLowerCase();
  let cls = "cms-badge-inactive";
  if (["active", "paid", "pass", "published", "present"].includes(v)) cls = "cms-badge-active";
  else if (["partial", "pending", "late"].includes(v)) cls = "cms-badge-warn";
  else if (["due", "fail", "absent"].includes(v)) cls = "cms-badge-danger";
  else if (["inactive"].includes(v)) cls = "cms-badge-inactive";
  return <span className={`cms-badge ${cls}`}>{value}</span>;
}

export function Loader({ label = "Loading data..." }) {
  return (
    <div className="cms-loader">
      <div className="cms-spinner" />
      <p style={{ margin: 0, color: "var(--cms-muted)", fontSize: 13 }}>{label}</p>
    </div>
  );
}

export function Toast({ message, onClose, type = "success" }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  const normalizedType = ["success", "error", "warning", "info"].includes(type) ? type : "info";
  const isError = normalizedType === "error";
  const Icon = normalizedType === "success" ? CheckCircle2 : normalizedType === "info" ? Info : AlertTriangle;
  return (
    <div className={`cms-toast cms-toast-${normalizedType}`} role={isError ? "alert" : "status"} aria-live={isError ? "assertive" : "polite"}>
      <Icon size={18} />
      <span className="cms-toast-message">{message}</span>
      <button type="button" className="cms-toast-close" onClick={onClose} aria-label="Dismiss notification"><X size={15} /></button>
    </div>
  );
}

export function Modal({ title, children, footer, onClose, size, className = "", closeOnOverlay = true }) {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const dialog = (
    <div
      className="cms-overlay"
      onMouseDown={(e) => closeOnOverlay && e.target === e.currentTarget && onClose()}
    >
      <div className={`cms-modal ${size === "sm" ? "sm" : ""} ${className}`.trim()} role="dialog" aria-modal="true">
        <div className="cms-modal-head">
          <h3>{title}</h3>
          <button className="cms-action-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="cms-modal-body">{children}</div>
        {footer ? <div className="cms-modal-foot">{footer}</div> : null}
      </div>
    </div>
  );

  if (typeof document === "undefined") return dialog;
  return createPortal(dialog, document.body);
}

export function ConfirmDialog({ title = "Confirm action", message, onCancel, onConfirm, loading = false, confirmLabel = "Confirm", loadingLabel = "Please wait...", danger = false }) {
  return (
    <Modal
      title={title}
      size="sm"
      className="cms-confirm-dialog"
      onClose={loading ? () => {} : onCancel}
      footer={
        <>
          <button className="cms-btn cms-btn-ghost" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className={`cms-btn ${danger ? "cms-btn-danger" : "cms-btn-primary"}`} onClick={onConfirm} disabled={loading}>{loading ? loadingLabel : confirmLabel}</button>
        </>
      }
    >
      <div className={`cms-confirm-content ${danger ? "is-danger" : ""}`}>
        <p className="cms-confirm-message">
          {message || "This action cannot be undone. Are you sure you want to delete this record?"}
        </p>
      </div>
    </Modal>
  );
}

export function useConfirmDialog() {
  const [options, setOptions] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((nextOptions) => new Promise((resolve) => {
    resolverRef.current = resolve;
    setOptions(typeof nextOptions === "string" ? { message: nextOptions } : nextOptions);
  }), []);

  const finish = useCallback((result) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setOptions(null);
    resolve?.(result);
  }, []);

  const confirmationDialog = options ? (
    <ConfirmDialog
      {...options}
      onCancel={() => finish(false)}
      onConfirm={() => finish(true)}
    />
  ) : null;

  return { confirm, confirmationDialog };
}

export function Field({ field = {}, value, error, onChange, onBlur }) {
  const [reveal, setReveal] = useState(false);
  if (!field || typeof field !== "object") return null;
  const { name = "", label = "", type = "text", options = [], required = false, placeholder = "", full = false, disabled = false, min, max, step, autoComplete } = field;
  const id = `f-${name}`;
  const isPassword = type === "password";
  const safeOpts = Array.isArray(options) ? options : [];
  const normalizedOptions = safeOpts.map((option) => (
    option && typeof option === "object"
      ? { value: option.value, label: option.label ?? option.value, disabled: Boolean(option.disabled) }
      : { value: option, label: option }
  ));
  const handleChange = (val) => {
    if (typeof onChange === "function") onChange(name, val);
  };
  return (
    <div className={`cms-field ${full ? "full" : ""} ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>
        {label} {required ? <span className="req">*</span> : null}
      </label>
      {type === "select" ? (
        <select id={id} name={name} value={value ?? ""} disabled={disabled} onChange={(e) => handleChange(e.target.value)} onBlur={() => onBlur?.(name)}>
          <option value="">Select {label}</option>
          {normalizedOptions.map((o, index) => (
            <option key={`${o.value}-${index}`} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea id={id} name={name} value={value ?? ""} disabled={disabled} placeholder={placeholder} onChange={(e) => handleChange(e.target.value)} onBlur={() => onBlur?.(name)} />
      ) : type === "checkbox" ? (
        <span className="cms-check">
          <input id={id} name={name} type="checkbox" disabled={disabled} checked={!!value} onChange={(e) => handleChange(e.target.checked)} />
          <span>{placeholder || "Yes"}</span>
        </span>
      ) : isPassword ? (
        <span className="cms-password">
          <input
            id={id}
            name={name}
            type={reveal ? "text" : "password"}
            value={value ?? ""}
            disabled={disabled}
            autoComplete={autoComplete}
            placeholder={placeholder || label}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => onBlur?.(name)}
          />
          <button
            type="button"
            className="cms-eye-btn"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Hide password" : "Show password"}
            title={reveal ? "Hide password" : "Show password"}
          >
            {reveal ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </span>
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value ?? ""}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder={placeholder || label}
          min={min}
          max={max}
          step={step}
          onKeyDown={(e) => {
            if (type === "number" && Number(min) >= 0 && (e.key === "-" || e.key === "Subtract" || e.key === "e" || e.key === "E")) {
              e.preventDefault();
            }
          }}
          onPaste={(e) => {
            if (type === "number" && Number(min) >= 0) {
              const pasted = e.clipboardData.getData("text");
              if (pasted.trim().startsWith("-")) e.preventDefault();
            }
          }}
          onChange={(e) => {
            let raw = e.target.value;
            if (type === "number" && raw !== "" && min !== undefined && Number(raw) < Number(min)) {
              raw = String(min);
            }
            handleChange(raw);
          }}
          onBlur={() => onBlur?.(name)}
        />
      )}
      {error ? <span className="cms-error">{error}</span> : null}
    </div>
  );
}

export function useForm(fields, initial) {
  const [values, setValues] = useState(initial || {});
  const [errors, setErrors] = useState({});
  const setValue = (name, val) => {
    setValues((v) => ({ ...v, [name]: val }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };
  const validate = () => {
    const next = {};
    fields.forEach((f) => {
      const val = values[f.name];
      if (f.required && (val === undefined || val === null || String(val).trim() === "")) {
        next[f.name] = `${f.label} is required`;
      } else if (f.type === "email" && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        next[f.name] = "Enter a valid email address";
      } else if (f.type === "tel" && val && !/^[0-9]{10}$/.test(String(val))) {
        next[f.name] = "Enter a valid 10 digit mobile number";
      } else if (f.type === "number" && val && Number.isNaN(Number(val))) {
        next[f.name] = "Enter a valid number";
      } else if (f.type === "number" && val !== "" && f.min !== undefined && Number(val) < Number(f.min)) {
        next[f.name] = `${f.label} must be at least ${f.min}`;
      } else if (f.type === "number" && val !== "" && f.max !== undefined && Number(val) > Number(f.max)) {
        next[f.name] = `${f.label} must be no more than ${f.max}`;
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  return { values, errors, setValue, validate, setValues, setErrors };
}

export function FormModal({ title, fields, initial, columns = 2, onCancel, onSave }) {
  const { values, errors, setValue, validate } = useForm(fields, initial);
  const [saving, setSaving] = useState(false);
  const submit = () => {
    if (!validate()) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onSave(values);
    }, 500);
  };
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="cms-btn cms-btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
          <button className="cms-btn cms-btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <div className={`cms-form-grid ${columns === 3 ? "cols-3" : ""}`}>
        {fields.map((f) => (
          <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={setValue} />
        ))}
      </div>
    </Modal>
  );
}

export function FilterBar({ fields, values, onChange, onApply }) {
  return (
    <div className="cms-card" style={{ marginBottom: 16 }}>
      <div className="cms-card-body">
        <div className="cms-filters">
          {fields.map((f) => (
            <Field key={f.name} field={f} value={values[f.name]} onChange={onChange} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button className="cms-btn cms-btn-primary" onClick={onApply}>Load Data</button>
          <button className="cms-btn cms-btn-ghost" onClick={() => onChange("__reset__", null)}>Reset</button>
        </div>
      </div>
    </div>
  );
}

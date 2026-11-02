import React, { useState } from "react";
import { Megaphone, X, CheckCircle2 } from "lucide-react";
import {
  TARGET_AUDIENCES,
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PRIORITIES,
} from "@/services/announcementService.js";

export default function PrincipalNoticeModal({
  isOpen,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({
    title: "",
    targetAudience: "Non-Teaching Staff",
    category: "Administrative",
    priority: "Normal",
    publisher: "Principal Office",
    content: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Please enter a notice title.");
      return;
    }
    if (!form.content.trim()) {
      setError("Please enter notice content.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await onSubmit({
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        priority: form.priority,
        targetAudience: form.targetAudience,
        publisher: form.publisher || "Principal Office",
        publisherRole: "Principal",
      });
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to publish notice. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          width: "100%",
          maxWidth: 540,
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid #edf2f7",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Megaphone size={18} style={{ color: "#168a52" }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>
              Post Campus Notice / Circular
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: 14 }}>
            {error && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "#fee2e2",
                  border: "1px solid #fca5a5",
                  color: "#b91c1c",
                  borderRadius: 8,
                  fontSize: 12.5,
                }}
              >
                {error}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                Target Audience <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
              >
                {TARGET_AUDIENCES.map((aud) => (
                  <option key={aud.value} value={aud.value}>
                    {aud.label}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: "#64748b" }}>
                {form.targetAudience === "Non-Teaching Staff" ||
                form.targetAudience === "All Staff" ||
                form.targetAudience === "General / Campus-wide" ? (
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>
                    ✓ This notice will appear on the Non-Teaching Staff Dashboard announcements page.
                  </span>
                ) : (
                  <span style={{ color: "#d97706", fontWeight: 600 }}>
                    ⓘ This notice targets {form.targetAudience} and will not be displayed to Non-Teaching Staff.
                  </span>
                )}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                Notice Title <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Annual Campus Maintenance & Duty Instructions"
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
                required
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                  }}
                >
                  {ANNOUNCEMENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                  }}
                >
                  {ANNOUNCEMENT_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                Notice Body / Content <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write circular details, directions, or notices for staff..."
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                }}
                required
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
              padding: "12px 18px",
              borderTop: "1px solid #edf2f7",
              background: "#f8fafc",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                cursor: submitting ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 12.5,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: "none",
                background: "#168a52",
                color: "#ffffff",
                cursor: submitting ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 12.5,
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              <CheckCircle2 size={14} /> {submitting ? "Publishing..." : "Publish Notice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

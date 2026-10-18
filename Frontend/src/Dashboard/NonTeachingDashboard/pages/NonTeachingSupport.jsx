import React, { useState } from "react";
import {
  HelpCircle,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wrench,
  Monitor,
  FileQuestion,
  X,
  MessageSquare,
} from "lucide-react";
import { nonTeachingService } from "../services/nonTeachingService.js";

export default function NonTeachingSupport() {
  const [tickets, setTickets] = useState(() => nonTeachingService.getSupportTickets());
  const [showNewModal, setShowNewModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    category: "IT Support",
    priority: "Medium",
    description: "",
  });
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      showToast("Please provide both subject and description.");
      return;
    }

    const created = nonTeachingService.createSupportTicket(ticketForm);
    setTickets(nonTeachingService.getSupportTickets());
    setShowNewModal(false);
    setTicketForm({
      subject: "",
      category: "IT Support",
      priority: "Medium",
      description: "",
    });
    showToast(`Support ticket #${created.id} submitted successfully.`);
  };

  return (
    <>
      {toastMessage && (
        <div className="cms-toast-banner cms-toast-success" role="alert" style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}>
          <CheckCircle2 size={16} /> {toastMessage}
        </div>
      )}

      {/* Action Bar */}
      <section className="nts-filter-bar">
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--nts-text)" }}>
            Employee Helpdesk & Support Services
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--nts-muted)" }}>
            Raise facility maintenance, equipment repair, or IT support queries.
          </p>
        </div>

        <button
          type="button"
          className="nts-refresh-btn"
          onClick={() => setShowNewModal(true)}
        >
          <Plus size={15} /> Raise Support Ticket
        </button>
      </section>

      {/* Tickets List */}
      <section className="nts-card">
        <div className="nts-card-head">
          <h3>
            <HelpCircle size={16} style={{ color: "var(--nts-primary)" }} /> My Support Tickets ({tickets.length})
          </h3>
        </div>
        <div className="nts-card-body" style={{ gap: 12 }}>
          {tickets.map((t) => (
            <div
              key={t.id}
              style={{
                border: "1px solid var(--nts-border)",
                borderRadius: 10,
                padding: "14px 16px",
                background: "var(--nts-surface)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: "var(--nts-primary)" }}>#{t.id}</span>
                  <span className={`nts-pill-priority ${t.priority.toLowerCase()}`}>{t.priority}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--nts-muted)" }}>• {t.category}</span>
                  <span style={{ fontSize: 11, color: "var(--nts-muted)" }}>• Logged on {t.createdAt}</span>
                </div>

                <span className={`nts-status-badge ${t.status.toLowerCase().replace(/\s+/g, "-")}`}>
                  {t.status === "Resolved" && <CheckCircle2 size={12} />}
                  {t.status === "In Progress" && <Clock size={12} />}
                  {t.status === "Open" && <AlertCircle size={12} />}
                  {t.status}
                </span>
              </div>

              <div style={{ fontSize: 14, fontWeight: 750, color: "var(--nts-text)" }}>
                {t.subject}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--nts-muted)", lineHeight: 1.45 }}>
                {t.description}
              </div>

              {t.response && (
                <div
                  style={{
                    marginTop: 4,
                    padding: "8px 12px",
                    background: "var(--nts-subtle)",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "var(--nts-text)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <MessageSquare size={14} style={{ color: "var(--nts-primary)", flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>Helpdesk Response:</strong> {t.response}
                  </div>
                </div>
              )}
            </div>
          ))}

          {tickets.length === 0 && (
            <div style={{ textAlign: "center", padding: 32, color: "var(--nts-muted)" }}>
              No support tickets submitted yet.
            </div>
          )}
        </div>
      </section>

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="nts-modal-backdrop">
          <div className="nts-modal-container">
            <div className="nts-modal-head">
              <h3><Plus size={16} /> Submit New Support Ticket</h3>
              <button
                type="button"
                className="nts-modal-close"
                onClick={() => setShowNewModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="nts-modal-body">
                <div className="nts-form-group">
                  <label>Subject / Issue Summary *</label>
                  <input
                    type="text"
                    className="nts-form-control"
                    placeholder="e.g. Printer paper jam in Administrative Office"
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="nts-form-group">
                    <label>Category *</label>
                    <select
                      className="nts-form-control"
                      value={ticketForm.category}
                      onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                    >
                      <option value="IT Support">IT & Network Infrastructure</option>
                      <option value="Maintenance">Maintenance & Electrical</option>
                      <option value="Office Supplies">Office Supplies & Stationery</option>
                      <option value="Facility">Facility & Housekeeping</option>
                      <option value="HR & Payroll">HR & Payroll Query</option>
                    </select>
                  </div>

                  <div className="nts-form-group">
                    <label>Urgency / Priority *</label>
                    <select
                      className="nts-form-control"
                      value={ticketForm.priority}
                      onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Critical / Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="nts-form-group">
                  <label>Detailed Description *</label>
                  <textarea
                    rows={4}
                    className="nts-form-control"
                    placeholder="Describe the problem, room location, equipment serial # if applicable..."
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="nts-modal-foot">
                <button
                  type="button"
                  className="nts-action-btn"
                  onClick={() => setShowNewModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="nts-punch-btn in">
                  <Send size={14} /> Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

import { useState, useEffect } from "react";
import { MessageSquare, Phone, Mail, Send, Plus, Users, CheckCircle2, Clock, Eye } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { teachersDirectory, getStoredMessages, saveStoredMessages, useParentPortal } from "../parentData.js";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import "../ParentDashboard.css";

export default function ParentCommunicationPage() {
  const { parentUser } = useParentPortal();
  const [messages, setMessages] = useState(() => getStoredMessages(parentUser?.id));
  const [selectedThread, setSelectedThread] = useState(() => messages[0] || null);
  const [replyText, setReplyText] = useState("");
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [composeTeacherId, setComposeTeacherId] = useState(teachersDirectory[0]?.id || "");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (parentUser?.id) {
      const msgs = getStoredMessages(parentUser.id);
      setMessages(msgs);
      setSelectedThread(msgs[0] || null);
    }
  }, [parentUser?.id]);

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedThread) return;

    const newReply = {
      sender: "parent",
      senderName: parentUser?.name || "Parent",
      time: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      text: replyText.trim(),
    };

    const updatedThread = {
      ...selectedThread,
      snippet: replyText.trim(),
      date: "Just now",
      thread: [...selectedThread.thread, newReply],
    };

    const updated = messages.map((m) => (m.id === selectedThread.id ? updatedThread : m));
    setMessages(updated);
    setSelectedThread(updatedThread);
    saveStoredMessages(updated, parentUser?.id);
    setReplyText("");
    setToastMessage("Reply sent to teacher successfully!");
  };

  const handleComposeSubmit = (e) => {
    e.preventDefault();
    if (!composeSubject.trim() || !composeBody.trim()) return;

    const teacher = teachersDirectory.find((t) => t.id === composeTeacherId) || teachersDirectory[0];
    const newMsg = {
      id: `msg-${Date.now()}`,
      teacherId: teacher.id,
      teacherName: teacher.name,
      subject: composeSubject.trim(),
      snippet: composeBody.trim(),
      date: "Just now",
      thread: [
        {
          sender: "parent",
          senderName: parentUser?.name || "Parent",
          time: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          text: composeBody.trim(),
        },
      ],
    };

    const updated = [newMsg, ...messages];
    setMessages(updated);
    setSelectedThread(newMsg);
    saveStoredMessages(updated, parentUser?.id);
    setComposeModalOpen(false);
    setComposeSubject("");
    setComposeBody("");
    setToastMessage(`Message delivered to ${teacher.name}!`);
  };

  return (
    <DashboardLayout
      title="Communication"
      subtitle="Connect with class teachers, academic mentors, and college leadership"
      breadcrumb={["Parent Portal", "Communication"]}
      actions={
        <button type="button" className="cms-btn cms-btn-primary cms-btn-sm" onClick={() => setComposeModalOpen(true)}>
          <Plus size={14} /> Compose Message
        </button>
      }
    >
      <div className="parent-dashboard-wrapper">
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />

        {/* Teachers Directory Cards */}
        <div className="parent-card">
          <div className="parent-card-header">
            <h3 className="parent-card-title">
              <Users size={18} /> Faculty & Mentor Directory
            </h3>
            <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>Available for parent consultations</span>
          </div>
          <div className="parent-card-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {teachersDirectory.map((tea) => (
                <div key={tea.id} style={{ border: "1px solid var(--cms-border)", borderRadius: 12, padding: 16, background: "var(--cms-bg)" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                    <img src={tea.avatar} alt={tea.name} style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover" }} />
                    <div>
                      <strong style={{ fontSize: 14.5, display: "block" }}>{tea.name}</strong>
                      <span style={{ fontSize: 12.5, color: "var(--cms-muted)" }}>{tea.subject} • {tea.role}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--cms-muted)", marginBottom: 12 }}>
                    Consultation Hours: <strong>{tea.availableHours}</strong>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <a href={`tel:${tea.mobile}`} className="cms-btn cms-btn-sm cms-btn-outline" style={{ flex: 1, textDecoration: "none", textAlign: "center" }}>
                      <Phone size={13} /> Call
                    </a>
                    <a href={`mailto:${tea.email}`} className="cms-btn cms-btn-sm cms-btn-outline" style={{ flex: 1, textDecoration: "none", textAlign: "center" }}>
                      <Mail size={13} /> Email
                    </a>
                    <button
                      type="button"
                      className="cms-btn cms-btn-sm cms-btn-primary"
                      onClick={() => {
                        setComposeTeacherId(tea.id);
                        setComposeModalOpen(true);
                      }}
                      title="Send Portal Message"
                    >
                      <MessageSquare size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Message Threads Two-Column Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}>
          {/* Thread List */}
          <div className="parent-card">
            <div className="parent-card-header">
              <h3 className="parent-card-title" style={{ fontSize: 15 }}>
                <MessageSquare size={16} /> Message Threads
              </h3>
              <button type="button" className="cms-btn cms-btn-sm cms-btn-primary" onClick={() => setComposeModalOpen(true)}>
                <Plus size={13} />
              </button>
            </div>
            <div className="parent-card-body" style={{ padding: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedThread(m)}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      cursor: "pointer",
                      border: selectedThread?.id === m.id ? "1.5px solid var(--cms-primary)" : "1px solid var(--cms-border)",
                      background: selectedThread?.id === m.id ? "var(--cms-primary-soft)" : "var(--cms-bg)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <strong style={{ fontSize: 13.5, color: selectedThread?.id === m.id ? "var(--cms-primary-dark)" : "var(--cms-text)" }}>
                        {m.teacherName}
                      </strong>
                      <span style={{ fontSize: 11, color: "var(--cms-muted)" }}>{m.date}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{m.subject}</div>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--cms-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.snippet}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Conversation Box */}
          <div className="parent-card" style={{ display: "flex", flexDirection: "column" }}>
            <div className="parent-card-header">
              <div>
                <h3 className="parent-card-title">{selectedThread?.subject || "Select a message"}</h3>
                <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Teacher: {selectedThread?.teacherName}</span>
              </div>
            </div>
            <div className="parent-card-body" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, minHeight: 280, maxHeight: 420, overflowY: "auto" }}>
              {(selectedThread?.thread || []).map((t, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: t.sender === "parent" ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    background: t.sender === "parent" ? "var(--cms-primary-soft)" : "var(--cms-bg)",
                    border: "1px solid var(--cms-border)",
                    borderRadius: 12,
                    padding: "10px 14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4, fontSize: 12, color: "var(--cms-muted)" }}>
                    <strong>{t.senderName}</strong>
                    <span>{t.time}</span>
                  </div>
                  <div style={{ fontSize: 13.5, color: "var(--cms-text)" }}>{t.text}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--cms-border)", background: "var(--cms-bg)" }}>
              <form onSubmit={handleSendReply} style={{ display: "flex", gap: 10 }}>
                <input
                  type="text"
                  className="cms-input"
                  placeholder="Type your reply to teacher..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="cms-btn cms-btn-primary" disabled={!replyText.trim()}>
                  <Send size={15} /> Send Reply
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Compose Modal */}
        {composeModalOpen && (
          <Modal
            title="Compose Message to Faculty"
            onClose={() => setComposeModalOpen(false)}
            size="md"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={() => setComposeModalOpen(false)}>Cancel</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={handleComposeSubmit}>
                  <Send size={14} /> Deliver Message
                </button>
              </>
            }
          >
            <form onSubmit={handleComposeSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="cms-label">Recipient Faculty</label>
                <select
                  className="cms-select"
                  value={composeTeacherId}
                  onChange={(e) => setComposeTeacherId(e.target.value)}
                >
                  {teachersDirectory.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.subject} - {t.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="cms-label">Subject *</label>
                <input
                  type="text"
                  className="cms-input"
                  placeholder="E.g., Query regarding Quarterly maths preparation..."
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="cms-label">Message *</label>
                <textarea
                  className="cms-textarea"
                  rows={4}
                  placeholder="Write your note or question for the mentor..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  required
                />
              </div>
            </form>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}

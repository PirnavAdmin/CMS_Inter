import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Megaphone, Calendar, Search, Eye, CheckCircle2, Clock, MapPin } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { collegeAnnouncements, upcomingEvents } from "../parentData.js";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import "../ParentDashboard.css";

export default function ParentAnnouncementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "events" ? "events" : "notices";
  const [activeMainTab, setActiveMainTab] = useState(initialTab);

  // Notices state
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // Events state
  const [events, setEvents] = useState(upcomingEvents);
  const [selectedEventModal, setSelectedEventModal] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "events") {
      setActiveMainTab("events");
    } else if (tabParam === "notices") {
      setActiveMainTab("notices");
    }
  }, [searchParams]);

  const handleSwitchTab = (tab) => {
    setActiveMainTab(tab);
    setSearchParams(tab === "events" ? { tab: "events" } : {});
  };

  const handleToggleRsvp = (eventId) => {
    const updated = events.map((ev) => {
      if (ev.id === eventId) {
        const nextStatus = !ev.rsvp;
        setToastMessage(nextStatus ? `RSVP confirmed for "${ev.title}"!` : `RSVP cancelled for "${ev.title}".`);
        return { ...ev, rsvp: nextStatus };
      }
      return ev;
    });
    setEvents(updated);
  };

  const categories = ["all", "Examinations", "Academic", "Holidays", "Events"];

  const filteredNotices = collegeAnnouncements.filter((ann) => {
    const matchesCat = selectedCategory === "all" || ann.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesQuery = !query.trim() || ann.title.toLowerCase().includes(query.toLowerCase()) || ann.summary.toLowerCase().includes(query.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <DashboardLayout
      title="Announcements & Events"
      subtitle="Official notices, circulars, PTM schedules, and campus events"
      breadcrumb={["Parent Portal", activeMainTab === "events" ? "Events & PTM" : "Announcements & Notices"]}
    >
      <div className="parent-dashboard-wrapper">
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />

        {/* Top Tab Switcher */}
        <div className="parent-card" style={{ padding: "12px 20px" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className={`cms-btn cms-btn-sm ${activeMainTab === "notices" ? "cms-btn-primary" : "cms-btn-outline"}`}
              onClick={() => handleSwitchTab("notices")}
            >
              <Megaphone size={14} /> Circulars & Notices ({collegeAnnouncements.length})
            </button>
            <button
              type="button"
              className={`cms-btn cms-btn-sm ${activeMainTab === "events" ? "cms-btn-primary" : "cms-btn-outline"}`}
              onClick={() => handleSwitchTab("events")}
            >
              <Calendar size={14} /> Upcoming Events & PTM ({events.length})
            </button>
          </div>
        </div>

        {activeMainTab === "notices" ? (
          <>
            {/* Search & Category Filter */}
            <div className="parent-card" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 260 }}>
                  <Search size={16} color="var(--cms-muted)" />
                  <input
                    type="text"
                    className="cms-input"
                    placeholder="Search circulars and notices..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`cms-btn cms-btn-sm ${selectedCategory === cat ? "cms-btn-primary" : "cms-btn-outline"}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat === "all" ? "All Notices" : cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Announcements List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredNotices.map((ann) => (
                <div key={ann.id} className="parent-card">
                  <div className="parent-card-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className={`cms-badge ${ann.priority === "High" ? "cms-badge-danger" : ann.priority === "Important" ? "cms-badge-warn" : "cms-badge-active"}`}>
                        {ann.category}
                      </span>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{ann.title}</h3>
                    </div>
                    <span style={{ fontSize: 12.5, color: "var(--cms-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={13} /> {ann.date}
                    </span>
                  </div>
                  <div className="parent-card-body">
                    <p style={{ margin: "0 0 14px 0", fontSize: 14, lineHeight: 1.5, color: "var(--cms-text)" }}>
                      {ann.summary}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <span style={{ fontSize: 12, color: "var(--cms-muted)", fontStyle: "italic" }}>
                        Issued by: {ann.author}
                      </span>
                      <button
                        type="button"
                        className="cms-btn cms-btn-sm cms-btn-outline"
                        onClick={() => setSelectedAnnouncement(ann)}
                      >
                        <Eye size={13} /> Read Full Circular
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredNotices.length === 0 && (
                <div className="parent-card" style={{ padding: 40, textAlign: "center", color: "var(--cms-muted)" }}>
                  No announcements match your search criteria.
                </div>
              )}
            </div>
          </>
        ) : (
          /* Events Grid */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {events.map((ev) => (
              <div key={ev.id} className="parent-card" style={{ borderLeft: ev.rsvp ? "4px solid var(--cms-green)" : "4px solid var(--cms-primary)" }}>
                <div className="parent-card-header">
                  <div>
                    <span className="cms-badge cms-badge-active" style={{ marginBottom: 6, display: "inline-block" }}>
                      {ev.category}
                    </span>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{ev.title}</h3>
                  </div>
                </div>
                <div className="parent-card-body">
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                      <Calendar size={15} color="var(--cms-primary)" />
                      <strong>{ev.date}</strong>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--cms-muted)" }}>
                      <Clock size={15} />
                      <span>{ev.time}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--cms-muted)" }}>
                      <MapPin size={15} />
                      <span>{ev.location}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className="cms-btn cms-btn-sm cms-btn-outline"
                      style={{ flex: 1 }}
                      onClick={() => setSelectedEventModal(ev)}
                    >
                      <Eye size={13} /> View Details
                    </button>
                    {ev.rsvpRequired && (
                      <button
                        type="button"
                        className={`cms-btn cms-btn-sm ${ev.rsvp ? "cms-btn-outline" : "cms-btn-primary"}`}
                        style={{ flex: 1 }}
                        onClick={() => handleToggleRsvp(ev.id)}
                      >
                        <CheckCircle2 size={13} /> {ev.rsvp ? "Attending ✓" : "RSVP Now"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Circular Detail Modal */}
        {selectedAnnouncement && (
          <Modal
            title={selectedAnnouncement.title}
            onClose={() => setSelectedAnnouncement(null)}
            size="md"
            footer={
              <button type="button" className="cms-btn cms-btn-primary" onClick={() => setSelectedAnnouncement(null)}>
                Close
              </button>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--cms-muted)", paddingBottom: 10, borderBottom: "1px solid var(--cms-border)" }}>
                <span>Category: <strong>{selectedAnnouncement.category}</strong></span>
                <span>Date: <strong>{selectedAnnouncement.date}</strong></span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--cms-text)", margin: 0 }}>
                {selectedAnnouncement.summary}
              </p>
              <div style={{ padding: 12, background: "var(--cms-bg)", borderRadius: 8, fontSize: 12.5 }}>
                <div><strong>Authority:</strong> {selectedAnnouncement.author}</div>
                <div><strong>Notice Ref:</strong> CIR-2026-{selectedAnnouncement.id.toUpperCase()}</div>
              </div>
            </div>
          </Modal>
        )}

        {/* Event Detail Modal */}
        {selectedEventModal && (
          <Modal
            title={selectedEventModal.title}
            onClose={() => setSelectedEventModal(null)}
            size="md"
            footer={
              <button type="button" className="cms-btn cms-btn-primary" onClick={() => setSelectedEventModal(null)}>
                Close
              </button>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: 14, background: "var(--cms-bg)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Category:</span>
                  <strong>{selectedEventModal.category}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Date:</span>
                  <strong>{selectedEventModal.date}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span>Timings:</span>
                  <strong>{selectedEventModal.time}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Venue:</span>
                  <strong>{selectedEventModal.location}</strong>
                </div>
              </div>
              <p style={{ fontSize: 13.5, color: "var(--cms-text)", margin: 0 }}>
                Parents are requested to arrive 15 minutes prior to start time. For inquiries, kindly reach out to the campus events coordinator through the Communication module.
              </p>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}

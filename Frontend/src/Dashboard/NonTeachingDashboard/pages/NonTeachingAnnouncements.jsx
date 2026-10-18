import React, { useState, useMemo } from "react";
import {
  Megaphone,
  Search,
  Calendar,
  Building,
  AlertCircle,
  FileText,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { nonTeachingService } from "../services/nonTeachingService.js";

export default function NonTeachingAnnouncements() {
  const [announcements] = useState(() => nonTeachingService.getAnnouncements());
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(announcements[0]?.id || null);

  const categories = useMemo(() => {
    const set = new Set(announcements.map((a) => a.category));
    return ["all", ...Array.from(set)];
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((a) => {
      const matchCategory = selectedCategory === "all" || a.category === selectedCategory;
      const matchSearch =
        !searchQuery ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.publisher.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [announcements, selectedCategory, searchQuery]);

  return (
    <>
      {/* Filter and Search Bar */}
      <section className="nts-filter-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div className="nts-tabs-strip">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`nts-tab-btn ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === "all" ? "All Notices" : cat}
              </button>
            ))}
          </div>

          <div className="nts-search-box">
            <Search size={14} style={{ color: "var(--nts-muted)" }} />
            <input
              type="text"
              placeholder="Search circulars, notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--nts-muted)", fontWeight: 600 }}>
          {filteredAnnouncements.length} Published Circulars
        </div>
      </section>

      {/* Announcements List */}
      <section className="nts-card">
        <div className="nts-card-head">
          <h3>
            <Megaphone size={16} style={{ color: "var(--nts-primary)" }} /> Campus Circulars & Administrative Orders
          </h3>
        </div>
        <div className="nts-card-body" style={{ gap: 12 }}>
          {filteredAnnouncements.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                style={{
                  border: "1px solid var(--nts-border)",
                  borderRadius: 10,
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                  background: isExpanded ? "color-mix(in srgb, var(--nts-subtle) 40%, var(--nts-surface))" : "var(--nts-surface)",
                }}
              >
                <div
                  style={{
                    padding: "14px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span className={`nts-pill-priority ${item.priority.toLowerCase()}`}>
                        {item.priority}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--nts-primary)" }}>
                        {item.category}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--nts-muted)" }}>• Published by: <strong>{item.publisher}</strong></span>
                      <span style={{ fontSize: 11, color: "var(--nts-muted)" }}>• {item.date}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 750, color: "var(--nts-text)" }}>
                      {item.title}
                    </div>
                  </div>

                  <div style={{ color: "var(--nts-muted)" }}>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      padding: "12px 16px 16px",
                      borderTop: "1px solid var(--nts-border)",
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "var(--nts-text)",
                      background: "var(--nts-surface)",
                    }}
                  >
                    <p style={{ margin: 0 }}>{item.content}</p>
                    <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, fontSize: 11.5, color: "var(--nts-muted)" }}>
                      <span>Reference ID: <strong>#{item.id}</strong></span>
                      <span>Authorized Signatory: <strong>Registrar Office</strong></span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredAnnouncements.length === 0 && (
            <div style={{ textAlign: "center", padding: 32, color: "var(--nts-muted)" }}>
              <Megaphone size={32} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
              <div>No notices found for the selected category.</div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

import React, { useState, useMemo, useEffect } from "react";
import {
  Megaphone,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { nonTeachingService } from "../services/nonTeachingService.js";
import { announcementService } from "@/services/announcementService.js";

export default function NonTeachingAnnouncements() {
  const [announcements, setAnnouncements] = useState(() => nonTeachingService.getAnnouncements());
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Real-time synchronization
  useEffect(() => {
    const unsubscribe = announcementService.subscribeAnnouncements(() => {
      const updated = nonTeachingService.getAnnouncements();
      setAnnouncements(updated);
    });
    return unsubscribe;
  }, []);

  const categories = useMemo(() => {
    const set = new Set((announcements || []).map((a) => a.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    return (announcements || []).filter((a) => {
      const matchCategory = selectedCategory === "all" || a.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.content && a.content.toLowerCase().includes(q)) ||
        (a.publisher && a.publisher.toLowerCase().includes(q)) ||
        (a.referenceNo && a.referenceNo.toLowerCase().includes(q)) ||
        (a.category && a.category.toLowerCase().includes(q));
      return matchCategory && matchSearch;
    });
  }, [announcements, selectedCategory, searchQuery]);

  return (
    <>
      {/* Filter and Search Bar */}
      <section className="nts-filter-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
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
              placeholder="Search circulars, notifications, ref no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 12, color: "var(--nts-muted)", fontWeight: 600 }}>
            {filteredAnnouncements.length} Announcements
          </div>
        </div>
      </section>

      {/* Announcements Table Card */}
      <section className="nts-card">
        <div className="nts-card-head" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Megaphone size={16} style={{ color: "var(--nts-primary)" }} />
            <h3 style={{ margin: 0 }}>Campus Circulars & Administrative Orders</h3>
          </div>
          <span style={{ fontSize: 11, color: "var(--nts-muted)", fontWeight: 600 }}>
            Target: Non-Teaching Staff & General
          </span>
        </div>

        <div className="nts-card-body" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="nts-table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Date</th>
                  <th style={{ width: 130 }}>Ref No</th>
                  <th>Circular Title & Summary</th>
                  <th style={{ width: 150 }}>Category</th>
                  <th style={{ width: 100 }}>Priority</th>
                  <th style={{ width: 170 }}>Issued By</th>
                  <th style={{ width: 60, textAlign: "right" }}>View</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnnouncements.map((item) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                          {item.date}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--nts-muted)", whiteSpace: "nowrap" }}>
                          #{item.referenceNo || item.id}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: "var(--nts-text)", marginBottom: 2 }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--nts-muted)", lineHeight: 1.35 }}>
                            {item.content ? (item.content.length > 90 ? `${item.content.slice(0, 90)}...` : item.content) : ""}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--nts-primary)",
                              background: "color-mix(in srgb, var(--nts-primary) 10%, transparent)",
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}
                          >
                            {item.category}
                          </span>
                        </td>
                        <td>
                          <span className={`nts-pill-priority ${(item.priority || "normal").toLowerCase()}`}>
                            {item.priority || "Normal"}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: 11.5, fontWeight: 600 }}>
                            {item.publisher || "Campus Administration"}
                          </div>
                          <div style={{ fontSize: 10.5, color: "var(--nts-muted)" }}>
                            Audience: {item.targetAudience || "Non-Teaching Staff"}
                          </div>
                        </td>
                        <td style={{ textAlign: "right", color: "var(--nts-muted)" }}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ background: "color-mix(in srgb, var(--nts-subtle) 50%, var(--nts-surface))" }}>
                          <td colSpan={7} style={{ padding: "16px 20px", borderBottom: "1px solid var(--nts-border)" }}>
                            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--nts-text)", whiteSpace: "pre-wrap", marginBottom: 12 }}>
                              {item.content}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 16,
                                flexWrap: "wrap",
                                fontSize: 11.5,
                                color: "var(--nts-muted)",
                                borderTop: "1px dashed var(--nts-border)",
                                paddingTop: 10,
                              }}
                            >
                              <span>Reference: <strong>#{item.referenceNo || item.id}</strong></span>
                              <span>Authorized Signatory: <strong>{item.publisher || "Campus Administration"}</strong></span>
                              <span>Target Group: <strong>{item.targetAudience || "Non-Teaching Staff"}</strong></span>
                              <span>Official Campus Order</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {filteredAnnouncements.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: "center",
                        padding: "48px 16px",
                        color: "var(--nts-muted)",
                        background: "var(--nts-surface)",
                      }}
                    >
                      <Megaphone size={32} style={{ margin: "0 auto 8px", opacity: 0.35, display: "block" }} />
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--nts-text)", marginBottom: 4 }}>
                        No announcements available
                      </div>
                      <div style={{ fontSize: 12, maxWidth: 420, margin: "0 auto" }}>
                        Official campus circulars and administrative orders will be displayed here when issued by the administration.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

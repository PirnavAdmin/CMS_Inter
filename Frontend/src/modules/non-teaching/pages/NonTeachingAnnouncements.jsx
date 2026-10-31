import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Megaphone,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { nonTeachingService } from "../services/nonTeachingService.js";
import { announcementService } from "@/services/announcementService.js";

export default function NonTeachingAnnouncements() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category") || "all";
  const searchParam = searchParams.get("search") || "";
  const expandParam = searchParams.get("expand") || null;

  const [announcements, setAnnouncements] = useState(() => nonTeachingService.getAnnouncements());
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [expandedId, setExpandedId] = useState(expandParam);

  useEffect(() => {
    const cat = searchParams.get("category") || "all";
    if (cat !== selectedCategory) setSelectedCategory(cat);
    const q = searchParams.get("search") || "";
    if (q !== searchQuery) setSearchQuery(q);
    const exp = searchParams.get("expand") || null;
    if (exp !== expandedId) setExpandedId(exp);
  }, [searchParams]);

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (cat && cat !== "all") next.set("category", cat);
      else next.delete("category");
      return next;
    });
  };

  const handleSearchChange = (q) => {
    setSearchQuery(q);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (q) next.set("search", q);
      else next.delete("search");
      return next;
    });
  };

  const handleToggleExpand = (id) => {
    const nextId = String(expandedId) === String(id) ? null : String(id);
    setExpandedId(nextId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextId) next.set("expand", nextId);
      else next.delete("expand");
      return next;
    });
  };

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
                onClick={() => handleCategoryChange(cat)}
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
              onChange={(e) => handleSearchChange(e.target.value)}
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
            <h3 style={{ margin: 0 }}>Campus Circulars &amp; Administrative Orders</h3>
          </div>
          <span style={{ fontSize: 11, color: "var(--nts-muted)", fontWeight: 600 }}>
            Target: Non-Teaching Staff &amp; General
          </span>
        </div>

        <div className="nts-card-body" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table className="nts-table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Date</th>
                  <th style={{ width: 130 }}>Ref No</th>
                  <th>Title &amp; Subject</th>
                  <th style={{ width: 140 }}>Category</th>
                  <th style={{ width: 150 }}>Authority</th>
                  <th style={{ width: 90 }}>Priority</th>
                  <th style={{ width: 60 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnnouncements.map((a) => {
                  const isExpanded = String(expandedId) === String(a.id);
                  return (
                    <React.Fragment key={a.id}>
                      <tr
                        style={{ cursor: "pointer", background: isExpanded ? "var(--nts-subtle)" : undefined }}
                        onClick={() => handleToggleExpand(a.id)}
                      >
                        <td style={{ fontVariantNumeric: "tabular-nums", color: "var(--nts-muted)" }}>{a.date}</td>
                        <td style={{ fontWeight: 600, color: "var(--nts-primary)" }}>{a.referenceNo || `REF-${a.id}`}</td>
                        <td>
                          <strong>{a.title}</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--nts-text)" }}>{a.category}</span>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--nts-muted)" }}>{a.publisher}</td>
                        <td>
                          <span className={`nts-pill-priority ${(a.priority || "Regular").toLowerCase()}`}>
                            {a.priority || "Regular"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="nts-modal-close"
                            style={{ padding: 4 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleExpand(a.id);
                            }}
                          >
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ background: "var(--nts-subtle)", padding: "16px 20px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              <div style={{ fontSize: 14, fontWeight: 750, color: "var(--nts-text)" }}>
                                {a.title}
                              </div>
                              <div style={{ fontSize: 12.5, color: "var(--nts-text)", lineHeight: 1.55 }}>
                                {a.content}
                              </div>
                              <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: "var(--nts-muted)", marginTop: 4 }}>
                                <span>Published By: <strong>{a.publisher}</strong></span>
                                <span>Ref: <strong>{a.referenceNo || `REF-${a.id}`}</strong></span>
                                <span>Date: <strong>{a.date}</strong></span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredAnnouncements.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "36px 16px", color: "var(--nts-muted)" }}>
                      No circulars or announcements found matching your criteria.
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

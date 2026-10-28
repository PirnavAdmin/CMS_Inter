import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";
import { SkeletonTable, Modal, Toast } from "@/shared/components/Ui.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import holidayApi from "@/api/holidayApi.js";
import { holidayRecords } from "@/data/mockData.js";
import holidayManagementIcon from "@/assets/sidebar-3d/holiday-management.svg";
import totalHolidaysIcon from "@/assets/sidebar-3d/holiday-total.svg";
import nationalHolidaysIcon from "@/assets/sidebar-3d/holiday-national.svg";
import festivalHolidaysIcon from "@/assets/sidebar-3d/holiday-festival.svg";
import upcomingHolidaysIcon from "@/assets/sidebar-3d/holiday-upcoming.svg";
import completedHolidaysIcon from "@/assets/sidebar-3d/holiday-completed.svg";
import "../styles/FacultyHolidays.css";

const PAGE_SIZE = 5;
const TYPES = ["National Holiday", "Festival Holiday", "Special Holiday", "Other"];

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function getHolidayStartDate(holiday) {
  return holiday.startDate || holiday.holidayDate || "";
}

function getHolidayEndDate(holiday) {
  return holiday.endDate || getHolidayStartDate(holiday);
}

function todayIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getHolidayLifecycleStatus(holiday) {
  if (holiday.lifecycleStatus) return holiday.lifecycleStatus;
  if (holiday.status === "Inactive") return "Inactive";
  return getHolidayEndDate(holiday) < todayIso() ? "Completed" : "Active";
}

function dateRange(holiday) {
  if (holiday.formattedDateRange) return holiday.formattedDateRange;
  const startDate = getHolidayStartDate(holiday);
  const endDate = getHolidayEndDate(holiday);
  return holiday.dateType === "Date Range" && holiday.endDate && holiday.endDate !== startDate
    ? `${formatDate(startDate)} - ${formatDate(endDate)}`
    : formatDate(startDate);
}

function HolidayStatus({ holiday }) {
  const lifecycleStatus = getHolidayLifecycleStatus(holiday);
  return (
    <span className={`holiday-status is-${lifecycleStatus.toLowerCase()}`}>
      <i />
      {lifecycleStatus}
    </span>
  );
}



export default function FacultyHolidays() {
  const { selectedAcademicYearId, selectedBoardId } = useAcademicContext?.() || {};
  const { selectedCampusId } = useCampusContext?.() || {};

  const [holidays, setHolidays] = useState(holidayRecords);
  const [apiSummary, setApiSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("All");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [appliedRange, setAppliedRange] = useState(null);
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [viewHoliday, setViewHoliday] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: String(index + 1),
        label: new Intl.DateTimeFormat("en-IN", { month: "long" }).format(new Date(2026, index, 1)),
      })),
    []
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, listRes] = await Promise.allSettled([
        holidayApi.getSummary({ academicYearId: selectedAcademicYearId || undefined, boardId: selectedBoardId || undefined }),
        holidayApi.getHolidays({ academicYearId: selectedAcademicYearId || undefined, boardId: selectedBoardId || undefined, page: 1, pageSize: 100 }),
      ]);

      if (summaryRes.status === "fulfilled" && summaryRes.value && typeof summaryRes.value.total === "number" && summaryRes.value.total > 0) {
        setApiSummary(summaryRes.value);
      }

      if (listRes.status === "fulfilled" && Array.isArray(listRes.value?.data) && listRes.value.data.length > 0) {
        const filteredList = listRes.value.data.filter((holiday) => {
          const campusId = holiday?.campusId ?? holiday?.CampusId;
          return campusId == null || String(campusId) === String(selectedCampusId);
        });
        setHolidays(filteredList.length > 0 ? filteredList : holidayRecords);
      } else {
        setHolidays(holidayRecords);
      }
    } catch (err) {
      console.warn("Using local holiday data fallback:", err);
      setHolidays(holidayRecords);
    } finally {
      setLoading(false);
    }
  }, [selectedAcademicYearId, selectedBoardId, selectedCampusId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived Summary Counts matching theme
  const summary = useMemo(() => {
    if (apiSummary && apiSummary.total > 0) {
      return apiSummary;
    }
    const total = holidays.length;
    const national = holidays.filter((h) => (h.holidayType || "").toLowerCase().includes("national")).length;
    const festival = holidays.filter((h) => (h.holidayType || "").toLowerCase().includes("festival")).length;
    const completed = holidays.filter((h) => getHolidayLifecycleStatus(h).toLowerCase() === "completed").length;
    const upcoming = holidays.filter((h) => {
      const s = getHolidayLifecycleStatus(h).toLowerCase();
      return s === "active" || s === "upcoming";
    }).length;
    return {
      total,
      national,
      festival,
      upcoming,
      completed,
    };
  }, [apiSummary, holidays]);

  // Chronological sort
  const sortedHolidays = useMemo(() => {
    return [...holidays].sort((a, b) => {
      const dateA = getHolidayStartDate(a);
      const dateB = getHolidayStartDate(b);
      return dateA.localeCompare(dateB);
    });
  }, [holidays]);

  // Comprehensive client-side filter
  const filteredHolidays = useMemo(() => {
    return sortedHolidays.filter((holiday) => {
      // 1. Text Search Filter
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const text = `${holiday.holidayName} ${holiday.holidayType} ${holiday.appliesTo} ${holiday.description || ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      // 2. Type Filter
      if (type !== "All") {
        const hType = (holiday.holidayType || "").trim().toLowerCase();
        const selType = type.trim().toLowerCase();
        const isFestival = selType.includes("festival") && hType.includes("festival");
        if (!isFestival && hType !== selType) {
          return false;
        }
      }

      // 3. Status Filter (Active, Upcoming, Completed, Inactive)
      if (status !== "All") {
        const lifecycle = getHolidayLifecycleStatus(holiday).toLowerCase();
        const target = status.toLowerCase();
        if (target === "active" || target === "upcoming") {
          if (lifecycle !== "active" && lifecycle !== "upcoming") return false;
        } else if (lifecycle !== target) {
          return false;
        }
      }

      // 4. Month Filter
      const startDate = getHolidayStartDate(holiday);
      const endDate = getHolidayEndDate(holiday);
      if (month !== "All" && month !== "Custom Range") {
        const isMonthMatch = (dateStr) => {
          if (!dateStr) return false;
          const d = new Date(`${dateStr}T00:00:00`);
          if (isNaN(d.getTime())) return false;
          const mNum = String(d.getMonth() + 1);
          const mLong = new Intl.DateTimeFormat("en-IN", { month: "long" }).format(d);
          const mShort = new Intl.DateTimeFormat("en-IN", { month: "short" }).format(d);
          return mNum === month || mLong.toLowerCase() === month.toLowerCase() || mShort.toLowerCase() === month.toLowerCase();
        };
        if (!isMonthMatch(startDate) && !isMonthMatch(endDate)) {
          return false;
        }
      }

      // 5. Custom Range Filter
      if (appliedRange?.from && appliedRange?.to) {
        if (startDate > appliedRange.to || endDate < appliedRange.from) {
          return false;
        }
      }

      return true;
    });
  }, [sortedHolidays, query, type, status, month, appliedRange]);

  const totalCount = filteredHolidays.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filteredHolidays.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const updateFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const changeMonth = (value) => {
    setMonth(value);
    setPage(1);
    if (value !== "Custom Range") {
      setCustomRange({ from: "", to: "" });
      setAppliedRange(null);
    }
  };

  const applyCustomRange = () => {
    if (!customRange.from || !customRange.to) {
      setToast({ message: "Please select both From Date and To Date.", type: "error" });
      return;
    }
    if (customRange.to < customRange.from) {
      setToast({ message: "To Date cannot be earlier than From Date.", type: "error" });
      return;
    }
    setAppliedRange(customRange);
    setPage(1);
  };

  return (
    <div className="holiday-page">
      {/* Page Header: Rename Holiday Management -> My Holidays, 3D icon, NO add holiday button */}
      <div className="cms-page-head">
        <div className="cms-page-title">
          <img className="cms-page-title-icon" src={holidayManagementIcon} alt="" aria-hidden="true" />
          <div className="cms-page-title-copy">
            <h1>My Holidays</h1>
            <p>Review academic holidays and scheduled college closures.</p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards matching reference */}
      <section className="holiday-summary" aria-label="Holiday summary">
        <article className="holiday-stat is-primary">
          <span>
            <img src={totalHolidaysIcon} alt="" aria-hidden="true" />
          </span>
          <div>
            <small>Total Holidays</small>
            <strong>{summary.total}</strong>
          </div>
        </article>
        <article className="holiday-stat is-blue">
          <span>
            <img src={nationalHolidaysIcon} alt="" aria-hidden="true" />
          </span>
          <div>
            <small>National Holidays</small>
            <strong>{summary.national}</strong>
          </div>
        </article>
        <article className="holiday-stat is-amber">
          <span>
            <img src={festivalHolidaysIcon} alt="" aria-hidden="true" />
          </span>
          <div>
            <small>Festival Holidays</small>
            <strong>{summary.festival}</strong>
          </div>
        </article>
        <article className="holiday-stat is-violet">
          <span>
            <img src={upcomingHolidaysIcon} alt="" aria-hidden="true" />
          </span>
          <div>
            <small>Upcoming Holidays</small>
            <strong>{summary.upcoming}</strong>
          </div>
        </article>
        <article className="holiday-stat is-completed">
          <span>
            <img src={completedHolidaysIcon} alt="" aria-hidden="true" />
          </span>
          <div>
            <small>Completed Holidays</small>
            <strong>{summary.completed}</strong>
          </div>
        </article>
      </section>

      {/* Main Holiday List Table Card */}
      <section className="cms-card holiday-list-card">
        <div className="cms-card-head">
          <div>
            <h2>Holiday List</h2>
            <p>Review and maintain academic holidays.</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="holiday-filters">
          <label className="holiday-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => updateFilter(setQuery)(event.target.value)}
              placeholder="Search holidays..."
            />
          </label>
          <select value={month} onChange={(event) => changeMonth(event.target.value)} aria-label="Filter by month">
            <option value="All">All Months</option>
            {months.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
            <option value="Custom Range">Custom Range</option>
          </select>
          {month === "Custom Range" ? (
            <>
              <label className="holiday-date-filter">
                <span>From Date</span>
                <input
                  type="date"
                  value={customRange.from}
                  onChange={(event) => setCustomRange((current) => ({ ...current, from: event.target.value }))}
                />
              </label>
              <label className="holiday-date-filter">
                <span>To Date</span>
                <input
                  type="date"
                  min={customRange.from}
                  value={customRange.to}
                  onChange={(event) => setCustomRange((current) => ({ ...current, to: event.target.value }))}
                />
              </label>
              <button type="button" className="cms-btn cms-btn-primary holiday-apply" onClick={applyCustomRange}>
                Apply
              </button>
            </>
          ) : null}
          <select value={type} onChange={(event) => updateFilter(setType)(event.target.value)} aria-label="Filter by holiday type">
            <option value="All">All Types</option>
            {TYPES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select value={status} onChange={(event) => updateFilter(setStatus)(event.target.value)} aria-label="Filter by status">
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Completed">Completed</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Table View */}
        <div className="cms-table-wrap">
          <table className="cms-table holiday-table">
            <thead>
              <tr>
                <th>Date / Range</th>
                <th>Holiday Name</th>
                <th>Type</th>
                <th>Applies To</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>
                    <SkeletonTable columns={6} rows={5} />
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((holiday) => (
                  <tr key={holiday.id}>
                    <td>{dateRange(holiday)}</td>
                    <td className="holiday-name">{holiday.holidayName}</td>
                    <td>
                      <span className="holiday-type">{holiday.holidayType}</span>
                    </td>
                    <td>{holiday.appliesTo}</td>
                    <td className="holiday-description">{holiday.description || "-"}</td>
                    <td>
                      <HolidayStatus holiday={holiday} />
                    </td>
                    <td>
                      <div className="holiday-actions">
                        <button
                          type="button"
                          className="cms-action-btn"
                          title="View holiday details"
                          aria-label="View holiday details"
                          onClick={() => setViewHoliday(holiday)}
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="holiday-empty">
                    No holidays match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="holiday-pagination">
          <span>
            Showing {totalCount ? (currentPage - 1) * PAGE_SIZE + 1 : 0} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} holiday{totalCount === 1 ? "" : "s"}
          </span>
          <div>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={currentPage === 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Prev
            </button>
            <b>{currentPage}</b>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={currentPage === totalPages || loading}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* View Details Modal */}
      {viewHoliday ? (
        <Modal
          title="Holiday Details"
          onClose={() => setViewHoliday(null)}
          size="sm"
          footer={
            <button type="button" className="cms-btn cms-btn-primary" onClick={() => setViewHoliday(null)}>
              Close
            </button>
          }
        >
          <div className="holiday-detail-grid">
            <div>
              <small>Holiday Name</small>
              <strong>{viewHoliday.holidayName}</strong>
            </div>
            <div>
              <small>Type</small>
              <strong>{viewHoliday.holidayType}</strong>
            </div>
            <div>
              <small>Date / Range</small>
              <strong>{dateRange(viewHoliday)}</strong>
            </div>
            <div>
              <small>Applies To</small>
              <strong>{viewHoliday.appliesTo}</strong>
            </div>
            <div>
              <small>Status</small>
              <HolidayStatus holiday={viewHoliday} />
            </div>
            <div className="full">
              <small>Description</small>
              <strong>{viewHoliday.description || "-"}</strong>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* Toast Feedback */}
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
    </div>
  );
}

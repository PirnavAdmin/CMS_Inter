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
import "@/modules/faculty/styles/FacultyHolidays.css";
import { useTransportManagerSafe } from "../TransportManagerContext.jsx";

const PAGE_SIZE = 5;
const TYPES = ["National Holiday", "Festival Holiday", "Special Holiday", "Other"];

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`)
  );
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

export default function TransportManagerHolidays() {
  const tmContext = useTransportManagerSafe();
  const { selectedAcademicYearId } = useAcademicContext?.() || {};
  const { selectedCampusId } = useCampusContext?.() || {};
  const selectedBoardId = tmContext?.selectedBoardId;

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
        holidayApi.getSummary({
          academicYearId: selectedAcademicYearId || undefined,
          boardId: selectedBoardId || undefined,
        }),
        holidayApi.getHolidays({
          academicYearId: selectedAcademicYearId || undefined,
          boardId: selectedBoardId || undefined,
          page: 1,
          pageSize: 100,
        }),
      ]);

      if (
        summaryRes.status === "fulfilled" &&
        summaryRes.value &&
        typeof summaryRes.value.total === "number" &&
        summaryRes.value.total > 0
      ) {
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

  const summary = useMemo(() => {
    if (apiSummary) {
      return {
        total: apiSummary.total ?? apiSummary.totalHolidays ?? 0,
        national: apiSummary.nationalHolidays ?? apiSummary.national ?? 0,
        festival: apiSummary.festivalHolidays ?? apiSummary.festival ?? 0,
        upcoming: apiSummary.upcomingHolidays ?? apiSummary.upcoming ?? 0,
        completed: apiSummary.completedHolidays ?? apiSummary.completed ?? 0,
      };
    }

    const initial = { total: holidays.length, national: 0, festival: 0, upcoming: 0, completed: 0 };
    return holidays.reduce((accumulator, holiday) => {
      const holidayType = holiday.holidayType || holiday.type;
      const lifecycle = getHolidayLifecycleStatus(holiday);
      if (holidayType === "National Holiday") accumulator.national += 1;
      if (holidayType === "Festival Holiday") accumulator.festival += 1;
      if (lifecycle === "Active") accumulator.upcoming += 1;
      if (lifecycle === "Completed") accumulator.completed += 1;
      return accumulator;
    }, initial);
  }, [apiSummary, holidays]);

  const filteredHolidays = useMemo(() => {
    return holidays.filter((holiday) => {
      const name = (holiday.holidayName || holiday.name || "").toLowerCase();
      const holidayType = holiday.holidayType || holiday.type || "";
      const appliesTo = (holiday.appliesTo || "").toLowerCase();
      const desc = (holiday.description || "").toLowerCase();
      const lifecycle = getHolidayLifecycleStatus(holiday);
      const startDate = getHolidayStartDate(holiday);
      const endDate = getHolidayEndDate(holiday);

      const matchesQuery =
        !query ||
        name.includes(query.toLowerCase()) ||
        appliesTo.includes(query.toLowerCase()) ||
        desc.includes(query.toLowerCase());

      const matchesType = type === "All" || holidayType === type;
      const matchesStatus = status === "All" || lifecycle === status;

      let matchesMonth = true;
      if (month !== "All" && month !== "Custom Range" && startDate) {
        const holidayMonth = String(new Date(`${startDate}T00:00:00`).getMonth() + 1);
        matchesMonth = holidayMonth === month;
      }

      let matchesCustomRange = true;
      if (month === "Custom Range" && appliedRange?.from && appliedRange?.to) {
        matchesCustomRange = startDate <= appliedRange.to && endDate >= appliedRange.from;
      }

      return matchesQuery && matchesType && matchesStatus && matchesMonth && matchesCustomRange;
    });
  }, [appliedRange, holidays, month, query, status, type]);

  const totalPages = Math.max(1, Math.ceil(filteredHolidays.length / PAGE_SIZE));
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
      {/* Page Header matching Reference 5 */}
      <div className="cms-page-head">
        <div className="cms-page-title">
          <img className="cms-page-title-icon" src={holidayManagementIcon} alt="" aria-hidden="true" />
          <div className="cms-page-title-copy">
            <h1>My Holidays</h1>
            <p>Review academic holidays and scheduled college closures.</p>
          </div>
        </div>
      </div>

      {/* 5 KPI Stat Cards matching reference */}
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
                  value={customRange.to}
                  onChange={(event) => setCustomRange((current) => ({ ...current, to: event.target.value }))}
                />
              </label>
              <button type="button" className="cms-btn cms-btn-primary" onClick={applyCustomRange}>
                Apply Range
              </button>
            </>
          ) : null}
          <select value={type} onChange={(event) => updateFilter(setType)(event.target.value)} aria-label="Filter by holiday type">
            <option value="All">All Types</option>
            {TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={status} onChange={(event) => updateFilter(setStatus)(event.target.value)} aria-label="Filter by status">
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Table View */}
        <div className="cms-table-wrap">
          {loading ? (
            <SkeletonTable columns={7} rows={5} />
          ) : (
            <table className="cms-table">
              <thead>
                <tr>
                  <th>DATE / RANGE</th>
                  <th>HOLIDAY NAME</th>
                  <th>TYPE</th>
                  <th>APPLIES TO</th>
                  <th>DESCRIPTION</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="cms-empty-state">
                      No holidays match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  rows.map((holiday) => (
                    <tr key={holiday.id || holiday.holidayId || holiday.holidayName}>
                      <td>{dateRange(holiday)}</td>
                      <td>
                        <strong>{holiday.holidayName || holiday.name}</strong>
                      </td>
                      <td>
                        <span className="holiday-chip">{holiday.holidayType || holiday.type}</span>
                      </td>
                      <td>{holiday.appliesTo || "All Students & Staff"}</td>
                      <td>{holiday.description || "-"}</td>
                      <td>
                        <HolidayStatus holiday={holiday} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="cms-action-btn"
                          onClick={() => setViewHoliday(holiday)}
                          title="View holiday details"
                          aria-label={`View ${holiday.holidayName || holiday.name}`}
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="holiday-pagination">
          <span>
            Showing {filteredHolidays.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0} to{" "}
            {Math.min(currentPage * PAGE_SIZE, filteredHolidays.length)} of {filteredHolidays.length} holidays
          </span>
          <div>
            <button
              type="button"
              className="cms-btn cms-btn-outline"
              disabled={currentPage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Prev
            </button>
            <span>{currentPage}</span>
            <button
              type="button"
              className="cms-btn cms-btn-outline"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* View Holiday Modal */}
      {viewHoliday ? (
        <Modal title="Holiday Details" onClose={() => setViewHoliday(null)}>
          <dl className="holiday-details">
            <div>
              <dt>Holiday Name</dt>
              <dd>{viewHoliday.holidayName || viewHoliday.name}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{viewHoliday.holidayType || viewHoliday.type}</dd>
            </div>
            <div>
              <dt>Date Range</dt>
              <dd>{dateRange(viewHoliday)}</dd>
            </div>
            <div>
              <dt>Applies To</dt>
              <dd>{viewHoliday.appliesTo || "All Students & Staff"}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <HolidayStatus holiday={viewHoliday} />
              </dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{viewHoliday.description || "No description provided."}</dd>
            </div>
          </dl>
        </Modal>
      ) : null}

      {toast.message ? <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} /> : null}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { SkeletonPage } from "@/components/common/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentDataTable from "../components/StudentDataTable.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import StudentSummaryCard from "../components/StudentSummaryCard.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import studentApiEndpoints from "../api/studentApiEndpoints.js";

import totalHolidaysIcon from "@/assets/sidebar-3d/holiday-total.svg";
import nationalHolidaysIcon from "@/assets/sidebar-3d/holiday-national.svg";
import festivalHolidaysIcon from "@/assets/sidebar-3d/holiday-festival.svg";
import upcomingHolidaysIcon from "@/assets/sidebar-3d/holiday-upcoming.svg";
import completedHolidaysIcon from "@/assets/sidebar-3d/holiday-completed.svg";

const unwrap = (data) => data?.data?.data ?? data?.data ?? data?.Data ?? data ?? {};
const read = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value != null && value !== "");
const extract = (data) => { const value = unwrap(data); if (Array.isArray(value)) return value; for (const key of ["items", "Items", "holidays", "Holidays", "records", "Records", "$values"]) if (Array.isArray(value?.[key])) return value[key]; return []; };
const parseDate = (value) => {
  const date = value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};
const formatDate = (date) => date ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const weekday = (date) => date ? date.toLocaleDateString("en-IN", { weekday: "long" }) : "—";
const category = (type) => /national/i.test(type) ? "national" : /festival/i.test(type) ? "festival" : "other";
const normalizeHoliday = (item, today) => {
  const start = parseDate(read(item, "startDate", "StartDate", "holidayDate", "HolidayDate", "date", "Date", "fromDate", "FromDate"));
  const end = parseDate(read(item, "endDate", "EndDate", "toDate", "ToDate")) || start;
  return { name: read(item, "holidayName", "HolidayName", "name", "Name", "title", "Title") || "Holiday", start, end,
    type: read(item, "holidayType", "HolidayType", "type", "Type") || "Other",
    description: read(item, "description", "Description") || "—",
    status: !start ? "Not provided" : end < today ? "Past" : start > today ? "Upcoming" : "Ongoing" };
};

export default function StudentHolidays() {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All Types");
  const [period, setPeriod] = useState("All Holidays");
  const [page, setPage] = useState(1);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!student) { setLoading(false); return; }
      setLoading(true); setError("");
      try {
        const response = await apiClient.get(studentApiEndpoints.holidays.list, { params: { CampusId: student.campusId, AcademicYearId: student.academicYearId, BoardId: student.boardId, Page: 1, PageSize: 100 } });
        if (active) { setHolidays(extract(response.data)); setPage(1); }
      } catch (requestError) { if (active) setError(getApiErrorMessage(requestError)); }
      finally { if (active) setLoading(false); }
    };
    if (!profileLoading) load();
    return () => { active = false; };
  }, [profileLoading, student]);
  if (profileLoading || loading) return <div className="sp-page"><SkeletonPage variant="table" columns={6} rows={5}/></div>;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const items = holidays.map((item) => normalizeHoliday(item, today)).sort((a, b) => (a.start?.getTime() ?? Infinity) - (b.start?.getTime() ?? Infinity));
  const upcoming = items.filter((item) => item.status === "Upcoming");
  const types = [...new Set(items.map((item) => item.type))];
  const filtered = items.filter((item) => (type === "All Types" || item.type === type) && (period === "All Holidays" || item.status === period) && `${item.name} ${item.description}`.toLowerCase().includes(search.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, pages);
  return <div className="sp-page sp-holidays-page">
    <StudentPageHeader title="Holidays" subtitle={student?.academicYearName ? `Academic holiday calendar for ${student.academicYearName}.` : "Academic holiday calendar."}/>
    {profileError || error ? <div className="sp-api-state is-error">{profileError || error}</div> : null}
    <div className="sp-summary-grid sp-holiday-summary">
      <StudentSummaryCard icon={totalHolidaysIcon} label="Total Holidays" value={items.length}/>
      <StudentSummaryCard icon={nationalHolidaysIcon} label="National Holidays" value={items.filter((item) => category(item.type) === 'national').length} tone="blue"/>
      <StudentSummaryCard icon={festivalHolidaysIcon} label="Festival Holidays" value={items.filter((item) => category(item.type) === 'festival').length} tone="orange"/>
      <StudentSummaryCard icon={upcomingHolidaysIcon} label="Upcoming Holidays" value={upcoming.length} tone="purple"/>
      <StudentSummaryCard icon={completedHolidaysIcon} label="Completed Holidays" value={items.filter((item) => item.status === 'Past').length}/>
    </div>
    <div className="sp-holiday-list-layout">
      <StudentCard title={period === "All Holidays" ? "Holiday List" : `${period} Holidays`} subtitle={`${filtered.length} holiday${filtered.length === 1 ? "" : "s"}`}>
        <div className="sp-holiday-list-filters">
          <label className="sp-holiday-search"><Search size={17} aria-hidden="true"/><input type="search" aria-label="Search holidays" placeholder="Search holidays..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}/></label>
          <select aria-label="Holiday type" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}><option>All Types</option>{types.map((label) => <option key={label}>{label}</option>)}</select>
          <select aria-label="Holiday status" value={period} onChange={(event) => { setPeriod(event.target.value); setPage(1); }}>{["All Holidays", "Upcoming", "Ongoing", "Past"].map((label) => <option key={label}>{label}</option>)}</select>
          <span className="sp-college-managed">{student?.academicYearName || "Academic calendar"}</span>
        </div>
        <StudentDataTable columns={["Holiday", "Date", "Day", "Type", "Description", "Status"]} rows={filtered.slice((currentPage - 1) * 5, currentPage * 5).map((item) => [item.name, item.start && item.end > item.start ? `${formatDate(item.start)} - ${formatDate(item.end)}` : formatDate(item.start), item.start && item.end > item.start ? `${weekday(item.start)} - ${weekday(item.end)}` : weekday(item.start), item.type, item.description, item.status])} renderCell={(value, row, column, index) => index === 3 ? <span className={`sp-holiday-type is-${category(value)}`}>{value}</span> : index === 5 ? <span className={`sp-holiday-status is-${String(value).toLowerCase()}`}>{value}</span> : value} empty="No holidays match the selected filters."/>
        {filtered.length ? <div className="sp-pagination"><span>Showing {(currentPage - 1) * 5 + 1}-{Math.min(currentPage * 5, filtered.length)} of {filtered.length} holidays</span><div><button className="sp-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><strong>{currentPage} / {pages}</strong><button className="sp-btn" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></div> : null}
      </StudentCard>
    </div>
  </div>;
}

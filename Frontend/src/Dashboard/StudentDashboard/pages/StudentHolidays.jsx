import { useEffect, useState } from "react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { SkeletonPage } from "@/components/common/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentDataTable from "../components/StudentDataTable.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import studentApiEndpoints from "../api/studentApiEndpoints.js";

const unwrap = (data) => data?.data?.data ?? data?.data ?? data?.Data ?? data ?? {};
const read = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value != null && value !== "");
const extract = (data) => { const value = unwrap(data); if (Array.isArray(value)) return value; for (const key of ["items", "Items", "holidays", "Holidays", "records", "Records", "$values"]) if (Array.isArray(value?.[key])) return value[key]; return []; };
const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
};

export default function StudentHolidays() {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!student) return;
      setLoading(true); setError("");
      try {
        const response = await apiClient.get(studentApiEndpoints.holidays.list, { params: { CampusId: student.campusId, AcademicYearId: student.academicYearId, BoardId: student.boardId, Page: 1, PageSize: 100 } });
        if (active) setHolidays(extract(response.data));
      } catch (requestError) { if (active) setError(getApiErrorMessage(requestError)); }
      finally { if (active) setLoading(false); }
    };
    if (!profileLoading) load();
    return () => { active = false; };
  }, [profileLoading, student]);
  if (profileLoading || loading) return <div className="sp-page"><SkeletonPage variant="table" columns={5} rows={5}/></div>;
  const rows = holidays.map((item) => {
    const date = read(item, "holidayDate", "HolidayDate", "date", "Date", "fromDate", "FromDate");
    const timestamp = date ? new Date(date) : null;
    const status = read(item, "status", "Status") || (timestamp && timestamp >= new Date(new Date().toDateString()) ? "Upcoming" : "Past");
    return [read(item, "holidayName", "HolidayName", "name", "Name", "title", "Title") || "Holiday", formatDate(date), timestamp && !Number.isNaN(timestamp.getTime()) ? timestamp.toLocaleDateString("en-IN", { weekday: "long" }) : "—", read(item, "holidayType", "HolidayType", "type", "Type") || "—", status];
  });
  const year = student?.academicYearName ? `Academic holiday calendar for ${student.academicYearName}.` : "Academic holiday calendar.";
  return <div className="sp-page"><StudentPageHeader title="Holidays" subtitle={year}/>{profileError || error ? <div className="sp-api-state is-error">{profileError || error}</div> : null}<StudentCard title="Academic Holidays" subtitle={`${rows.length} holiday${rows.length === 1 ? "" : "s"}`}><StudentDataTable columns={["Holiday", "Date", "Day", "Type", "Status"]} rows={rows} statusColumns={[4]} empty="No holidays are available for your academic year."/></StudentCard></div>;
}

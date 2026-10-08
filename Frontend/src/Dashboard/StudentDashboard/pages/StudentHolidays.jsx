import { useEffect, useState } from "react";
import StudentCard from "../components/StudentCard.jsx";
import StudentDataTable from "../components/StudentDataTable.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import holidayApi from "@/api/holidayApi.js";

function formatHolidayDate(h) {
  const d = h.startDate || h.holidayDate || "";
  if (!d) return "-";
  try {
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${d}T00:00:00`));
  } catch {
    return d;
  }
}

function getDayOfWeek(h) {
  const d = h.startDate || h.holidayDate || "";
  if (!d) return "-";
  try {
    return new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(new Date(`${d}T00:00:00`));
  } catch {
    return "-";
  }
}

export default function StudentHolidays() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await holidayApi.getHolidays({ page: 1, pageSize: 50 });
        const data = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        if (mounted) {
          const rows = data.map((h) => [
            h.holidayName || "-",
            formatHolidayDate(h),
            getDayOfWeek(h),
            h.holidayType || "General",
            h.status || "Active",
          ]);
          setList(rows);
        }
      } catch (err) {
        console.warn("Student holidays fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="sp-page">
      <StudentPageHeader title="Holidays" subtitle="Academic holiday calendar for the current session." />
      <StudentCard title="Academic Holidays" subtitle={loading ? "Loading holidays..." : `${list.length} holidays scheduled`}>
        <StudentDataTable columns={["Holiday", "Date", "Day", "Type", "Status"]} rows={list} statusColumns={[4]} />
      </StudentCard>
    </div>
  );
}

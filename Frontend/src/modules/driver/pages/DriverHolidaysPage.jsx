import { SkeletonRow } from "@/shared/components/Skeleton.jsx";
import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import apiClient, { getApiErrorMessage } from "../../../api/apiClient.js";
import { useAcademicContext } from "../../../context/AcademicContext.jsx";
import { useCampusContext } from "../../../context/CampusContext.jsx";
import "./DriverHolidaysPage.css";

function getTodayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSundayHoliday(startStr, endStr) {
  if (!startStr) return false;
  // If single-day holiday, check if it falls on Sunday
  if (!endStr || startStr === endStr) {
    const d = new Date(`${startStr}T00:00:00`);
    return d.getDay() === 0;
  }
  return false;
}

export default function DriverHolidaysPage() {
  const { selectedAcademicYearId, selectedBoardId } = useAcademicContext();
  const { selectedCampusId } = useCampusContext();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setHolidays([]);

    const load = async () => {
      try {
        const items = [];
        let page = 1;
        let totalPages = 1;
        do {
          const response = await apiClient.get("/api/v1/holidays", {
            params: {
              campusId: selectedCampusId || undefined,
              academicYearId: selectedAcademicYearId || undefined,
              boardId: selectedBoardId || undefined,
              page,
              pageSize: 100,
            },
            signal: controller.signal,
          });
          const payload = response.data;
          if (payload?.success === false) throw new Error(payload.message || "Unable to load holidays.");
          const data = payload?.data ?? payload;
          if (!Array.isArray(data)) throw new Error("The holiday API returned an unsupported response.");
          items.push(...data);
          totalPages = Number(payload.totalPages) || 1;
          page += 1;
        } while (page <= totalPages && !controller.signal.aborted);

        const todayStr = getTodayIso();

        // 1. Match campus scope
        // 2. Filter out completed holidays (endDate must be >= today)
        // 3. Filter out Sunday holidays (show only non-Sunday holidays)
        const activeScoped = items.filter((holiday) => {
          const campusId = holiday.campusId ?? holiday.CampusId;
          const matchesCampus =
            selectedCampusId == null ||
            selectedCampusId === "" ||
            campusId == null ||
            String(campusId) === String(selectedCampusId);
          if (!matchesCampus) return false;

          const start = String(holiday.startDate || holiday.holidayDate || "").slice(0, 10);
          const end = String(holiday.endDate || holiday.startDate || holiday.holidayDate || "").slice(0, 10);

          // Exclude completed holidays
          if (end && end < todayStr) return false;

          // Exclude single-day holidays that fall on a Sunday
          if (isSundayHoliday(start, end)) return false;

          return true;
        });

        const upcoming = [
          ...new Map(
            activeScoped.map((holiday, index) => [
              holiday.id ?? holiday.Id ?? `row-${index}`,
              holiday,
            ])
          ).values(),
        ].sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));

        if (!controller.signal.aborted) setHolidays(upcoming);
      } catch (failure) {
        if (!controller.signal.aborted) setError(getApiErrorMessage(failure));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [revision, selectedCampusId, selectedAcademicYearId, selectedBoardId]);

  return (
    <div className="dp-page-container dp-holidays">
      <div className="dp-page-header">
        <div>
          <h1 className="dp-page-title">Holidays</h1>
          <p className="dp-page-subtitle">Upcoming non-Sunday holidays.</p>
        </div>
      </div>
      <section className="dp-holidays-card" aria-labelledby="driver-upcoming-holidays">
        <div className="dp-holidays-card-head">
          <h2 id="driver-upcoming-holidays">
            Upcoming Holiday List{!loading && !error && ` — ${holidays.length} Holidays`}
          </h2>
          <button
            type="button"
            className="dp-icon-btn"
            disabled={loading}
            aria-label="Refresh holidays"
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw size={16} />
          </button>
        </div>
        {error && (
          <p className="dp-holidays-error" role="alert">
            {error}
          </p>
        )}
        <div className="dp-holidays-table-wrap">
          <table className="dp-holidays-table">
            <thead>
              <tr>
                <th scope="col">DATE</th>
                <th scope="col">HOLIDAY</th>
                <th scope="col">TYPE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }, (_, index) => <SkeletonRow key={index} columns={3} />)
              ) : error ? (
                <tr>
                  <td colSpan={3}>Holiday records could not be loaded. Use refresh to try again.</td>
                </tr>
              ) : holidays.length ? (
                holidays.map((holiday) => {
                  const start = String(holiday.startDate || holiday.holidayDate || "").slice(0, 10);
                  const end = String(holiday.endDate || holiday.startDate || holiday.holidayDate || "").slice(0, 10);
                  return (
                    <tr key={holiday.id ?? `${start}-${holiday.holidayName}`}>
                      <td>{start}{end !== start && ` to ${end}`}</td>
                      <td>{holiday.holidayName}</td>
                      <td>{holiday.holidayType || "--"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3}>No upcoming non-Sunday holidays found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

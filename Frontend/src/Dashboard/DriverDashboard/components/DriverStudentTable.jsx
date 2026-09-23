import React, { useState, useMemo } from "react";
import { Search, Phone, CheckCircle2, XCircle, Clock, Filter, AlertCircle, RefreshCw } from "lucide-react";
import DriverStatusBadge from "./DriverStatusBadge.jsx";
import DriverEmptyState from "./DriverEmptyState.jsx";

export default function DriverStudentTable({
  students = [],
  onUpdateStatus,
  stopsList = [],
  showFilters = true,
  title,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStop, setSelectedStop] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const filteredStudents = useMemo(() => {
    return students.filter((st) => {
      const matchesSearch =
        st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.stop.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStop = selectedStop === "All" || st.stop === selectedStop;
      const matchesStatus = selectedStatus === "All" || st.status === selectedStatus;

      return matchesSearch && matchesStop && matchesStatus;
    });
  }, [students, searchTerm, selectedStop, selectedStatus]);

  const uniqueStops = useMemo(() => {
    if (stopsList && stopsList.length > 0) return ["All", ...stopsList];
    const set = new Set(students.map((s) => s.stop));
    return ["All", ...Array.from(set)];
  }, [students, stopsList]);

  return (
    <div className="dp-student-table-container">
      {title && (
        <div className="dp-table-header-row">
          <div>
            <h3 className="dp-section-title">{title}</h3>
            <p className="dp-section-sub">Showing {filteredStudents.length} of {students.length} students</p>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="dp-table-controls">
          <div className="dp-search-box app-search-field">
            <Search size={16} className="dp-search-icon app-search-field__icon" />
            <input
              type="text"
              placeholder="Search by student name, roll number, class or stop..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="dp-input-search"
            />
            {searchTerm && (
              <button
                type="button"
                className="dp-search-clear"
                onClick={() => setSearchTerm("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="dp-filter-group">
            <div className="dp-select-wrapper">
              <Filter size={14} className="dp-select-icon" />
              <select
                value={selectedStop}
                onChange={(e) => setSelectedStop(e.target.value)}
                className="dp-select app-select"
              >
                {uniqueStops.map((stop) => (
                  <option key={stop} value={stop}>
                    {stop === "All" ? "All Pickup Stops" : `Stop: ${stop}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="dp-select-wrapper">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="dp-select app-select"
              >
                <option value="All">All Statuses</option>
                <option value="Picked Up">Picked Up</option>
                <option value="Pending">Pending</option>
                <option value="Not Boarded">Not Boarded</option>
                <option value="Absent">Absent</option>
              </select>
            </div>

            {(searchTerm || selectedStop !== "All" || selectedStatus !== "All") && (
              <button
                type="button"
                className="dp-btn dp-btn-ghost dp-btn-sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedStop("All");
                  setSelectedStatus("All");
                }}
              >
                <RefreshCw size={13} /> Reset
              </button>
            )}
          </div>
        </div>
      )}

      <div className="dp-table-responsive">
        {filteredStudents.length === 0 ? (
          <DriverEmptyState
            title="No students match criteria"
            description="Try adjusting your search terms or filter settings to view records."
          />
        ) : (
          <table className="dp-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>Seat</th>
                <th>Student Details</th>
                <th>Academic Class</th>
                <th>Pickup Stop</th>
                <th>Time</th>
                <th>Parent & Contact</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Attendance Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className={student.status === "Picked Up" ? "dp-row-picked" : ""}>
                  <td>
                    <span className="dp-seat-badge">{student.seatNo || "—"}</span>
                  </td>
                  <td>
                    <div className="dp-stu-cell">
                      <div className="dp-stu-avatar">
                        {student.name.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                      </div>
                      <div className="dp-stu-text">
                        <strong>{student.name}</strong>
                        <small>{student.rollNo}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="dp-class-tag">{student.class}</span>
                  </td>
                  <td>
                    <div className="dp-stop-cell">
                      <strong className="dp-stop-name">{student.stop}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="dp-time-tag">
                      <Clock size={12} /> {student.pickupTime}
                    </span>
                  </td>
                  <td>
                    <div className="dp-contact-cell">
                      <span className="dp-parent-name">{student.parentName}</span>
                      <a href={`tel:${student.parentPhone}`} className="dp-phone-link" title={`Call ${student.parentPhone}`}>
                        <Phone size={12} /> {student.parentPhone}
                      </a>
                    </div>
                  </td>
                  <td>
                    <DriverStatusBadge status={student.status} />
                  </td>
                  <td>
                    <div className="dp-action-buttons">
                      {student.status !== "Picked Up" && (
                        <button
                          type="button"
                          className="dp-action-btn dp-btn-pickup"
                          onClick={() => onUpdateStatus && onUpdateStatus(student.id, "Picked Up")}
                          title="Mark Picked Up"
                        >
                          <CheckCircle2 size={14} />
                          <span>Boarded</span>
                        </button>
                      )}
                      {student.status !== "Not Boarded" && (
                        <button
                          type="button"
                          className="dp-action-btn dp-btn-skip"
                          onClick={() => onUpdateStatus && onUpdateStatus(student.id, "Not Boarded")}
                          title="Mark as Missed / Not Boarded"
                        >
                          <XCircle size={14} />
                          <span>Missed</span>
                        </button>
                      )}
                      {student.status !== "Pending" && (
                        <button
                          type="button"
                          className="dp-action-btn dp-btn-reset"
                          onClick={() => onUpdateStatus && onUpdateStatus(student.id, "Pending")}
                          title="Reset to Pending"
                        >
                          <RefreshCw size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


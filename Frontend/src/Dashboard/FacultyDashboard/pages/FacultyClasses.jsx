import React from "react";
import "../styles/FacultyClasses.css";
import { facultyMockData, MOCK_TT_DAYS } from "../data/facultyMockData.js";

export default function FacultyClasses() {
  const uniqueClasses = facultyMockData.timetable
    .flatMap((slot) => MOCK_TT_DAYS.map((day) => slot[day] && { ...slot[day], time: slot.time }).filter(Boolean))
    .filter((entry, index, all) => all.findIndex((row) => row.cls === entry.cls && row.sub === entry.sub) === index);

  return (
    <div>
      <div className="cms-page-head">
        <div>
          <h1>My Classes</h1>
          <p>Classes assigned for Academic Year 2026-27.</p>
        </div>
      </div>
      <div className="cms-card">
        <div className="cms-card-head">
          <h2>Assigned Classes</h2>
        </div>
        <div className="cms-card-body">
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Code</th>
                  <th>Room</th>
                </tr>
              </thead>
              <tbody>
                {uniqueClasses.map((entry) => (
                  <tr key={entry.code + entry.cls}>
                    <td>{entry.cls}</td>
                    <td>{entry.sub}</td>
                    <td>{entry.code}</td>
                    <td>{entry.room}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


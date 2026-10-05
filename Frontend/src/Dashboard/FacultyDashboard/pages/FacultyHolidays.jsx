import React from "react";
import "../styles/FacultyHolidays.css";
import { facultyMockData } from "../data/facultyMockData.js";

export default function FacultyHolidays() {
  return (
    <div>
      <div className="cms-page-head">
        <div>
          <h1>Holidays</h1>
          <p>Academic calendar holidays.</p>
        </div>
      </div>
      <div className="cms-card">
        <div className="cms-card-head">
          <h2>Upcoming Holidays</h2>
        </div>
        <div className="cms-card-body">
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Holiday</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {facultyMockData.holidays.map((holiday) => (
                  <tr key={holiday.date}>
                    <td>{holiday.date}</td>
                    <td>{holiday.name}</td>
                    <td>{holiday.type}</td>
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


import React from "react";
import MarksEntryPage from "@/components/pages/MarksEntryPage.jsx";
import "../styles/FacultyMarks.css";

export default function FacultyMarks() {
  return (
    <div className="cms-marks-entry-embedded">
      <MarksEntryPage key="faculty-marks-entry" embedded={true} />
    </div>
  );
}


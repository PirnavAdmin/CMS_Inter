import StudentCard from "../components/StudentCard.jsx";
import StudentDataTable from "../components/StudentDataTable.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import { exams } from "../data/studentMockData.js";
export default function StudentExaminations() { return <div className="sp-page"><StudentPageHeader title="Examinations" subtitle="View published examination schedules and instructions."/><StudentCard title="Upcoming Exams" subtitle="Quarterly Examination · September 2026"><StudentDataTable columns={["Exam", "Subject", "Date", "Time", "Duration", "Room / Hall", "Maximum Marks"]} rows={exams}/></StudentCard><StudentCard title="Examination Instructions"><ul className="sp-list"><li>Report to the examination hall at least 20 minutes before the scheduled time.</li><li>Carry your college identity card and required stationery.</li><li>Electronic devices are not permitted inside the hall.</li></ul></StudentCard></div>; }

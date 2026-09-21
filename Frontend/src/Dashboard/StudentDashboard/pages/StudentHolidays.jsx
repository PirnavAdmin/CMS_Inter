import StudentCard from "../components/StudentCard.jsx";
import StudentDataTable from "../components/StudentDataTable.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import { holidays } from "../data/studentMockData.js";
export default function StudentHolidays() { return <div className="sp-page"><StudentPageHeader title="Holidays" subtitle="Academic holiday calendar for 2026-2027."/><StudentCard title="Academic Holidays" subtitle={`${holidays.length} upcoming holidays`}><StudentDataTable columns={["Holiday", "Date", "Day", "Type", "Status"]} rows={holidays} statusColumns={[4]}/></StudentCard></div>; }

import { Hotel } from "lucide-react";
import StudentCard from "../components/StudentCard.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
export default function StudentHostel() { return <div className="sp-page"><StudentPageHeader title="Hostel" subtitle="View your hostel allocation information."/><StudentCard title="Hostel Allocation"><StudentEmptyState icon={Hotel} title="No Hostel Allocation" text="You are currently not assigned to a hostel."/></StudentCard></div>; }

import { useEffect, useState } from "react";
import StudentDataTable from "@/Dashboard/StudentDashboard/components/StudentDataTable.jsx";
import "./AccountantPayrollRecords.css";

const RECORDS_PER_PAGE = 5;

export default function AccountantPayrollRecords({ records, formatAmount }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(records.length / RECORDS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * RECORDS_PER_PAGE;
  const endIndex = Math.min(startIndex + RECORDS_PER_PAGE, records.length);
  useEffect(() => {
    setCurrentPage(current => Math.min(current, totalPages));
  }, [totalPages]);

  return <>
    <StudentDataTable columns={["Staff Member", "Month", "Net Amount", "Status"]} statusColumns={[3]} rows={records.slice(startIndex, endIndex).map(row => ({ "Staff Member": row.staffName, Month: row.month, "Net Amount": formatAmount(row.amount), Status: row.status }))} empty="No payroll records available." />
    {records.length > 0 && <div className="acct-payroll-pagination">
      <span role="status" aria-live="polite">Showing {startIndex + 1}–{endIndex} of {records.length} records</span>
      {totalPages > 1 && <nav aria-label="Payroll records pagination">
        <button type="button" className="sp-btn" disabled={page === 1} onClick={() => setCurrentPage(page - 1)}>Previous</button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map(number => <button type="button" key={number} className={`sp-btn${number === page ? " primary" : ""}`} aria-label={`Page ${number}`} aria-current={number === page ? "page" : undefined} onClick={() => setCurrentPage(number)}>{number}</button>)}
        <button type="button" className="sp-btn" disabled={page === totalPages} onClick={() => setCurrentPage(page + 1)}>Next</button>
      </nav>}
    </div>}
  </>;
}

import { Children, Fragment, cloneElement, isValidElement, useEffect, useState } from "react";
import { Pagination } from "./Ui.jsx";

const PAGE_SIZE = 5;

function tableRows(children) {
  return Children.toArray(children).flatMap((child) =>
    isValidElement(child) && child.type === Fragment ? tableRows(child.props.children) : [child],
  );
}

// Paginate already-rendered records without changing their data, handlers, or exports.
export default function PaginatedTable({ children, paginate = true, ...props }) {
  const [page, setPage] = useState(1);
  const sections = Children.toArray(children);
  const body = sections.find((child) => isValidElement(child) && child.type === "tbody");
  const rows = tableRows(body?.props.children);
  const empty = rows.length === 1 && isValidElement(rows[0]) &&
    Children.toArray(rows[0].props.children).some((cell) => isValidElement(cell) && Number(cell.props.colSpan) > 1);
  const total = empty ? 0 : rows.length;
  const current = Math.min(page, Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const signature = rows.map((row) => isValidElement(row) ? row.key : "").join("|");
  useEffect(() => setPage(1), [signature]);

  return (
    <>
      <div className="paginated-table-scroll" style={{ width: "100%", maxWidth: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table {...props}>
          {sections.map((section) => paginate && section === body
            ? cloneElement(body, {}, empty ? rows : rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE))
            : section)}
        </table>
      </div>
      {paginate && <Pagination currentPage={current} totalRecords={total} pageSize={PAGE_SIZE} onPageChange={setPage} />}
    </>
  );
}

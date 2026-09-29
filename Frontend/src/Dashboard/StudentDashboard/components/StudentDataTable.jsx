import StudentStatusBadge from "./StudentStatusBadge.jsx";

export default function StudentDataTable({ columns, rows, statusColumns = [], renderCell, empty = "No records available." }) {
  return <div className="sp-table-wrap"><table className="sp-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, rowIndex) => <tr key={row.id || rowIndex}>{columns.map((column, columnIndex) => { const value = Array.isArray(row) ? row[columnIndex] : row[column]; return <td key={column}>{renderCell ? renderCell(value, row, column, columnIndex) : statusColumns.includes(columnIndex) ? <StudentStatusBadge value={value}/> : value ?? "—"}</td>; })}</tr>) : <tr><td colSpan={columns.length}><div className="sp-empty">{empty}</div></td></tr>}</tbody></table></div>;
}

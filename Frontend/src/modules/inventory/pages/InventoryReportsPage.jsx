import { useEffect, useState } from "react";
import { inventoryReport } from "@/modules/admin/AdminInventory/inventoryApi.js";
import { useInventory } from "../InventoryDataContext.jsx";
import { buildReport, REPORTS } from "@/modules/admin/AdminInventory/inventoryReports.js";
import { money } from "@/modules/admin/AdminInventory/inventoryModel.js";
import InventoryTable from "../components/InventoryTable.jsx";
export default function InventoryReportsPage() {
  const { state } = useInventory();
  const [report, setReport] = useState(REPORTS[0]);
  const [dates, setDates] = useState({});
  const [remote, setRemote] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setRemote(null);
    setError("");
    if (dates.from && dates.to && dates.from > dates.to) return () => controller.abort();
    inventoryReport(report, dates, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setRemote(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [report, dates, state]);
  const result = remote || { columns: buildReport(state, report, dates).columns, rows: [] };
  return (
    <>
      <div className="ip-page-head">
        <div>
          <h1>Inventory Reports</h1>
          <p>Review stock, valuation, purchases, issues, and returns.</p>
        </div>
      </div>
      <div className="ip-card ip-actions">
        <select aria-label="Report type" value={report} onChange={(e) => setReport(e.target.value)}>
          {REPORTS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <label>
          Date From
          <input
            type="date"
            value={dates.from || ""}
            max={dates.to}
            onChange={(e) => setDates({ ...dates, from: e.target.value })}
          />
        </label>
        <label>
          Date To
          <input
            type="date"
            value={dates.to || ""}
            min={dates.from}
            onChange={(e) => setDates({ ...dates, to: e.target.value })}
          />
        </label>
        <button className="cms-btn cms-btn-ghost" onClick={() => setDates({})}>
          Reset
        </button>
      </div>
      {dates.from && dates.to && dates.from > dates.to && (
        <p role="alert" className="ip-error">
          Date To must be on or after Date From.
        </p>
      )}
      <InventoryTable
        title={report}
        rows={result.rows}
        columns={result.columns.map(([key, label, type]) => ({
          key,
          label,
          ...(type === "money" ? { render: (r) => money(r[key]) } : {}),
        }))}
      />
      {error && (
        <p className="ip-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

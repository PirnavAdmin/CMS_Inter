import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "@/shared/components/DataTable.jsx";
import { Field, StatusBadge } from "@/shared/components/Ui.jsx";
import { DEPARTMENTS } from "../data/inventoryMockData.js";
import { money, validRange } from "../inventoryModel.js";
import { inventoryCsv } from "../inventoryCsv.js";

export function useDialogFocus(onClose) {
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = document.querySelector(".inventory-dialog, .cms-confirm-dialog");
    if (!dialog) return undefined;
    dialog.setAttribute(
      "aria-label",
      dialog.querySelector("h3")?.textContent || "Inventory dialog",
    );
    const elements = () => [
      ...dialog.querySelectorAll(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
      ),
    ];
    elements()[0]?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab") {
        const controls = elements();
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [onClose]);
}
export function downloadCsv(title, columns, rows) {
  const content = inventoryCsv(columns, rows);
  const url = URL.createObjectURL(
    new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const column = (key, label, format) => ({
  key,
  label,
  ...(format
    ? { render: (row) => format(row[key]) }
    : ["status", "stockStatus", "returnStatus"].includes(key)
      ? {
          render: (row) => {
            const value = row[key];
            if (["Active", "Inactive"].includes(value)) return <StatusBadge value={value} />;
            const cls = ["Out of Stock", "Expired", "Overdue"].includes(value)
              ? "danger"
              : ["Low Stock", "Pending", "Expiring Soon", "Awaiting Return", "Correction"].includes(
                    value,
                  )
                ? "warn"
                : ["In Stock", "Posted", "Returned", "Valid"].includes(value)
                  ? "active"
                  : "inactive";
            return <span className={`cms-badge cms-badge-${cls}`}>{value}</span>;
          },
        }
      : {}),
});
export const currencyColumn = (key, label) => column(key, `${label} (INR)`, money);
export const actionColumn = (render) => ({
  key: "actions",
  label: "Actions",
  exportable: false,
  printable: false,
  render,
});
export function Action({ children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      className="cms-btn cms-btn-ghost inventory-small-btn"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function InventoryTable({
  pageSize = 5,
  title,
  columns,
  rows,
  onAdd,
  addLabel,
  onView,
  onEdit,
  onDelete,
  toolbarExtra,
  exportable = true,
}) {
  const [query, setQuery] = useState("");
  const onSearch = useCallback((value) => setQuery(value), []);
  const visible = useMemo(
    () =>
      rows.filter(
        (row) =>
          !query.trim() ||
          Object.entries(row)
            .filter(([key]) => key !== "actions")
            .map(([, value]) => String(value ?? ""))
            .join(" ")
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [rows, query],
  );
  return (
    <DataTable
      pageSize={pageSize}
      title={title}
      columns={columns}
      rows={visible}
      onSearchChange={onSearch}
      onAdd={onAdd}
      addLabel={addLabel}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      enableExport={exportable}
      enablePdfExport={exportable}
      enableTablePrint={exportable}
      toolbarExtra={toolbarExtra}
      emptyMessage="No matching inventory records. Change the filters or add a record."
    />
  );
}
export function InventoryFilters({ state, values, onChange, mode = "items", onApply }) {
  const choice = (name, label, options) => ({
    name,
    label,
    type: "select",
    options: [{ value: "", label: "All" }, ...options],
  });
  const options = (records) => records.map((r) => ({ value: r.id, label: r.name }));
  const fields = [
    ...(mode !== "masters" ? [choice("itemId", "Item", options(state.items))] : []),
    choice("categoryId", "Category", options(state.categories)),
    ...(mode !== "masters" ? [choice("department", "Department", DEPARTMENTS)] : []),
    ...(mode === "items" || mode === "masters"
      ? [choice("status", "Status", ["Active", "Inactive"])]
      : []),
    ...(mode === "items" || mode === "reports"
      ? [choice("stockStatus", "Stock Status", ["In Stock", "Low Stock", "Out of Stock"])]
      : []),
    ...(mode === "reports" ? [choice("supplierId", "Supplier", options(state.suppliers))] : []),
    ...(mode === "movements" || mode === "reports"
      ? [
          { name: "from", label: "Date From", type: "date" },
          { name: "to", label: "Date To", type: "date" },
          choice("type", "Movement Type", ["Stock In", "Stock Out"]),
        ]
      : []),
  ];
  return (
    <div className="cms-card inventory-filters">
      <div className="inventory-filter-grid">
        {fields.map((f) => (
          <Field
            key={f.name}
            field={f}
            value={values[f.name] || ""}
            onChange={onChange}
            error={
              f.name === "to" && !validRange(values) ? "Date To must be on or after Date From." : ""
            }
          />
        ))}
      </div>
      <div className="inventory-form-actions">
        {onApply && (
          <button
            className="cms-btn cms-btn-primary"
            disabled={!validRange(values)}
            onClick={onApply}
          >
            Apply Filters
          </button>
        )}
        <button className="cms-btn cms-btn-ghost" onClick={() => onChange("__reset__")}>
          Reset Filters
        </button>
      </div>
    </div>
  );
}

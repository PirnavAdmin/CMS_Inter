import { useMemo, useState } from "react";
import { BarChart3, Boxes, CircleAlert, IndianRupee, ShoppingCart } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  actionColumn,
  Action,
  column,
  currencyColumn,
  InventoryFilters,
  InventoryTable,
} from "./InventoryUi.jsx";
import {
  chronological,
  canReverseMovement,
  enrichItem,
  enrichMovement,
  filterItems,
  filterMovements,
  lowStock,
  money,
  stockValue,
  validRange,
} from "../inventoryModel.js";
import { buildReport, MOVEMENT_COLUMNS, REPORTS } from "../inventoryReports.js";

const fieldsToColumns = (fields) =>
  fields.map(([key, label, type]) =>
    type === "money" ? currencyColumn(key, label) : column(key, label),
  );
export const ITEM_COLUMNS = [
  column("index", "#"),
  column("name", "Item Name"),
  column("code", "Item Code"),
  column("category", "Category"),
  column("description", "Description"),
  column("unit", "Unit"),
  column("quantity", "Current Stock"),
  column("minStock", "Minimum Stock"),
  currencyColumn("unitCost", "Unit Cost"),
  currencyColumn("stockValue", "Total Stock Value"),
  column("supplier", "Supplier"),
  column("location", "Storage Location"),
  column("department", "Department"),
  column("status", "Status"),
  column("stockStatus", "Stock Status"),
];
const movementColumns = fieldsToColumns(MOVEMENT_COLUMNS);

function useFilters() {
  const [filters, setFilters] = useState({});
  const [reset, setReset] = useState(0);
  const change = (name, value) => {
    if (name === "__reset__") {
      setFilters({});
      setReset((r) => r + 1);
    } else setFilters((f) => ({ ...f, [name]: value }));
  };
  return { filters, change, reset };
}

export function InventoryDashboard({ state, open, refresh }) {
  const items = state.items.map((i) => enrichItem(state, i));
  const alerts = items.filter(lowStock);
  const recent = chronological(state.movements)
    .reverse()
    .slice(0, 8)
    .map((m) => enrichMovement(state, m));
  const categoryData = state.categories
    .map((c) => {
      const records = items.filter((i) => i.categoryId === c.id);
      return {
        id: c.id,
        name: c.name,
        count: records.length,
        value: records.reduce((total, item) => total + stockValue(item), 0),
      };
    })
    .filter((c) => c.count);
  const stats = [
    ["Total Items", items.length, Boxes, "Distinct item records"],
    [
      "Total Stock Value",
      money(items.reduce((total, item) => total + stockValue(item), 0)),
      IndianRupee,
      "Moving weighted-average cost",
    ],
    [
      "Low Stock Items",
      alerts.length,
      CircleAlert,
      "Active items below minimum, including zero stock",
    ],
    [
      "Pending Orders",
      state.orders.filter((o) => o.status === "Pending").length,
      ShoppingCart,
      state.orders.length ? "Local demo purchase orders" : "No purchase orders in this demo",
    ],
  ];
  return (
    <>
      <div className="inventory-kpis">
        {stats.map(([label, value, Icon, note]) => (
          <article className="cms-card inventory-kpi" key={label}>
            <span className="inventory-kpi-icon">
              <Icon size={22} />
            </span>
            <p>{label}</p>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </div>
      <div className="inventory-panel-head">
        <h2>Recent Stock Movements</h2>
      </div>
      <InventoryTable
        title="Recent Stock Movements"
        columns={[
          column("date", "Date"),
          column("item", "Item Name"),
          column("code", "Item Code"),
          column("type", "Movement Type"),
          column("quantity", "Quantity"),
          column("department", "Department / Destination"),
          column("performedBy", "Performed By"),
          column("remarks", "Remarks"),
        ]}
        rows={recent}
        onView={(m) => open("movement-detail", m)}
        exportable={false}
      />
      <div className="inventory-panel-head">
        <h2>Low Stock Alerts</h2>
        <span>{alerts.length} items need attention</span>
      </div>
      <InventoryTable
        title="Low Stock Alerts"
        rows={alerts}
        columns={[
          column("name", "Item Name"),
          column("code", "Item Code"),
          column("quantity", "Current Stock"),
          column("minStock", "Minimum Stock"),
          column("stockStatus", "Status"),
          actionColumn((item) => (
            <div className="inventory-row-actions">
              <Action onClick={() => open("item-detail", item)}>View Item</Action>
              <Action onClick={() => open("stock-in", null, item.id)}>Restock</Action>
            </div>
          )),
        ]}
        exportable={false}
      />
      <div className="inventory-two-columns">
        <section className="cms-card inventory-panel">
          <h2>
            <BarChart3 size={18} /> Inventory by Category
          </h2>
          <div className="inventory-chart">
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 6, right: 20 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="var(--cms-border)"
                />
                <XAxis type="number" allowDecimals={false} stroke="var(--cms-muted)" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={145}
                  tick={{ fontSize: 10 }}
                  stroke="var(--cms-muted)"
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--cms-surface)",
                    color: "var(--cms-text)",
                    borderColor: "var(--cms-border)",
                  }}
                />
                <Bar dataKey="count" name="Items" fill="var(--cms-primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="cms-card inventory-panel">
          <h2>Inventory Value Summary</h2>
          {categoryData.map((c) => (
            <div className="inventory-value-row" key={c.id}>
              <span>{c.name}</span>
              <strong>{money(c.value)}</strong>
            </div>
          ))}
        </section>
      </div>
      <section className="cms-card inventory-panel">
        <h2>Recent Activity</h2>
        <ul className="inventory-activity">
          {state.activities.slice(0, 8).map((a) => (
            <li key={a.id}>
              <time>{a.date}</time>
              <span>{a.text}</span>
            </li>
          ))}
          {recent.slice(0, 5).map((m) => (
            <li key={`activity-${m.id}`}>
              <time>{m.date}</time>
              <span>
                {m.type}: {m.quantity} {m.unit} · {m.item} · {m.performedBy}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export function InventoryItems({ state, open, remove, refresh }) {
  const { filters, change, reset } = useFilters();
  const rows = filterItems(state, filters).map((item, index) => ({ ...item, index: index + 1 }));
  const columns = [
    ...ITEM_COLUMNS,
    actionColumn((item) => (
      <div className="inventory-row-actions">
        <Action onClick={() => open("item-detail", item)}>View / Ledger</Action>
        <Action onClick={() => open("items", item)}>Edit</Action>
        <Action onClick={() => open("stock-in", null, item.id)} disabled={item.status !== "Active"}>
          Stock In
        </Action>
        <Action
          onClick={() => open("stock-out", null, item.id)}
          disabled={item.status !== "Active" || item.quantity === 0}
        >
          Stock Out
        </Action>
        <Action onClick={() => remove("items", item)}>Delete / Deactivate</Action>
      </div>
    )),
  ];
  return (
    <>
      <InventoryFilters state={state} values={filters} onChange={change} />
      <InventoryTable
        key={reset}
        title="Inventory Items"
        rows={rows}
        columns={columns}
        onAdd={() => open("items")}
        addLabel="Add Item"
        onRefresh={refresh}
      />
    </>
  );
}

export function InventoryMovements({ state, type, all, open, correct, returnItem, refresh }) {
  const { filters, change, reset } = useFilters();
  const scope = { ...filters, type: filters.type || (all ? "" : type) };
  const rows = filterMovements(state, scope).reverse();
  const columns = [
    ...movementColumns.filter((c) => ["item", "code"].includes(c.key)),
    {
      ...movementColumns[0],
      render: (movement) => movement.paymentTransactionNumber || movement.number || "—",
    },
    column("paymentMethod", "Payment Method", (value) => value || "—"),
    {
      key: "cashReceipt",
      label: "Cash Receipt",
      exportable: false,
      printable: false,
      render: (movement) => {
        const receipt = movement.cashReceipt;
        const url =
          movement.cashReceiptUrl ||
          receipt?.dataUrl ||
          receipt?.DataUrl ||
          receipt?.url ||
          receipt?.Url;
        const name = receipt?.name || receipt?.Name || "Cash receipt";
        if (!url || !/^(https?:\/\/|\/(?!\/)|data:image\/(png|jpeg|webp);base64,)/i.test(url))
          return "—";
        return (
          <a href={url} target="_blank" rel="noopener noreferrer" title="View cash receipt">
            <img className="inventory-table-receipt" src={url} alt={name} />
          </a>
        );
      },
    },
    ...movementColumns.slice(1).filter((c) => !["item", "code"].includes(c.key)),
    ...(type === "Stock In" || all
      ? [column("purchaseOrder", "Purchase Order Number"), column("invoice", "Invoice Number")]
      : [column("approvedBy", "Approved By")]),
    column("remarks", "Remarks"),
    actionColumn((m) => (
      <div className="inventory-row-actions">
        <Action onClick={() => open("movement-detail", m)}>View Details</Action>
        {m.status === "Posted" && !m.correctionOf && !m.returnOf && (
          <Action disabled={!canReverseMovement(state, m)} onClick={() => correct(m)}>
            Reverse
          </Action>
        )}
        {m.type === "Stock Out" &&
          m.returnable &&
          m.status === "Posted" &&
          !state.movements.some((r) => r.returnOf === m.id) && (
            <Action onClick={() => returnItem(m)}>Record Return</Action>
          )}
      </div>
    )),
  ];
  return (
    <>
      <p className="inventory-note">
        {all ? "Showing all stock movements." : `Showing ${scope.type} movements.`} Posted movements
        are immutable. Reverse the latest movement for an item to correct it; the correction stays
        in the ledger.
      </p>
      <InventoryFilters state={state} values={scope} onChange={change} mode="movements" />
      <InventoryTable
        key={reset}
        title={all ? "Stock Movement History" : type}
        rows={rows}
        columns={columns}
        onAdd={() => open(type === "Stock In" ? "stock-in" : "stock-out")}
        addLabel={`Add ${type}`}
        onRefresh={refresh}
      />
    </>
  );
}

export function InventoryMasters({ kind, state, open, remove, refresh }) {
  const { filters, change, reset } = useFilters();
  const isSupplier = kind === "suppliers";
  const rows = state[kind]
    .map((r, index) => {
      if (isSupplier)
        return {
          ...r,
          index: index + 1,
          address: [r.address1, r.address2, r.city, r.state, r.postalCode, r.country]
            .filter(Boolean)
            .join(", "),
          categories: (r.categoryIds || [])
            .map((id) => state.categories.find((c) => c.id === id)?.name)
            .filter(Boolean)
            .join(", "),
          totalPurchases: state.movements
            .filter(
              (m) =>
                m.supplierId === r.id &&
                m.type === "Stock In" &&
                m.status === "Posted" &&
                !m.returnOf &&
                !m.correctionOf,
            )
            .reduce((sum, m) => sum + m.total, 0),
        };
      const items = state.items.filter((i) => i.categoryId === r.id);
      return {
        ...r,
        index: index + 1,
        count: items.length,
        value: items.reduce((sum, i) => sum + stockValue(i), 0),
        alerts: items.filter(lowStock).length,
      };
    })
    .filter(
      (r) =>
        (!filters.status || r.status === filters.status) &&
        (!filters.categoryId ||
          (isSupplier ? r.categoryIds?.includes(filters.categoryId) : r.id === filters.categoryId)),
    );
  const columns = isSupplier
    ? [
        column("index", "#"),
        column("name", "Supplier Name"),
        column("code", "Supplier Code"),
        column("contact", "Contact Person"),
        column("phone", "Phone"),
        column("email", "Email"),
        column("gstin", "GSTIN"),
        column("address", "Address"),
        column("categories", "Supplied Categories"),
        currencyColumn("totalPurchases", "Total Purchases"),
        column("status", "Status"),
      ]
    : [
        column("index", "#"),
        column("name", "Category Name"),
        column("code", "Category Code"),
        column("description", "Description"),
        column("count", "Number of Items"),
        currencyColumn("value", "Total Stock Value"),
        column("alerts", "Minimum Stock Alerts"),
        column("status", "Status"),
      ];
  columns.push(
    actionColumn((r) =>
      isSupplier ? (
        <div className="cms-actions">
          <button
            type="button"
            className="cms-action-btn view"
            title="View Supplier"
            aria-label={`View ${r.name}`}
            onClick={() => open("supplier-detail", r)}
          >
            <Eye size={15} />
          </button>
          <button
            type="button"
            className="cms-action-btn edit"
            title="Edit Supplier"
            aria-label={`Edit ${r.name}`}
            onClick={() => open(kind, r)}
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            className="cms-action-btn danger"
            title="Deactivate Supplier"
            aria-label={`Deactivate ${r.name}`}
            disabled={r.status === "Inactive"}
            onClick={() => remove(kind, r)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ) : (
        <div className="inventory-row-actions">
          <Action onClick={() => open(isSupplier ? "supplier-detail" : "category-detail", r)}>
            View
          </Action>
          <Action onClick={() => open(kind, r)}>Edit</Action>
          <Action onClick={() => remove(kind, r)} disabled={r.status === "Inactive"}>
            Deactivate
          </Action>
        </div>
      ),
    ),
  );
  return (
    <>
      <InventoryTable
        key={reset}
        title={isSupplier ? "Suppliers" : "Inventory Categories"}
        rows={rows}
        columns={columns}
        onAdd={() => open(kind)}
        addLabel={`Add ${isSupplier ? "Supplier" : "Category"}`}
        onRefresh={refresh}
        toolbarExtra={
          <div className="inventory-items-toolbar-filters">
            <select
              className="cms-btn cms-btn-ghost"
              aria-label="Filter by category"
              value={filters.categoryId || ""}
              onChange={(event) => change("categoryId", event.target.value)}
            >
              <option value="">Category: All</option>
              {state.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              className="cms-btn cms-btn-ghost"
              aria-label="Filter by status"
              value={filters.status || ""}
              onChange={(event) => change("status", event.target.value)}
            >
              <option value="">Status: All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        }
      />
    </>
  );
}

export function InventoryReports({ state, open, returnItem }) {
  const [report, setReport] = useState(REPORTS[0]);
  const [draft, setDraft] = useState({});
  const [applied, setApplied] = useState({});
  const [reset, setReset] = useState(0);
  const change = (name, value) => {
    if (name === "__reset__") {
      setDraft({});
      setApplied({});
      setReset((r) => r + 1);
    } else setDraft((f) => ({ ...f, [name]: value }));
  };
  const result = useMemo(() => buildReport(state, report, applied), [state, report, applied]);
  const columns = fieldsToColumns(result.columns);
  if (report === "Low Stock Report")
    columns.push(
      actionColumn((i) => <Action onClick={() => open("stock-in", null, i.id)}>Restock</Action>),
    );
  if (report === "Returnable Items Report")
    columns.push(
      actionColumn((m) => (
        <Action
          onClick={() => returnItem(m)}
          disabled={["Returned", "Reversed"].includes(m.returnStatus)}
        >
          Record Return
        </Action>
      )),
    );
  return (
    <>
      <div className="inventory-report-tabs" role="group" aria-label="Select inventory report">
        {REPORTS.map((name) => (
          <button
            key={name}
            className={`cms-btn ${report === name ? "cms-btn-primary" : "cms-btn-ghost"}`}
            aria-pressed={report === name}
            onClick={() => setReport(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <InventoryFilters
        state={state}
        values={draft}
        onChange={change}
        mode="reports"
        onApply={() => {
          if (validRange(draft)) {
            setApplied({ ...draft });
            setReset((r) => r + 1);
          }
        }}
      />
      <p className="inventory-note">
        {report === "Expiry / Warranty Report"
          ? "Dates filter expiry and warranty dates. Days remaining are measured from today."
          : "Dates include both endpoints. Stock reports show balances as of Date To; opening stock is the balance before Date From. Movement Type limits the item scope in balance reports; complete movements still determine each balance."}{" "}
        Returns and corrections appear as separate stock movements.
      </p>
      {JSON.stringify(draft) !== JSON.stringify(applied) && (
        <p className="inventory-note">Filters changed. Select Apply Filters to update results.</p>
      )}
      <InventoryTable
        key={`${report}-${reset}`}
        title={report}
        columns={columns}
        rows={result.rows}
      />
    </>
  );
}

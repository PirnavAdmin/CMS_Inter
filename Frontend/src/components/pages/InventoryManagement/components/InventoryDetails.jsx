import { useState } from "react";
import { Field, Modal } from "@/components/common/Ui.jsx";
import { column, currencyColumn, InventoryTable, useDialogFocus } from "./InventoryUi.jsx";
import {
  dateInRange,
  enrichItem,
  enrichMovement,
  ledger,
  money,
  stockValue,
  validRange,
} from "../inventoryModel.js";

const label = (key) =>
  ({
    name: "Name",
    code: "Code",
    minStock: "Minimum Stock",
    maxStock: "Maximum Stock",
    openingQty: "Opening Stock",
    openingCost: "Opening Unit Cost",
    unitCost: "Current Unit Cost",
    stockValue: "Current Stock Value",
    warrantyDate: "Warranty Expiry",
    sku: "Barcode / SKU",
    quantity: "Current Stock",
    createdAt: "Created Date",
    updatedAt: "Last Updated",
    categoryIds: "Supplied Categories",
    contact: "Contact Person",
    performedBy: "Performed By",
    expectedReturnDate: "Expected Return Date",
    date: "Transaction Date",
    number: "Transaction Number",
    total: "Total Value",
    partner: "Supplier / Recipient",
    returnOf: "Return Of",
    correctionOf: "Correction Of",
    issueType: "Issue To Type",
  })[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (first) => first.toUpperCase());
function Details({ values }) {
  return (
    <dl className="inventory-details-grid">
      {Object.entries(values)
        .filter(
          ([key]) =>
            !["id", "sequence", "index", "categoryId", "supplierId", "itemId", "actions"].includes(
              key,
            ),
        )
        .map(([key, value]) => (
          <div key={key}>
            <dt>{label(key)}</dt>
            <dd>
              {typeof value === "boolean"
                ? value
                  ? "Yes"
                  : "No"
                : Array.isArray(value)
                  ? value.join(", ") || "—"
                  : [
                        "unitCost",
                        "openingCost",
                        "stockValue",
                        "total",
                        "totalPurchases",
                        "issueValue",
                        "value",
                      ].includes(key)
                    ? money(value)
                    : value === "" || value === undefined || value === null
                      ? "—"
                      : String(value)}
            </dd>
          </div>
        ))}
    </dl>
  );
}
export default function InventoryDetails({ kind, record, state, onClose }) {
  const [dates, setDates] = useState({ from: "", to: "" });
  const [reset, setReset] = useState(0);
  useDialogFocus(onClose);
  let title;
  let values;
  let history = null;
  if (kind === "item-detail") {
    const item = state.items.find((i) => i.id === record.id);
    if (!item) return null;
    title = `${item.name} · Item Details & Stock Ledger`;
    const movements = ledger(state, item.id).map((m) => ({
      ...enrichMovement(state, m),
      destination: [
        m.department,
        m.supplierId ? state.suppliers.find((s) => s.id === m.supplierId)?.name : m.recipient,
      ]
        .filter(Boolean)
        .join(" / "),
    }));
    values = {
      ...enrichItem(state, item),
      totalStockIn: movements.reduce((total, m) => total + m.quantityIn, 0),
      totalStockOut: movements.reduce((total, m) => total + m.quantityOut, 0),
    };
    const filtered = validRange(dates) ? movements.filter((m) => dateInRange(m.date, dates)) : [];
    history = (
      <>
        <h3>Stock Ledger</h3>
        <p className="inventory-note">
          Opening balance: {item.openingQty} {item.unit} · Final running balance:{" "}
          {movements.at(-1)?.balance ?? item.openingQty} · Current stock: {item.quantity}. Running
          balances include earlier movements when date filters are applied.
        </p>
        <div className="inventory-filter-grid">
          <Field
            field={{ name: "from", label: "Date From", type: "date" }}
            value={dates.from}
            onChange={(key, val) => setDates((d) => ({ ...d, [key]: val }))}
          />
          <Field
            field={{ name: "to", label: "Date To", type: "date" }}
            value={dates.to}
            error={!validRange(dates) ? "End date must be on or after start date." : ""}
            onChange={(key, val) => setDates((d) => ({ ...d, [key]: val }))}
          />
          <button
            className="cms-btn cms-btn-ghost"
            onClick={() => {
              setDates({ from: "", to: "" });
              setReset((r) => r + 1);
            }}
          >
            Reset Filters
          </button>
        </div>
        <InventoryTable
          key={reset}
          title={`${item.code} Stock Ledger`}
          rows={filtered}
          columns={[
            column("date", "Date"),
            column("number", "Transaction Number"),
            column("type", "Movement Type"),
            column("quantityIn", "Quantity In"),
            column("quantityOut", "Quantity Out"),
            column("balance", "Running Balance"),
            currencyColumn("unitCost", "Unit Cost"),
            column("reference", "Reference"),
            column("destination", "Department / Supplier / Recipient"),
            column("performedBy", "Performed By"),
            column("status", "Status"),
          ]}
        />
      </>
    );
  } else if (kind === "movement-detail") {
    const movement = state.movements.find((m) => m.id === record.id);
    if (!movement) return null;
    title = movement.number;
    values = {
      ...enrichMovement(state, movement),
      correctionOf: state.movements.find((m) => m.id === movement.correctionOf)?.number || "",
      returnOf: state.movements.find((m) => m.id === movement.returnOf)?.number || "",
    };
  } else if (kind === "supplier-detail") {
    const supplier = state.suppliers.find((s) => s.id === record.id);
    if (!supplier) return null;
    title = supplier.name;
    const purchases = state.movements
      .filter((m) => m.supplierId === supplier.id)
      .map((m) => enrichMovement(state, m));
    values = {
      ...supplier,
      categoryIds: (supplier.categoryIds || []).map(
        (id) => state.categories.find((c) => c.id === id)?.name || "Unknown category",
      ),
      totalPurchases: purchases
        .filter(
          (m) => m.type === "Stock In" && m.status === "Posted" && !m.returnOf && !m.correctionOf,
        )
        .reduce((sum, m) => sum + m.total, 0),
    };
    history = (
      <InventoryTable
        title="Supplier Stock Movements"
        rows={purchases}
        columns={[
          column("date", "Date"),
          column("number", "Transaction Number"),
          column("item", "Item"),
          column("type", "Movement Type"),
          column("quantity", "Quantity"),
          currencyColumn("total", "Value"),
          column("status", "Status"),
        ]}
      />
    );
  } else {
    const category = state.categories.find((c) => c.id === record.id);
    if (!category) return null;
    const items = state.items
      .filter((i) => i.categoryId === category.id)
      .map((i) => enrichItem(state, i));
    title = category.name;
    values = {
      ...category,
      count: items.length,
      stockValue: items.reduce((sum, i) => sum + stockValue(i), 0),
    };
    history = (
      <InventoryTable
        title="Category Items"
        rows={items}
        columns={[
          column("code", "Item Code"),
          column("name", "Item Name"),
          column("quantity", "Current Stock"),
          currencyColumn("stockValue", "Stock Value"),
          column("status", "Status"),
        ]}
      />
    );
  }
  return (
    <Modal
      title={title}
      onClose={onClose}
      className="inventory-dialog inventory-details-dialog"
      footer={
        <button className="cms-btn cms-btn-ghost" onClick={onClose}>
          Close
        </button>
      }
    >
      <Details values={values} />
      {history}
    </Modal>
  );
}

import {
  chronological,
  dateInRange,
  enrichMovement,
  filterItems,
  filterMovements,
  lowStock,
  signedQuantity,
  stockStatus,
  today,
  validRange,
} from "./inventoryModel.js";

export const REPORTS = [
  "Stock Summary",
  "Stock Movement Report",
  "Low Stock Report",
  "Department-wise Issue Report",
  "Supplier Purchase Report",
  "Category-wise Inventory Value",
  "Expiry / Warranty Report",
  "Returnable Items Report",
];
export const MOVEMENT_COLUMNS = [
  ["number", "Transaction Number"],
  ["date", "Date"],
  ["item", "Item Name"],
  ["code", "Item Code"],
  ["type", "Movement Type"],
  ["quantity", "Quantity"],
  ["unitCost", "Unit Cost", "money"],
  ["total", "Total Value", "money"],
  ["partner", "Supplier / Recipient"],
  ["department", "Department"],
  ["reference", "Reference Number"],
  ["performedBy", "Performed By"],
  ["status", "Status"],
];
const sum = (rows, key) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);

function summaryRows(state, filters) {
  const scope = { ...filters, stockStatus: "" };
  let items = filterItems(state, scope).filter((i) => !filters.to || i.createdAt <= filters.to);
  if (filters.type) {
    const ids = new Set(
      filterMovements(state, { ...filters, stockStatus: "" }).map((m) => m.itemId),
    );
    items = items.filter((i) => ids.has(i.id));
  }
  return items
    .map((item) => {
      const movements = chronological(state.movements.filter((m) => m.itemId === item.id));
      const before = movements.filter((m) => filters.from && m.date < filters.from);
      const period = movements.filter((m) => dateInRange(m.date, filters));
      const throughEnd = movements.filter((m) => !filters.to || m.date <= filters.to);
      const openingInPeriod = !!filters.from && item.createdAt >= filters.from;
      const opening =
        (openingInPeriod ? 0 : item.openingQty) +
        before.reduce((total, m) => total + signedQuantity(m), 0);
      const received =
        (openingInPeriod ? item.openingQty : 0) +
        sum(
          period.filter((m) => m.type === "Stock In"),
          "quantity",
        );
      const issued = sum(
        period.filter((m) => m.type === "Stock Out"),
        "quantity",
      );
      const quantity =
        item.openingQty + throughEnd.reduce((total, m) => total + signedQuantity(m), 0);
      let value = item.openingQty * item.openingCost;
      let runningQuantity = item.openingQty;
      let lastCost = item.openingCost;
      for (const movement of throughEnd) {
        value += (movement.type === "Stock In" ? 1 : -1) * movement.total;
        runningQuantity += signedQuantity(movement);
        lastCost =
          runningQuantity > 0
            ? value / runningQuantity
            : movement.correctionOf && movement.previousUnitCost !== undefined
              ? movement.previousUnitCost
              : movement.unitCost;
      }
      const unitCost = quantity > 0 ? Math.max(0, value / quantity) : lastCost;
      return {
        ...item,
        opening,
        received,
        issued,
        quantity,
        unitCost,
        stockValue: quantity * unitCost,
        stockStatus: stockStatus({ ...item, quantity }),
      };
    })
    .filter((i) => !filters.stockStatus || i.stockStatus === filters.stockStatus);
}

export function buildReport(state, report, filters = {}) {
  if (!validRange(filters)) return { columns: [], rows: [] };
  const movements = filterMovements(state, filters);
  const items = summaryRows(state, filters);
  switch (report) {
    case "Stock Summary":
      return {
        columns: [
          ["code", "Item Code"],
          ["name", "Item Name"],
          ["category", "Category"],
          ["unit", "Unit"],
          ["opening", "Opening Stock"],
          ["received", "Stock Received"],
          ["issued", "Stock Issued"],
          ["quantity", "Current Stock"],
          ["minStock", "Minimum Stock"],
          ["unitCost", "Unit Cost", "money"],
          ["stockValue", "Stock Value", "money"],
          ["stockStatus", "Stock Status"],
          ["status", "Item Status"],
        ],
        rows: items,
      };
    case "Stock Movement Report":
      return { columns: MOVEMENT_COLUMNS, rows: movements };
    case "Low Stock Report":
      return {
        columns: [
          ["name", "Item"],
          ["category", "Category"],
          ["quantity", "Current Stock"],
          ["minStock", "Minimum Stock"],
          ["suggestedReorder", "Suggested Reorder Quantity"],
          ["supplier", "Preferred Supplier"],
        ],
        rows: items.filter(lowStock).map((i) => ({
          ...i,
          suggestedReorder: Math.max(i.reorderQty || 0, i.minStock - i.quantity),
        })),
      };
    case "Department-wise Issue Report":
      return {
        columns: [
          ["date", "Date"],
          ["item", "Item"],
          ["quantity", "Quantity"],
          ["department", "Department"],
          ["recipient", "Recipient"],
          ["purpose", "Purpose"],
          ["performedBy", "Issued By"],
          ["total", "Issue Value", "money"],
          ["status", "Status"],
        ],
        rows: movements.filter(
          (m) => m.type === "Stock Out" && m.status === "Posted" && !m.correctionOf,
        ),
      };
    case "Supplier Purchase Report":
      return {
        columns: [
          ["date", "Date"],
          ["partner", "Supplier"],
          ["invoice", "Invoice Number"],
          ["item", "Item"],
          ["quantity", "Quantity Received"],
          ["unitCost", "Unit Cost", "money"],
          ["total", "Total Amount", "money"],
          ["status", "Status"],
        ],
        rows: movements.filter(
          (m) =>
            m.type === "Stock In" &&
            m.status === "Posted" &&
            m.supplierId &&
            !m.returnOf &&
            !m.correctionOf,
        ),
      };
    case "Category-wise Inventory Value":
      return {
        columns: [
          ["name", "Category"],
          ["count", "Number of Items"],
          ["value", "Stock Value", "money"],
          ["alerts", "Minimum Stock Alerts"],
        ],
        rows: state.categories
          .map((c) => {
            const scoped = items.filter((i) => i.categoryId === c.id);
            return {
              id: c.id,
              name: c.name,
              count: scoped.length,
              quantity: sum(scoped, "quantity"),
              value: sum(scoped, "stockValue"),
              alerts: scoped.filter(lowStock).length,
            };
          })
          .filter((c) => c.count),
      };
    case "Expiry / Warranty Report": {
      const rows = [];
      const expiryItems = filterItems(state, { ...filters, supplierId: "" });
      const matching = new Set(expiryItems.map((i) => i.id));
      for (const item of expiryItems) {
        if (
          item.warrantyDate &&
          (!filters.supplierId || item.supplierId === filters.supplierId) &&
          (!filters.type || filters.type === "Stock In") &&
          dateInRange(item.warrantyDate, filters)
        )
          rows.push({
            id: `warranty-${item.id}`,
            item: item.name,
            code: item.code,
            batch: item.sku || "—",
            date: item.warrantyDate,
            kind: "Warranty",
          });
      }
      for (const movement of state.movements) {
        if (
          movement.type === "Stock In" &&
          movement.expiryDate &&
          movement.status === "Posted" &&
          matching.has(movement.itemId) &&
          (!filters.supplierId || movement.supplierId === filters.supplierId) &&
          (!filters.department || movement.department === filters.department) &&
          (!filters.type || movement.type === filters.type) &&
          dateInRange(movement.expiryDate, filters)
        ) {
          const enriched = enrichMovement(state, movement);
          rows.push({
            id: `expiry-${movement.id}`,
            item: enriched.item,
            code: enriched.code,
            batch: movement.batch || "—",
            date: movement.expiryDate,
            kind: "Expiry",
          });
        }
      }
      return {
        columns: [
          ["item", "Item"],
          ["code", "Item Code"],
          ["batch", "Batch / SKU"],
          ["kind", "Record Type"],
          ["date", "Expiry / Warranty Date"],
          ["days", "Days Remaining"],
          ["status", "Status"],
        ],
        rows: rows.map((r) => {
          const days = Math.ceil((Date.parse(r.date) - Date.parse(today())) / 86400000);
          return {
            ...r,
            days,
            status: days < 0 ? "Expired" : days <= 30 ? "Expiring Soon" : "Valid",
          };
        }),
      };
    }
    case "Returnable Items Report":
      return {
        columns: [
          ["number", "Transaction Number"],
          ["date", "Issue Date"],
          ["item", "Item"],
          ["quantity", "Quantity"],
          ["recipient", "Recipient"],
          ["department", "Department"],
          ["expectedReturnDate", "Expected Return"],
          ["returnStatus", "Return Status"],
        ],
        rows: movements
          .filter((m) => m.type === "Stock Out" && m.returnable)
          .map((m) => {
            const returned = state.movements.find((r) => r.returnOf === m.id);
            const reversed = m.status === "Reversed";
            return {
              ...m,
              returnStatus: reversed
                ? "Reversed"
                : returned
                  ? "Returned"
                  : m.expectedReturnDate < today()
                    ? "Overdue"
                    : "Awaiting Return",
            };
          }),
      };
    default:
      return { columns: [], rows: [] };
  }
}

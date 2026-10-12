import { createDemoState, STORAGE_KEY } from "./data/inventoryMockData.js";

export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
export const today = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value("year")}-${value("month")}-${value("day")}`;
};
const validDate = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export const stockStatus = (item) =>
  item.quantity === 0 ? "Out of Stock" : item.quantity < item.minStock ? "Low Stock" : "In Stock";
export const lowStock = (item) => item.status === "Active" && item.quantity < item.minStock;
export const stockValue = (item) => item.quantity * item.unitCost;
export const chronological = (movements) =>
  [...movements].sort((a, b) => a.date.localeCompare(b.date) || a.sequence - b.sequence);
const inbound = (movement) => movement.type === "Stock In";
export const signedQuantity = (movement) => (inbound(movement) ? 1 : -1) * movement.quantity;
export const dateInRange = (date, filters) =>
  (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to);
export function validRange(filters) {
  return !filters.from || !filters.to || filters.from <= filters.to;
}

export function loadInventory(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || "null");
    if (
      saved?.version === 1 &&
      ["items", "categories", "suppliers", "movements", "activities", "orders"].every((key) =>
        Array.isArray(saved[key]),
      ) &&
      Number.isInteger(saved.nextId)
    ) {
      for (const item of saved.items) {
        if (
          item.quantity < 0 ||
          !Number.isFinite(item.quantity) ||
          !Number.isFinite(item.unitCost) ||
          item.unitCost < 0 ||
          !saved.categories.some((c) => c.id === item.categoryId)
        )
          throw new Error("Invalid stored inventory");
        const balance = ledger(saved, item.id).at(-1)?.balance ?? item.openingQty;
        if (Math.abs(balance - item.quantity) > 1e-7)
          throw new Error("Unbalanced stored inventory");
      }
      return { state: saved, warning: "" };
    }
    return {
      state: createDemoState(),
      warning: saved ? "Saved demo data was incompatible. Sample data loaded." : "",
    };
  } catch {
    return {
      state: createDemoState(),
      warning: "Saved demo data could not be loaded. Sample data loaded.",
    };
  }
}
export function persistInventory(state, storage = globalThis.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}
export function ledger(state, itemId) {
  const item = state.items.find((record) => record.id === itemId);
  if (!item) return [];
  let balance = item.openingQty;
  return chronological(state.movements.filter((m) => m.itemId === itemId)).map((m) => {
    balance += signedQuantity(m);
    return {
      ...m,
      quantityIn: inbound(m) ? m.quantity : 0,
      quantityOut: inbound(m) ? 0 : m.quantity,
      balance,
    };
  });
}
export function enrichItem(state, item) {
  return {
    ...item,
    category: state.categories.find((c) => c.id === item.categoryId)?.name || "Unknown category",
    supplier: state.suppliers.find((s) => s.id === item.supplierId)?.name || "—",
    stockStatus: stockStatus(item),
    stockValue: stockValue(item),
  };
}
export function enrichMovement(state, movement) {
  const item = state.items.find((i) => i.id === movement.itemId);
  return {
    ...movement,
    item: item?.name || "Unknown item",
    code: item?.code || "",
    categoryId: item?.categoryId,
    category: state.categories.find((c) => c.id === item?.categoryId)?.name || "",
    unit: item?.unit,
    partner: movement.supplierId
      ? state.suppliers.find((s) => s.id === movement.supplierId)?.name || "—"
      : movement.recipient || "—",
  };
}
export function filterItems(state, filters = {}) {
  return state.items
    .map((i) => enrichItem(state, i))
    .filter(
      (i) =>
        (!filters.search ||
          [i.name, i.code, i.category, i.supplier]
            .join(" ")
            .toLowerCase()
            .includes(filters.search.trim().toLowerCase())) &&
        (!filters.itemId || i.id === filters.itemId) &&
        (!filters.categoryId || i.categoryId === filters.categoryId) &&
        (!filters.department || i.department === filters.department) &&
        (!filters.supplierId || i.supplierId === filters.supplierId) &&
        (!filters.status || i.status === filters.status) &&
        (!filters.stockStatus || i.stockStatus === filters.stockStatus),
    );
}
export function filterMovements(state, filters = {}) {
  if (!validRange(filters)) return [];
  return chronological(state.movements)
    .map((m) => enrichMovement(state, m))
    .filter(
      (m) =>
        dateInRange(m.date, filters) &&
        (!filters.search ||
          [m.number, m.item, m.code, m.partner, m.reference, m.performedBy]
            .join(" ")
            .toLowerCase()
            .includes(filters.search.trim().toLowerCase())) &&
        (!filters.itemId || m.itemId === filters.itemId) &&
        (!filters.categoryId || m.categoryId === filters.categoryId) &&
        (!filters.department || m.department === filters.department) &&
        (!filters.supplierId || m.supplierId === filters.supplierId) &&
        (!filters.type || m.type === filters.type) &&
        (!filters.stockStatus ||
          stockStatus(state.items.find((i) => i.id === m.itemId)) === filters.stockStatus),
    );
}

export function validateRecord(kind, values, state, fields = []) {
  const errors = {};
  const baseRequired =
    kind === "items"
      ? ["name", "code", "categoryId", "unit", "minStock", "unitCost"]
      : kind === "suppliers"
        ? ["name", "code", "contact", "phone"]
        : kind === "categories"
          ? ["name", "code"]
          : kind === "stock-in"
            ? ["date", "itemId", "quantity", "unitCost", "supplierId", "performedBy"]
            : [
                "date",
                "itemId",
                "quantity",
                "issueType",
                "department",
                "recipient",
                "purpose",
                "performedBy",
              ];
  for (const key of baseRequired)
    if (values[key] === undefined || values[key] === null || String(values[key]).trim() === "")
      errors[key] = `${key.replace(/([A-Z])/g, " $1")} is required.`;
  const numericKeys =
    kind === "items"
      ? ["openingQty", "minStock", "maxStock", "unitCost", "reorderQty", "issueValue"]
      : kind.startsWith("stock-")
        ? ["quantity", "unitCost"]
        : [];
  for (const key of numericKeys)
    if (
      values[key] !== undefined &&
      values[key] !== "" &&
      (!Number.isFinite(Number(values[key])) || Number(values[key]) < 0)
    )
      errors[key] = "Enter a non-negative number.";
  for (const key of [
    "date",
    "purchaseDate",
    "lastPurchaseDate",
    "warrantyDate",
    "expiryDate",
    "expectedReturnDate",
  ])
    if (values[key] && !validDate(values[key])) errors[key] = "Enter a valid date.";
  for (const field of fields) {
    const value = values[field.name];
    if (field.required && (value === undefined || value === null || String(value).trim() === ""))
      errors[field.name] = `${field.label} is required.`;
    if (
      field.type === "number" &&
      value !== "" &&
      value !== undefined &&
      (!Number.isFinite(Number(value)) || Number(value) < (field.min ?? 0))
    )
      errors[field.name] = `Enter a number of at least ${field.min ?? 0}.`;
    if (field.type === "date" && value && !validDate(value))
      errors[field.name] = "Enter a valid date.";
    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      errors[field.name] = "Enter a valid email.";
    if (field.type === "tel" && value && !/^\+?[\d\s()-]{10,16}$/.test(value))
      errors[field.name] = "Enter a valid phone number.";
  }
  const records = state[kind];
  if (values.status && !["Active", "Inactive"].includes(values.status))
    errors.status = "Choose Active or Inactive.";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    errors.email = "Enter a valid email.";
  for (const key of ["phone", "alternatePhone"])
    if (values[key] && !/^\+?[\d\s()-]{10,16}$/.test(values[key]))
      errors[key] = "Enter a valid phone number.";
  if (records) {
    if (
      records.some(
        (r) =>
          r.id !== values.id &&
          r.code.toLowerCase() ===
            String(values.code || "")
              .trim()
              .toLowerCase(),
      )
    )
      errors.code = "This code already exists.";
    if (
      kind === "categories" &&
      records.some(
        (r) =>
          r.id !== values.id &&
          r.name.toLowerCase() ===
            String(values.name || "")
              .trim()
              .toLowerCase(),
      )
    )
      errors.name = "This category name already exists.";
  }
  if (kind === "items") {
    const existing = state.items.find((i) => i.id === values.id);
    if (
      !state.categories.some(
        (c) =>
          c.id === values.categoryId && (c.status === "Active" || existing?.categoryId === c.id),
      )
    )
      errors.categoryId = "Choose an active category.";
    if (
      values.supplierId &&
      !state.suppliers.some(
        (s) =>
          s.id === values.supplierId && (s.status === "Active" || existing?.supplierId === s.id),
      )
    )
      errors.supplierId = "Choose an active supplier.";
    if (
      values.maxStock !== "" &&
      values.maxStock !== undefined &&
      Number(values.maxStock) < Number(values.minStock)
    )
      errors.maxStock = "Maximum stock must be at least minimum stock.";
    if (values.warrantyDate && values.purchaseDate && values.warrantyDate < values.purchaseDate)
      errors.warrantyDate = "Warranty expiry cannot precede purchase date.";
  }
  if (
    kind === "suppliers" &&
    (values.categoryIds || []).some((id) => !state.categories.some((c) => c.id === id))
  )
    errors.categoryIds = "Select existing categories.";
  if (kind === "stock-in" || kind === "stock-out") {
    const item = state.items.find((i) => i.id === values.itemId && i.status === "Active");
    if (!item) errors.itemId = "Choose an active inventory item.";
    if (!(Number(values.quantity) > 0)) errors.quantity = "Quantity must be greater than zero.";
    if (kind === "stock-out" && item && Number(values.quantity) > item.quantity)
      errors.quantity = `Only ${item.quantity} ${item.unit} available.`;
    if (
      kind === "stock-in" &&
      !state.suppliers.some((s) => s.id === values.supplierId && s.status === "Active")
    )
      errors.supplierId = "Choose an active supplier.";
    if (!values.date || values.date > today())
      errors.date = "Enter a valid date on or before today.";
    const latest = chronological(state.movements.filter((m) => m.itemId === values.itemId)).at(-1);
    if (latest && values.date < latest.date)
      errors.date = `Date cannot precede the latest item movement (${latest.date}).`;
    if (item && values.date < item.createdAt) errors.date = "Date cannot precede item creation.";
    if (
      values.returnable &&
      (!values.expectedReturnDate || values.expectedReturnDate < values.date)
    )
      errors.expectedReturnDate = "Select a return date on or after the issue date.";
    if (values.expiryDate && values.expiryDate < values.date)
      errors.expiryDate = "Expiry cannot precede receipt date.";
  }
  return errors;
}

function activity(state, text, date = today()) {
  return [{ id: `act-${state.nextId}`, date, text }, ...state.activities].slice(0, 100);
}
export function saveRecord(state, kind, values) {
  const errors = validateRecord(kind, values, state);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const previous = state[kind].find((r) => r.id === values.id);
  const record = {
    ...values,
    name: values.name.trim(),
    code: values.code.trim(),
    id: previous?.id || `${kind}-${state.nextId}`,
  };
  if (kind === "items") {
    for (const key of ["minStock", "unitCost", "openingQty", "reorderQty", "issueValue"])
      record[key] = Number(record[key] || 0);
    record.maxStock =
      record.maxStock === "" || record.maxStock === undefined ? "" : Number(record.maxStock);
    record.createdAt = previous?.createdAt || today();
    record.updatedAt = today();
    // Opening balances and cost are immutable after creation; stock changes use posted movements.
    record.quantity = previous?.quantity ?? record.openingQty;
    record.openingQty = previous?.openingQty ?? record.openingQty;
    record.openingCost = previous?.openingCost ?? record.unitCost;
    record.unitCost = previous?.unitCost ?? record.unitCost;
  }
  return {
    ...state,
    [kind]: previous
      ? state[kind].map((r) => (r.id === record.id ? record : r))
      : [...state[kind], record],
    nextId: state.nextId + 1,
    activities: activity(
      state,
      `${previous ? "Updated" : "Created"} ${kind.slice(0, -1)}: ${record.name}`,
    ),
  };
}
export function deactivateRecord(state, kind, id) {
  const record = state[kind].find((r) => r.id === id);
  if (!record) throw new Error("Record no longer exists.");
  return {
    ...state,
    [kind]: state[kind].map((r) => (r.id === id ? { ...r, status: "Inactive" } : r)),
    nextId: state.nextId + 1,
    activities: activity(state, `Deactivated ${record.name}`),
  };
}
export function deleteItem(state, id) {
  const item = state.items.find((i) => i.id === id);
  if (!item || item.quantity || state.movements.some((m) => m.itemId === id))
    throw new Error(
      "Items with stock or transaction history cannot be deleted. Deactivate the item instead.",
    );
  return {
    ...state,
    items: state.items.filter((i) => i.id !== id),
    nextId: state.nextId + 1,
    activities: activity(state, `Deleted ${item.name}`),
  };
}

/** Moving weighted-average valuation. Receipts revalue available stock; issues retain their posted cost.
 * Backdating before the last posted item movement is rejected to preserve historical costs.
 */
export function postMovement(state, kind, values) {
  const errors = validateRecord(kind, values, state);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const item = state.items.find((i) => i.id === values.itemId);
  const quantity = Number(values.quantity);
  const isIn = kind === "stock-in";
  const cost = isIn ? Number(values.unitCost) : item.unitCost;
  if (!Number.isFinite(cost) || cost < 0) throw new Error("Unit cost must be non-negative.");
  const newQty = item.quantity + (isIn ? quantity : -quantity);
  const updated = {
    ...item,
    quantity: newQty,
    unitCost: isIn ? (stockValue(item) + quantity * cost) / newQty : item.unitCost,
    updatedAt: today(),
    ...(isIn ? { lastPurchaseDate: values.date } : {}),
  };
  const movement = {
    ...values,
    id: `txn-${state.nextId}`,
    number: `INV-TXN-${String(state.nextId).padStart(6, "0")}`,
    sequence: state.nextId,
    type: isIn ? "Stock In" : "Stock Out",
    supplierId: isIn ? values.supplierId : "",
    previousUnitCost: item.unitCost,
    quantity,
    unitCost: cost,
    total: quantity * cost,
    status: "Posted",
  };
  return {
    ...state,
    items: state.items.map((i) => (i.id === item.id ? updated : i)),
    movements: [...state.movements, movement],
    nextId: state.nextId + 1,
    activities: activity(
      state,
      `${movement.type}: ${quantity} ${item.unit} of ${item.name}`,
      movement.date,
    ),
  };
}
export function reverseMovement(state, id, performedBy) {
  const movement = state.movements.find((m) => m.id === id);
  if (!movement || movement.status !== "Posted" || movement.correctionOf || movement.returnOf)
    throw new Error("This movement cannot be reversed.");
  const latest = chronological(state.movements.filter((m) => m.itemId === movement.itemId)).at(-1);
  if (latest.id !== id || state.movements.some((m) => m.returnOf === id))
    throw new Error(
      "Only the latest unreturned movement for an item can be reversed. This protects later balances and costs.",
    );
  const item = state.items.find((i) => i.id === movement.itemId);
  const isIn = movement.type === "Stock In";
  const quantity = item.quantity - signedQuantity(movement);
  if (quantity < 0) throw new Error("Reversal would create negative stock.");
  const value = stockValue(item) + (isIn ? -1 : 1) * movement.total;
  let unitCost = quantity > 0 ? Math.max(0, value / quantity) : item.openingCost;
  if (!quantity && movement.previousUnitCost !== undefined) {
    unitCost = movement.previousUnitCost;
  } else if (!quantity) {
    const earlier = chronological(
      state.movements.filter((m) => m.itemId === item.id && m.id !== id),
    );
    // If the receipt began from zero, retain the preceding cost for future displays.
    unitCost = earlier.at(-1)?.unitCost ?? item.openingCost;
  }
  const correction = {
    ...movement,
    id: `txn-${state.nextId}`,
    number: `INV-TXN-${String(state.nextId).padStart(6, "0")}`,
    sequence: state.nextId,
    date: today(),
    type: isIn ? "Stock Out" : "Stock In",
    status: "Correction",
    correctionOf: id,
    returnable: false,
    returnOf: "",
    performedBy,
    remarks: `Reversal of ${movement.number}`,
    purpose: "Transaction reversal",
  };
  const remainingPurchases = chronological(
    state.movements.filter(
      (m) => m.itemId === item.id && m.type === "Stock In" && m.id !== id && m.status === "Posted",
    ),
  );
  return {
    ...state,
    items: state.items.map((i) =>
      i.id === item.id
        ? {
            ...i,
            quantity,
            unitCost,
            updatedAt: today(),
            ...(isIn ? { lastPurchaseDate: remainingPurchases.at(-1)?.date || "" } : {}),
          }
        : i,
    ),
    movements: [
      ...state.movements.map((m) => (m.id === id ? { ...m, status: "Reversed" } : m)),
      correction,
    ],
    nextId: state.nextId + 1,
    activities: activity(state, `Reversed ${movement.number}`),
  };
}
export function recordReturn(state, id, performedBy) {
  const movement = state.movements.find((m) => m.id === id);
  if (
    !movement ||
    movement.type !== "Stock Out" ||
    !movement.returnable ||
    movement.status !== "Posted" ||
    state.movements.some((m) => m.returnOf === id)
  )
    throw new Error("This issue cannot be returned again.");
  const item = state.items.find((i) => i.id === movement.itemId);
  const quantity = item.quantity + movement.quantity;
  const unitCost = (stockValue(item) + movement.total) / quantity;
  const receipt = {
    ...movement,
    id: `txn-${state.nextId}`,
    number: `INV-TXN-${String(state.nextId).padStart(6, "0")}`,
    sequence: state.nextId,
    date: today(),
    type: "Stock In",
    status: "Returned",
    supplierId: "",
    returnOf: id,
    returnable: false,
    performedBy,
    remarks: `Full return of ${movement.number}`,
    reference: movement.number,
  };
  return {
    ...state,
    items: state.items.map((i) =>
      i.id === item.id ? { ...i, quantity, unitCost, updatedAt: today() } : i,
    ),
    movements: [...state.movements, receipt],
    nextId: state.nextId + 1,
    activities: activity(state, `Recorded return of ${movement.number}`),
  };
}

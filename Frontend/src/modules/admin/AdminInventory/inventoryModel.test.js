import assert from "node:assert/strict";
import test from "node:test";
import { createDemoState, STORAGE_KEY } from "./data/inventoryMockData.js";
import {
  deactivateRecord,
  deleteItem,
  enrichItem,
  filterItems,
  filterMovements,
  ledger,
  loadInventory,
  lowStock,
  persistInventory,
  postMovement,
  recordReturn,
  reverseMovement,
  saveRecord,
  stockStatus,
  stockValue,
  today,
  validateRecord,
} from "./inventoryModel.js";
import { buildReport, REPORTS } from "./inventoryReports.js";
import { formInitial, formSections, recordOptions } from "./inventoryFields.js";
import { inventoryCsv } from "./inventoryCsv.js";

const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} should equal ${expected}`);
function transaction(state, itemId = "item-1", values = {}) {
  const item = state.items.find((i) => i.id === itemId);
  return {
    itemId,
    quantity: 2,
    unitCost: item.unitCost,
    supplierId: item.supplierId,
    date: today(),
    performedBy: "Test Store Manager",
    department: item.department,
    recipient: "Dr. Rao",
    issueType: "Faculty / Staff",
    purpose: "Practical class",
    ...values,
  };
}
function checkReconciliation(state) {
  for (const item of state.items) {
    const entries = ledger(state, item.id);
    near(entries.at(-1)?.balance ?? item.openingQty, item.quantity);
    assert.ok(entries.every((m) => m.balance >= 0));
    let value = item.openingQty * item.openingCost;
    for (const movement of entries)
      value += movement.type === "Stock In" ? movement.total : -movement.total;
    near(value, stockValue(item));
  }
}
test("sample dataset has stable identities, realistic coverage and reconciled balances", () => {
  const state = createDemoState();
  assert.ok(
    state.items.length >= 20 && state.suppliers.length >= 5 && state.movements.length >= 15,
  );
  assert.deepEqual(state, createDemoState());
  for (const key of ["items", "categories", "suppliers", "movements"])
    assert.equal(new Set(state[key].map((r) => r.id)).size, state[key].length);
  assert.ok(state.items.some((i) => stockStatus(i) === "Out of Stock"));
  assert.ok(state.items.some((i) => stockStatus(i) === "Low Stock"));
  assert.ok(state.items.some((i) => stockStatus(i) === "In Stock"));
  assert.ok(state.items.some((i) => i.warrantyDate));
  assert.ok(state.items.some((i) => !i.warrantyDate));
  checkReconciliation(state);
});
test("weighted-average receipt preserves existing movement costs and updates ledger and value", () => {
  const state = createDemoState();
  const before = state.items[0];
  const after = postMovement(
    state,
    "stock-in",
    transaction(state, before.id, { quantity: 5, unitCost: 60000, invoice: "INV-X" }),
  );
  const item = after.items[0];
  near(item.quantity, before.quantity + 5);
  near(stockValue(item), stockValue(before) + 300000);
  assert.equal(item.lastPurchaseDate, today());
  assert.equal(after.movements.at(-1).total, 300000);
  assert.deepEqual(after.movements.slice(0, -1), state.movements);
  assert.equal(after.movements.at(-1).id, `txn-${state.nextId}`);
  checkReconciliation(after);
});
test("issues retain weighted-average cost and all destination details", () => {
  let state = createDemoState();
  state = postMovement(state, "stock-in", transaction(state, "item-1", { unitCost: 70000 }));
  const before = state.items[0];
  const after = postMovement(
    state,
    "stock-out",
    transaction(state, before.id, {
      quantity: 4,
      unitCost: 1,
      recipientId: "EMP-42",
      approvedBy: "Principal",
    }),
  );
  assert.equal(after.items[0].quantity, before.quantity - 4);
  near(after.movements.at(-1).unitCost, before.unitCost);
  assert.equal(after.movements.at(-1).recipient, "Dr. Rao");
  assert.equal(after.movements.at(-1).department, "Computer Science");
  assert.equal(after.movements.at(-1).recipientId, "EMP-42");
  assert.equal(after.movements.at(-1).supplierId, "");
  assert.equal(filterMovements(after, { itemId: before.id }).at(-1).partner, "Dr. Rao");
  checkReconciliation(after);
});
test("stock validation rejects zero, negative, nonfinite, excessive, missing and invalid inputs", () => {
  const state = createDemoState();
  for (const quantity of [0, -1, "", NaN, Infinity])
    assert.throws(() =>
      postMovement(state, "stock-in", transaction(state, "item-1", { quantity })),
    );
  for (const quantity of [0, -1, 999])
    assert.throws(() =>
      postMovement(state, "stock-out", transaction(state, "item-1", { quantity })),
    );
  for (const unitCost of [-1, Infinity, "", undefined])
    assert.throws(() =>
      postMovement(state, "stock-in", transaction(state, "item-1", { unitCost })),
    );
  for (const date of ["", "2026-02-31", "2099-01-01", "2026-08-01"])
    assert.throws(() => postMovement(state, "stock-in", transaction(state, "item-1", { date })));
  for (const itemId of ["", "missing"])
    assert.throws(() => postMovement(state, "stock-out", { ...transaction(state), itemId }));
  assert.throws(() =>
    postMovement(state, "stock-out", transaction(state, "item-1", { recipient: "" })),
  );
  assert.throws(() =>
    postMovement(state, "stock-in", transaction(state, "item-1", { supplierId: "missing" })),
  );
  checkReconciliation(state);
});
test("stock status follows thresholds and alerts react to new stock", () => {
  assert.equal(stockStatus({ quantity: 0, minStock: 0 }), "Out of Stock");
  assert.equal(stockStatus({ quantity: 1, minStock: 2 }), "Low Stock");
  assert.equal(stockStatus({ quantity: 2, minStock: 2 }), "In Stock");
  let state = createDemoState();
  const id = "item-19";
  assert.ok(lowStock(state.items.find((i) => i.id === id)));
  state = postMovement(state, "stock-in", transaction(state, id, { quantity: 20 }));
  assert.equal(lowStock(state.items.find((i) => i.id === id)), false);
  state = postMovement(state, "stock-out", transaction(state, id, { quantity: 19 }));
  assert.ok(lowStock(state.items.find((i) => i.id === id)));
  checkReconciliation(state);
});
test("receipt and issue reversals restore the preceding weighted-average balance", () => {
  let state = createDemoState();
  const before = structuredClone(state.items[0]);
  state = postMovement(
    state,
    "stock-in",
    transaction(state, "item-1", { quantity: 7, unitCost: 71000 }),
  );
  state = reverseMovement(state, state.movements.at(-1).id, "Manager");
  near(state.items[0].quantity, before.quantity);
  near(state.items[0].unitCost, before.unitCost);
  assert.equal(state.movements.at(-1).status, "Correction");
  assert.equal(state.movements.at(-2).status, "Reversed");
  assert.throws(() => reverseMovement(state, state.movements.at(-2).id, "Manager"));
  state = postMovement(state, "stock-out", transaction(state));
  state = reverseMovement(state, state.movements.at(-1).id, "Manager");
  near(state.items[0].unitCost, before.unitCost);
  checkReconciliation(state);
});
test("historical transactions with later movements cannot be reversed", () => {
  let state = createDemoState();
  state = postMovement(state, "stock-in", transaction(state));
  const id = state.movements.at(-1).id;
  state = postMovement(state, "stock-out", transaction(state));
  assert.throws(() => reverseMovement(state, id, "Manager"), /latest/);
  checkReconciliation(state);
});
test("returnable issues only increase stock after an explicit full return", () => {
  let state = createDemoState();
  const quantity = state.items[0].quantity;
  state = postMovement(
    state,
    "stock-out",
    transaction(state, "item-1", { returnable: true, expectedReturnDate: today() }),
  );
  const issue = state.movements.at(-1);
  assert.equal(state.items[0].quantity, quantity - 2);
  state = postMovement(state, "stock-in", transaction(state, "item-1", { unitCost: 60000 }));
  state = recordReturn(state, issue.id, "Manager");
  assert.equal(state.items[0].quantity, quantity + 2);
  assert.equal(state.movements.at(-1).returnOf, issue.id);
  assert.equal(state.movements.at(-1).unitCost, issue.unitCost);
  assert.throws(() => recordReturn(state, issue.id, "Manager"));
  assert.throws(() => reverseMovement(state, issue.id, "Manager"));
  const report = buildReport(state, "Returnable Items Report");
  assert.equal(report.rows.find((r) => r.id === issue.id).returnStatus, "Returned");
  checkReconciliation(state);
});
test("item creation, metadata edits and history protection preserve identities", () => {
  let state = createDemoState();
  const values = {
    ...formInitial("items", state),
    name: "Test Item",
    code: "TEST-01",
    categoryId: state.categories[0].id,
    openingQty: 4,
    minStock: 1,
    unitCost: 200,
  };
  state = saveRecord(state, "items", values);
  const item = state.items.at(-1);
  assert.equal(item.quantity, 4);
  assert.equal(item.openingCost, 200);
  state = saveRecord(state, "items", {
    ...item,
    name: "Renamed Test Item",
    openingQty: 20,
    unitCost: 9999,
  });
  assert.equal(state.items.at(-1).id, item.id);
  assert.equal(state.items.at(-1).quantity, 4);
  assert.equal(state.items.at(-1).unitCost, 200);
  assert.throws(() => deleteItem(state, item.id));
  state = deactivateRecord(state, "items", item.id);
  assert.equal(state.items.at(-1).quantity, 4);
  assert.throws(() => postMovement(state, "stock-in", transaction(state, item.id)));
  state = saveRecord(state, "items", { ...values, code: "EMPTY", openingQty: 0 });
  const empty = state.items.at(-1);
  state = deleteItem(state, empty.id);
  assert.ok(!state.items.some((i) => i.id === empty.id));
  checkReconciliation(state);
});
test("all entity codes and category names are unique, ignoring case and surrounding spaces", () => {
  const state = createDemoState();
  for (const kind of ["items", "suppliers", "categories"]) {
    const record = {
      ...state[kind][0],
      id: undefined,
      code: ` ${state[kind][0].code.toLowerCase()} `,
    };
    assert.ok(validateRecord(kind, record, state).code);
    assert.throws(() => saveRecord(state, kind, record));
  }
  assert.ok(validateRecord("categories", { name: " it equipment ", code: "NEW" }, state).name);
  assert.ok(validateRecord("items", { ...state.items[0], minStock: -1 }, state).minStock);
  assert.ok(
    validateRecord("items", { ...state.items[0], minStock: 10, maxStock: 5 }, state).maxStock,
  );
});
test("supplier and category edits update displays and preserve historical references", () => {
  let state = createDemoState();
  state = saveRecord(state, "categories", { ...state.categories[0], name: "Computing Devices" });
  state = saveRecord(state, "suppliers", {
    ...state.suppliers[0],
    name: "Renamed Digital Supplies",
  });
  const item = enrichItem(state, state.items[0]);
  assert.equal(item.category, "Computing Devices");
  assert.equal(item.supplier, "Renamed Digital Supplies");
  assert.equal(filterMovements(state, { itemId: item.id })[0].category, "Computing Devices");
  state = deactivateRecord(state, "categories", state.categories[0].id);
  state = deactivateRecord(state, "suppliers", state.suppliers[0].id);
  assert.ok(!recordOptions(state.categories).some((c) => c.value === item.categoryId));
  assert.ok(
    recordOptions(state.categories, item.categoryId).some((c) => c.value === item.categoryId),
  );
  assert.ok(
    validateRecord("items", { ...state.items[0], id: undefined, code: "NEW-CODE" }, state)
      .categoryId,
  );
  assert.throws(() => postMovement(state, "stock-in", transaction(state)));
  assert.equal(enrichItem(state, state.items[0]).supplier, "Renamed Digital Supplies");
});
test("item filters include category and supplier names, department, status and stock status", () => {
  const state = createDemoState();
  for (const search of ["Laptop", "INV-0001", "IT Equipment", "Deccan Digital"])
    assert.ok(filterItems(state, { search }).some((i) => i.id === "item-1"));
  for (const [field, value] of [
    ["categoryId", "cat-1"],
    ["department", "Computer Science"],
    ["status", "Active"],
    ["stockStatus", "Low Stock"],
  ])
    assert.ok(filterItems(state, { [field]: value }).every((i) => i[field] === value));
  assert.equal(filterItems(state, { search: "no such item" }).length, 0);
});
test("date filters use inclusive boundaries and reject inverted ranges", () => {
  const state = createDemoState();
  const filtered = filterMovements(state, { from: "2026-09-01", to: "2026-09-01" });
  assert.ok(filtered.length && filtered.every((m) => m.date === "2026-09-01"));
  assert.deepEqual(filterMovements(state, { from: "2026-10-01", to: "2026-09-01" }), []);
  const dept = filterMovements(state, { department: "Computer Science", type: "Stock Out" });
  assert.ok(
    dept.length && dept.every((m) => m.department === "Computer Science" && m.type === "Stock Out"),
  );
});
test("stock summary, low-stock and category reports calculate from the same store", () => {
  const state = createDemoState();
  const summary = buildReport(state, "Stock Summary");
  for (const row of summary.rows) {
    near(row.opening + row.received - row.issued, row.quantity);
    near(row.quantity, state.items.find((i) => i.id === row.id).quantity);
    near(row.stockValue, stockValue(state.items.find((i) => i.id === row.id)));
  }
  const low = buildReport(state, "Low Stock Report");
  assert.ok(low.rows.length && low.rows.every(lowStock));
  const categories = buildReport(state, "Category-wise Inventory Value");
  near(
    categories.rows.reduce((sum, c) => sum + c.value, 0),
    state.items.reduce((sum, i) => sum + stockValue(i), 0),
  );
  assert.equal(
    categories.rows.reduce((sum, c) => sum + c.count, 0),
    state.items.length,
  );
});
test("period stock summaries retain prior balances and valuation", () => {
  const state = createDemoState();
  const period = buildReport(state, "Stock Summary", { from: "2026-09-05", to: "2026-09-10" });
  for (const row of period.rows) near(row.opening + row.received - row.issued, row.quantity);
  const earlier = buildReport(state, "Stock Summary", { to: "2026-08-31" });
  assert.ok(
    earlier.rows.every(
      (r) => r.quantity === r.openingQty && r.stockValue === r.openingQty * r.openingCost,
    ),
  );
});
test("items created during a reporting period contribute their opening stock as receipts", () => {
  const original = createDemoState();
  const state = saveRecord(original, "items", {
    ...formInitial("items", original),
    name: "New College Asset",
    code: "NEW-ASSET",
    categoryId: "cat-1",
    openingQty: 4,
    minStock: 1,
    unitCost: 100,
  });
  const item = state.items.at(-1);
  const report = buildReport(state, "Stock Summary", {
    from: today(),
    to: today(),
    itemId: item.id,
  });
  assert.equal(report.rows[0].opening, 0);
  assert.equal(report.rows[0].received, 4);
  assert.equal(report.rows[0].quantity, 4);
  assert.equal(
    buildReport(state, "Stock Summary", { to: "2026-08-01", itemId: item.id }).rows.length,
    0,
  );
});
test("purchase, issue, warranty and return reports apply relevant scopes", () => {
  const state = createDemoState();
  const purchases = buildReport(state, "Supplier Purchase Report", { supplierId: "sup-1" });
  assert.ok(
    purchases.rows.length &&
      purchases.rows.every((m) => m.supplierId === "sup-1" && m.type === "Stock In"),
  );
  const issues = buildReport(state, "Department-wise Issue Report", {
    department: "Computer Science",
  });
  assert.ok(
    issues.rows.length &&
      issues.rows.every((m) => m.department === "Computer Science" && m.type === "Stock Out"),
  );
  const expiry = buildReport(state, "Expiry / Warranty Report");
  assert.ok(expiry.rows.some((r) => r.kind === "Warranty"));
  assert.ok(expiry.rows.some((r) => r.kind === "Expiry"));
  assert.ok(
    buildReport(state, "Expiry / Warranty Report", {
      from: "2027-02-01",
      to: "2027-03-01",
      type: "Stock In",
    }).rows.some((r) => r.kind === "Expiry"),
  );
  assert.ok(expiry.rows.every((r) => Number.isFinite(r.days)));
  assert.equal(
    buildReport(state, "Expiry / Warranty Report", { from: "2028-01-01" }).rows.length,
    0,
  );
  assert.equal(buildReport(state, "Returnable Items Report").rows.length, 1);
  for (const report of REPORTS) {
    const result = buildReport(state, report);
    assert.ok(result.columns.length);
    assert.ok(Array.isArray(result.rows));
  }
});
test("demo persistence round-trips edits, isolates authentication and detects corrupt state", () => {
  const data = new Map([["token", "do-not-touch"]]);
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, val) => data.set(key, val),
  };
  let state = createDemoState();
  state = postMovement(state, "stock-in", transaction(state));
  persistInventory(state, storage);
  assert.deepEqual(loadInventory(storage).state, state);
  assert.equal(data.get("token"), "do-not-touch");
  persistInventory(createDemoState(), storage);
  assert.deepEqual(loadInventory(storage).state, createDemoState());
  data.set(STORAGE_KEY, "not json");
  assert.ok(loadInventory(storage).warning);
  data.set(
    STORAGE_KEY,
    JSON.stringify({
      ...state,
      items: state.items.map((i, index) => (index === 0 ? { ...i, quantity: -1 } : i)),
    }),
  );
  assert.ok(loadInventory(storage).warning);
  assert.throws(() =>
    persistInventory(state, {
      setItem: () => {
        throw new Error("Storage unavailable");
      },
    }),
  );
});
test("form definitions expose required fields and prohibit changes to posted opening balances", () => {
  const state = createDemoState();
  for (const kind of ["items", "suppliers", "categories", "stock-in", "stock-out"]) {
    const initial = formInitial(kind, state, null, "item-1", "Test User");
    const fields = formSections(kind, state, initial).flatMap((s) => s.fields);
    assert.equal(new Set(fields.map((f) => f.name)).size, fields.length);
    assert.ok(fields.some((f) => f.required));
    assert.ok(Object.keys(validateRecord(kind, {}, state, fields)).length);
  }
  const fields = formSections("items", state, state.items[0]).flatMap((s) => s.fields);
  assert.ok(fields.find((f) => f.name === "openingQty").disabled);
  assert.ok(fields.find((f) => f.name === "unitCost").disabled);
  assert.ok(
    validateRecord(
      "stock-out",
      transaction(state, "item-1", { returnable: true, expectedReturnDate: "" }),
      state,
    ).expectedReturnDate,
  );
});
test("CSV exports only passed filtered rows, includes headers, escapes text and omits actions", () => {
  const columns = [
    { key: "name", label: "Item Name" },
    { key: "quantity", label: "Stock" },
    { key: "actions", label: "Actions", exportable: false },
  ];
  const csv = inventoryCsv(columns, [
    { name: 'Paper, "A4"', quantity: 10 },
    { name: "=HYPERLINK(1)", quantity: 0 },
  ]);
  assert.ok(csv.startsWith('"Item Name","Stock"\r\n'));
  assert.ok(csv.includes('"Paper, ""A4""","10"'));
  assert.ok(csv.includes("'=HYPERLINK(1)"));
  assert.ok(!csv.includes("Actions"));
  assert.equal(inventoryCsv(columns, []).split("\r\n").length, 1);
});

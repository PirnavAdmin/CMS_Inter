import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createDemoState } from "./data/inventoryMockData.js";

let server;
let screens;
let Form;
let Details;
const state = createDemoState();
const noop = () => {};
const shared = {
  state,
  open: noop,
  remove: noop,
  refresh: noop,
  navigate: noop,
  correct: noop,
  returnItem: noop,
};
before(async () => {
  server = await createServer({
    configFile: false,
    root: process.cwd(),
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(process.cwd(), "src") } },
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  const base = "/src/components/pages/InventoryManagement/components/";
  screens = await server.ssrLoadModule(`${base}InventoryScreens.jsx`);
  Form = (await server.ssrLoadModule(`${base}InventoryForm.jsx`)).default;
  Details = (await server.ssrLoadModule(`${base}InventoryDetails.jsx`)).default;
});
after(async () => {
  await server?.close();
});

test("all seven inventory screens render without missing imports or render failures", () => {
  const cases = [
    [screens.InventoryDashboard, {}, "Recent Stock Movements"],
    [screens.InventoryItems, {}, "Inventory Items"],
    [screens.InventoryMovements, { type: "Stock In" }, "Add Stock In"],
    [screens.InventoryMovements, { type: "Stock Out" }, "Add Stock Out"],
    [screens.InventoryMasters, { kind: "suppliers" }, "Add Supplier"],
    [screens.InventoryMasters, { kind: "categories" }, "Add Category"],
    [screens.InventoryReports, {}, "Stock Summary"],
  ];
  for (const [Component, props, expected] of cases) {
    const html = renderToStaticMarkup(createElement(Component, { ...shared, ...props }));
    assert.ok(html.includes(expected), `Missing ${expected}`);
    assert.ok(html.includes("<table"));
  }
});
test("all add and stock forms render labelled controls and disabled invalid submission", () => {
  for (const kind of ["items", "suppliers", "categories", "stock-in", "stock-out"]) {
    const html = renderToStaticMarkup(
      createElement(Form, { kind, state, user: "Demo Manager", onClose: noop, onSave: noop }),
    );
    assert.ok(html.includes('role="dialog"'));
    assert.ok(html.includes("<label"));
    assert.ok(html.includes('type="submit"'));
    assert.match(html, /type="submit"[^>]*disabled/);
    assert.ok(html.includes("Cancel") && html.includes("Reset"));
  }
});
test("item ledger and master and movement details render their corresponding records", () => {
  for (const [kind, record, expected] of [
    ["item-detail", state.items[0], "Stock Ledger"],
    ["movement-detail", state.movements[0], "INV-TXN-000001"],
    ["supplier-detail", state.suppliers[0], "Deccan Digital Supplies"],
    ["category-detail", state.categories[0], "IT Equipment"],
  ]) {
    const html = renderToStaticMarkup(
      createElement(Details, { kind, record, state, onClose: noop }),
    );
    assert.ok(html.includes(expected));
    assert.ok(html.includes('role="dialog"'));
  }
});
test("empty items and movement histories have a useful empty state", () => {
  const empty = { ...state, items: [], movements: [] };
  for (const Component of [screens.InventoryItems, screens.InventoryMovements]) {
    const html = renderToStaticMarkup(
      createElement(Component, { ...shared, state: empty, type: "Stock In" }),
    );
    assert.ok(html.includes("No matching inventory records"));
  }
});

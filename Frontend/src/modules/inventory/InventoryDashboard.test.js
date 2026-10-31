import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
test("server-backed inventory portal rejects unauthenticated sessions and renders empty states", async () => {
  const entries = new Map();
  global.sessionStorage = {
    getItem: (k) => entries.get(k) ?? null,
    setItem: (k, v) => entries.set(k, v),
    removeItem: (k) => entries.delete(k),
  };
  global.localStorage = { getItem: () => null };
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    plugins: [react()],
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const root = "/src/modules/inventory/";
    const session = await server.ssrLoadModule(`${root}data/inventorySession.js`);
    assert.equal(session.inventorySession(), null);
    const Provider = (await server.ssrLoadModule(`${root}InventoryDataContext.jsx`))
      .InventoryDataProvider;
    for (const [file, label] of [
      ["Home", "Inventory Dashboard"],
      ["Leave", "Leave Management"],
      ["Payslips", "My Payslips"],
      ["Items", "Inventory Items"],
      ["StockIn", "Stock In"],
      ["StockOut", "Stock Out"],
      ["Suppliers", "Suppliers"],
      ["Categories", "Categories"],
      ["Orders", "Purchase Orders"],
      ["Returns", "Returnable Items"],
      ["Reports", "Inventory Reports"],
      ["Notifications", "Notifications"],
      ["Profile", "My Profile"],
      ["Settings", "Settings"],
    ]) {
      const Page = (await server.ssrLoadModule(`${root}pages/Inventory${file}Page.jsx`)).default;
      const html = renderToStaticMarkup(
        createElement(MemoryRouter, null, createElement(Provider, null, createElement(Page))),
      );
      assert.ok(html.includes(label), `${file} page renders`);
    }
    session.inventoryLogout();
    assert.equal(session.inventorySession(), null);
  } finally {
    await server.close();
    delete global.sessionStorage;
    delete global.localStorage;
  }
});

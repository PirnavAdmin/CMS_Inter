import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { createServer } from "vite";

test("inventory API contracts preserve UI fields and use documented endpoints", async () => {
  const server = await createServer({
    configFile: false,
    root: process.cwd(),
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const api = await server.ssrLoadModule(
      "/src/components/pages/InventoryManagement/inventoryApi.js",
    );
    const client = (await server.ssrLoadModule("/src/api/apiClient.js")).default;
    const calls = [];
    let response = {};
    client.defaults.adapter = async (config) => {
      calls.push(config);
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: { success: true, data: response },
      };
    };
    const item = api.normalizeInventory(
      {
        ItemId: 12,
        CategoryId: 4,
        OpeningQuantity: 0,
        Quantity: 5,
        Code: "INV-12",
        PurchaseDate: "2026-10-01T00:00:00",
        UnitCost: 25,
      },
      "items",
    );
    assert.equal(item.id, "12");
    assert.equal(item.categoryId, "4");
    assert.equal(item.openingQty, 0);
    assert.equal(item.purchaseDate, "2026-10-01");
    await api.saveInventoryApi("items", {
      name: "Chair",
      code: "INV-NEW",
      categoryId: "4",
      unit: "Pieces",
      type: "Asset",
      openingQty: 0,
      status: "Active",
    });
    let call = calls.at(-1);
    let body = JSON.parse(call.data);
    assert.equal(call.method, "post");
    assert.equal(call.url, "/api/v1/inventory/items");
    assert.equal(body.categoryId, 4);
    assert.equal(body.code, null);
    assert.equal(body.supplierId, null);
    assert.equal(body.openingQuantity, 0);
    assert.equal(body.purchaseDate, null);
    await api.saveInventoryApi("items", { ...item, name: "Updated", status: "Active" });
    call = calls.at(-1);
    body = JSON.parse(call.data);
    assert.equal(call.method, "put");
    assert.equal(call.url, "/api/v1/inventory/items/12");
    assert.equal("unitCost" in body, false);
    assert.equal("openingQuantity" in body, false);
    for (const kind of ["stock-in", "stock-out"]) {
      await api.saveInventoryApi(kind, {
        itemId: "12",
        quantity: "2",
        unitCost: "25",
        date: "2026-10-13",
        reference: "REF",
        recipient: "Staff",
        expiryDate: "",
        expectedReturnDate: "",
        returnable: false,
      });
      call = calls.at(-1);
      body = JSON.parse(call.data);
      assert.equal(call.url, `/api/v1/inventory/movements/${kind}`);
      assert.equal(body.itemId, 12);
      assert.equal(body.quantity, 2);
      assert.equal(body.transactionDate, "2026-10-13");
      assert.equal(body.referenceNumber, "REF");
      assert.equal(body.recipientName, "Staff");
      assert.equal(body.expiryDate, null);
      assert.equal(body.expectedReturnDate, null);
    }
    response = {
      categoryId: 14,
      name: "Chemistry Lab items",
      code: "CHE-LAB-ITEMS",
      department: "Chemistry",
      status: "Active",
    };
    const category = await api.saveInventoryApi("categories", {
      name: "Chemistry Lab items",
      code: "CHE-LAB-ITEMS",
      department: "Chemistry",
      status: "Active",
      description: "",
    });
    assert.equal(calls.at(-1).url, "/api/v1/inventory/categories");
    assert.equal(calls.at(-1).method, "post");
    assert.equal(JSON.parse(calls.at(-1).data).department, "Chemistry");
    assert.equal(api.normalizeInventory(category, "categories").id, "14");
    const supplier = api.inventoryPayload("suppliers", { contact: "Manager", categoryIds: ["4"] });
    assert.equal(supplier.contactPerson, "Manager");
    assert.deepEqual(supplier.categoryIds, [4]);
    for (const [suffix, method] of [
      ["items/12", "delete"],
      ["items/12/deactivate", "patch"],
      ["categories/4/deactivate", "patch"],
      ["suppliers/3/deactivate", "patch"],
      ["movements/9/reverse", "post"],
      ["movements/9/return", "post"],
    ]) {
      await api.inventoryAction(suffix, method);
      assert.equal(calls.at(-1).method, method);
      assert.equal(calls.at(-1).url, `/api/v1/inventory/${suffix}`);
    }
    response = [
      {
        transactionId: 9,
        transactionDate: "2026-10-13T00:00:00",
        runningBalance: 7,
        movementType: "Stock In",
        referenceNumber: "R",
      },
    ];
    const ledger = await api.inventoryLedger("12", { from: "2026-10-01", to: "2026-10-13" });
    assert.equal(ledger[0].balance, 7);
    assert.equal(ledger[0].id, "9");
    assert.equal(calls.at(-1).params.to, "2026-10-13");
    response = {
      columns: [["name", "Item"]],
      rows: [
        {
          itemId: 12,
          itemName: "Chair",
          currentStock: 5,
          openingStock: 1,
          receivedStock: 6,
          issuedStock: 2,
          stockValue: 125,
          itemStatus: "Active",
        },
      ],
    };
    const report = await api.inventoryReport("Stock Summary", {
      department: "Library",
      from: "2026-10-01",
    });
    assert.equal(report.rows[0].name, "Chair");
    assert.equal(report.rows[0].opening, 1);
    assert.equal(report.rows[0].stockValue, 125);
    assert.equal(report.rows[0].quantity, 5);
    assert.equal(calls.at(-1).params.Department, "Library");
    assert.equal(calls.at(-1).params.ReportType, "Stock Summary");
    response = {
      columns: [["name", "Item"]],
      rows: [
        { ItemId: 12, Item: "Printer", Category: "IT" },
        { itemId: 13, item: "Printer", category: "IT" },
        { item: "Missing ID", category: "IT" },
        { itemId: 0, item: "Invalid ID", category: "IT" },
      ],
    };
    const lowStock = await api.inventoryReport("Low Stock Report", {});
    assert.deepEqual(
      lowStock.rows.map((row) => row.id),
      ["12", "13", "", ""],
    );
    assert.equal(lowStock.rows[0].name, "Printer");
    const beforeUpload = calls.length;
    client.defaults.adapter = async (config) => {
      calls.push(config);
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: {
          success: true,
          data: config.url.endsWith("upload-receipt")
            ? { receiptPath: "/uploads/inventory/receipt.png" }
            : { transactionId: 20 },
        },
      };
    };
    const cash = {
      itemId: "12",
      quantity: "2",
      unitCost: "25",
      date: "2026-10-14",
      paymentMethod: "Cash",
      number: "stale",
      cashReceipt: { name: "receipt.png", dataUrl: "data:image/png;base64,aGVsbG8=" },
    };
    await api.saveInventoryApi("stock-in", cash);
    const uploadCall = calls[beforeUpload];
    assert.equal(uploadCall.url, "/api/v1/inventory/movements/upload-receipt");
    assert.ok(uploadCall.data instanceof FormData);
    assert.equal(uploadCall.data.get("file").name, "receipt.png");
    const cashBody = JSON.parse(calls.at(-1).data);
    assert.equal(cashBody.cashReceiptPath, "/uploads/inventory/receipt.png");
    assert.equal(cashBody.paymentMethod, "Cash");
    assert.equal(cashBody.transactionNumber, null);
    assert.equal("cashReceipt" in cashBody, false);
    const uploadCount = calls.filter((c) => c.url.endsWith("upload-receipt")).length;
    await api.saveInventoryApi("stock-in", cash);
    assert.equal(calls.filter((c) => c.url.endsWith("upload-receipt")).length, uploadCount);
    const online = api.inventoryPayload("stock-out", {
      ...cash,
      paymentMethod: "Online Transaction",
      number: " PAY-001 ",
    });
    assert.equal(online.paymentTransactionNumber, "PAY-001");
    assert.equal(online.cashReceiptPath, null);
    assert.equal(
      api.inventoryPayload("stock-out", { itemId: "12" }).paymentTransactionNumber,
      null,
    );
    const returned = api.normalizeInventory(
      {
        TransactionId: 20,
        PaymentTransactionNumber: "PAY-001",
        CashReceiptPath: "/uploads/inventory/receipt.png",
      },
      "movements",
    );
    assert.equal(returned.paymentTransactionNumber, "PAY-001");
    assert.ok(returned.cashReceiptUrl.startsWith("http"));
    assert.equal(api.inventoryReceiptUrl("javascript:alert(1)"), "");
    client.defaults.adapter = async (config) => ({
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: { success: true, data: {} },
    });
    await assert.rejects(
      api.saveInventoryApi("stock-out", {
        ...cash,
        cashReceipt: { name: "new.png", dataUrl: "data:image/png;base64,aGVsbG8=" },
      }),
      /no valid receipt path/,
    );
    assert.throws(
      () => api.unwrapInventory({ data: { success: false, message: "Rejected" } }),
      /Rejected/,
    );
    client.defaults.adapter = async (config) => {
      const error = new Error("Request failed with status code 500");
      error.config = config;
      error.response = { status: 500, data: "" };
      throw error;
    };
    await assert.rejects(
      api.saveInventoryApi("categories", { name: "Chemistry", code: "CHE" }),
      /backend returned HTTP 500/,
    );
    assert.deepEqual(api.inventoryPayload("categories", { name: " Chemistry ", code: " CHE " }), {
      name: "Chemistry",
      code: "CHE",
      description: "",
      department: "Administration",
      status: "Active",
    });
    const fixtures = {
      dashboard: {
        kpis: { totalItems: 1, totalStockValue: 125, lowStockCount: 0, pendingOrdersCount: 2 },
      },
      items: [
        { itemId: 12, code: "INV-12", name: "Chair", categoryId: 4, quantity: 5, unitCost: 25 },
      ],
      categories: [{ categoryId: 4, code: "CAT-4", name: "Furniture", status: "Active" }],
      suppliers: [{ supplierId: 3, code: "SUP-3", contactPerson: "Manager", categoryIds: [4] }],
      movements: [
        {
          transactionId: 9,
          itemId: 12,
          movementType: "Stock In",
          transactionDate: "2026-10-13T00:00:00",
          quantity: 5,
        },
      ],
    };
    client.defaults.adapter = async (config) => {
      calls.push(config);
      const key = config.url.split("/").at(-1);
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: { success: true, data: fixtures[key] },
      };
    };
    const state = await api.loadInventoryApi();
    assert.equal(state.items[0].id, "12");
    assert.equal(state.movements[0].itemId, "12");
    assert.equal(state.suppliers[0].contact, "Manager");
    assert.deepEqual(state.suppliers[0].categoryIds, ["4"]);
    assert.equal(state.dashboard.kpis.pendingOrdersCount, 2);
    assert.equal(calls.findLast((c) => c.url.endsWith("/categories")).params.includeInactive, true);
    assert.equal(calls.findLast((c) => c.url.endsWith("/suppliers")).params.includeInactive, true);
    client.defaults.adapter = async (config) => ({
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: { success: false, message: "Database unavailable" },
    });
    await assert.rejects(api.loadInventoryApi(), /Database unavailable/);
  } finally {
    await server.close();
  }
});

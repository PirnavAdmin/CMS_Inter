import api from "@/api/apiClient.js";

const BASE = "/api/v1/inventory";
const camel = (value) =>
  Object.fromEntries(
    Object.entries(value || {}).map(([key, entry]) => [
      key.charAt(0).toLowerCase() + key.slice(1),
      entry,
    ]),
  );

export function unwrapInventory(response) {
  const body = response?.data;
  if (body?.success === false || body?.Success === false)
    throw new Error(body.message || body.Message || "The request could not be completed.");
  return body?.data ?? body?.Data ?? body;
}

function rows(value) {
  const result = Array.isArray(value) ? value : (value?.items ?? value?.Items ?? value?.$values);
  if (!Array.isArray(result)) throw new Error("The server returned an unsupported inventory list.");
  return result;
}

function record(kind, value) {
  const r = camel(value);
  const idKey = {
    items: "itemId",
    categories: "categoryId",
    suppliers: "supplierId",
    movements: "transactionId",
  }[kind];
  const next = { ...r, id: String(r[idKey] ?? r.id) };
  for (const key of ["categoryId", "supplierId", "itemId", "correctionOfId", "returnOfId"])
    if (r[key] != null) next[key] = String(r[key]);
  if (r.categoryIds) next.categoryIds = r.categoryIds.map(String);
  if (kind === "items") next.openingQty = r.openingQuantity ?? r.openingQty ?? 0;
  if (kind === "suppliers") next.contact = r.contactPerson ?? r.contact;
  if (kind === "movements")
    Object.assign(next, {
      number: r.transactionNumber,
      date: r.transactionDate?.slice(0, 10),
      type: r.movementType,
      total: r.totalAmount,
      balance: r.runningBalance,
      reference: r.referenceNumber,
      invoice: r.invoiceNumber || r.supplierInvoice,
      purchaseOrder: r.purchaseOrderNumber,
      batch: r.batchNumber,
      recipient: r.recipientName,
      returnable: r.isReturnable,
      correctionOf: r.correctionOfId == null ? null : String(r.correctionOfId),
      returnOf: r.returnOfId == null ? null : String(r.returnOfId),
    });
  return next;
}

export async function loadInventoryApi() {
  const kinds = ["items", "categories", "suppliers", "movements"];
  const responses = await Promise.all(
    kinds.map((kind) =>
      api.get(`${BASE}/${kind}`, {
        params: { includeInactive: true },
      }),
    ),
  );
  const state = Object.fromEntries(
    kinds.map((kind, index) => [
      kind,
      rows(unwrapInventory(responses[index])).map((r) => record(kind, r)),
    ]),
  );
  const dashboard = camel(unwrapInventory(await api.get(`${BASE}/dashboard`)));
  const activities = rows(dashboard.recentActivities || []).map((value) => {
    const r = camel(value);
    return {
      ...r,
      id: String(r.activityId),
      date: r.activityDate?.slice(0, 10),
      text: r.activityText,
    };
  });
  return { ...state, orders: [], activities, dashboardKpis: camel(dashboard.kpis), serverBacked: true };
}

export async function saveInventoryApi(kind, values) {
  const movement = kind === "stock-in" || kind === "stock-out";
  const payload = { ...values };
  const aliases = movement
    ? {
        date: "transactionDate",
        reference: "referenceNumber",
        invoice: "invoiceNumber",
        purchaseOrder: "purchaseOrderNumber",
        batch: "batchNumber",
        recipient: "recipientName",
        returnable: "isReturnable",
        number: "paymentTransactionNumber",
      }
    : { openingQty: "openingQuantity", contact: "contactPerson" };
  for (const [source, target] of Object.entries(aliases)) {
    if (source in payload) payload[target] = payload[source];
    delete payload[source];
  }

  // Sanitize reference IDs
  for (const key of ["categoryId", "supplierId", "itemId"]) {
    if (key in payload) {
      payload[key] = (payload[key] === "" || payload[key] == null) ? null : Number(payload[key]);
    }
  }
  if (payload.categoryIds) {
    payload.categoryIds = payload.categoryIds.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  }

  // Sanitize numeric fields (convert "" to 0 or valid numbers, never send empty strings to decimal/int endpoints)
  const numericKeys = [
    "openingQuantity",
    "unitCost",
    "minStock",
    "reorderQty",
    "issueValue",
    "quantity",
    "totalAmount",
    "total",
  ];
  for (const key of numericKeys) {
    if (key in payload) {
      if (payload[key] === "" || payload[key] == null) {
        payload[key] = 0;
      } else {
        const parsed = Number(payload[key]);
        payload[key] = Number.isFinite(parsed) ? parsed : 0;
      }
    }
  }

  // maxStock is nullable decimal (never send "" to decimal? endpoints)
  if ("maxStock" in payload) {
    if (payload.maxStock === "" || payload.maxStock == null) {
      payload.maxStock = null;
    } else {
      const parsed = Number(payload.maxStock);
      payload.maxStock = Number.isFinite(parsed) ? parsed : null;
    }
    if (payload.maxStock !== null && payload.minStock != null && payload.maxStock < payload.minStock) {
      payload.maxStock = payload.minStock;
    }
  }

  // Movement receipt upload
  if (movement && payload.cashReceipt?.dataUrl) {
    const receipt = payload.cashReceipt;
    const blob = await (await fetch(receipt.dataUrl)).blob();
    const form = new FormData();
    form.append("file", blob, receipt.name || "receipt.png");
    const uploaded = unwrapInventory(await api.post(`${BASE}/movements/upload-receipt`, form));
    payload.cashReceiptPath = uploaded.url || uploaded.filePath || uploaded.fileUrl;
    if (!payload.cashReceiptPath) throw new Error("Receipt upload did not return a file path.");
  }
  delete payload.cashReceipt;

  // Sanitize all date fields (convert "" to null)
  const dateKeys = [
    "purchaseDate",
    "warrantyDate",
    "expiryDate",
    "expectedReturnDate",
    "lastPurchaseDate",
    "transactionDate",
    "date",
  ];
  for (const key of dateKeys) {
    if (key in payload) {
      payload[key] = payload[key] && String(payload[key]).trim() !== "" ? String(payload[key]).trim() : null;
    }
  }

  // Clean empty strings on optional string fields so DataAnnotations (e.g. [EmailAddress]) do not fail
  const optionalStringKeys = [
    "description",
    "brand",
    "model",
    "sku",
    "department",
    "location",
    "rack",
    "supplierItemCode",
    "remarks",
    "alternatePhone",
    "email",
    "gstin",
    "pan",
    "address1",
    "address2",
    "city",
    "state",
    "postalCode",
    "address",
    "paymentTerms",
    "bankName",
    "accountHolder",
    "accountNumber",
    "ifsc",
    "notes",
  ];
  for (const key of optionalStringKeys) {
    if (key in payload && (payload[key] === "" || payload[key] == null)) {
      payload[key] = null;
    }
  }

  // Items specific cleanup
  if (kind === "items") {
    delete payload.lastPurchaseDate;
    if (values.id) {
      delete payload.openingQuantity;
      delete payload.unitCost;
      delete payload.quantity;
      delete payload.openingCost;
      delete payload.createdAt;
      delete payload.updatedAt;
    }
  }

  delete payload.id;
  const path = movement
    ? `movements/${kind}`
    : `${kind}${values.id ? `/${encodeURIComponent(values.id)}` : ""}`;
  const response = await api.request({
    url: `${BASE}/${path}`,
    method: !movement && values.id ? "put" : "post",
    data: payload,
  });
  return unwrapInventory(response);
}

export async function inventoryAction(path, method = "post") {
  return unwrapInventory(await api.request({ url: `${BASE}/${path}`, method }));
}

export async function inventoryDetail(kind, id) {
  return record(kind, unwrapInventory(await api.get(`${BASE}/${kind}/${encodeURIComponent(id)}`)));
}

export async function inventoryLedger(id, dates = {}) {
  const response = await api.get(`${BASE}/items/${encodeURIComponent(id)}/ledger`, {
    params: dates,
  });
  return rows(unwrapInventory(response)).map((r) => record("movements", r));
}

export async function inventoryReport(reportType, dates = {}, signal) {
  const response = await api.get(`${BASE}/reports`, {
    params: { reportType, dateFrom: dates.from, dateTo: dates.to },
    signal,
  });
  const result = camel(unwrapInventory(response));
  return { columns: rows(result.columns), rows: rows(result.rows).map(camel) };
}

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
  return { ...state, orders: [], activities: [], serverBacked: true };
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
    : { openingQty: "openingQuantity" };
  for (const [source, target] of Object.entries(aliases)) {
    if (source in payload) payload[target] = payload[source];
    delete payload[source];
  }
  for (const key of ["categoryId", "supplierId", "itemId"])
    if (key in payload) payload[key] = payload[key] === "" ? null : Number(payload[key]);
  if (payload.categoryIds) payload.categoryIds = payload.categoryIds.map(Number);
  for (const key of ["purchaseDate", "warrantyDate", "expiryDate", "expectedReturnDate"])
    if (payload[key] === "") payload[key] = null;
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

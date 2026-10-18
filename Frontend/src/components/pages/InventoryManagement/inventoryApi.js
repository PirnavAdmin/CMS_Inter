import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { env } from "@/config/env.js";

const base = "/api/v1/inventory";
export function inventoryRequestError(error, path) {
  if (error?.response?.status === 404) {
    return new Error(
      `The configured backend does not provide ${base}/${path} (HTTP 404). Ask your backend developer to deploy the inventory API or provide its correct base URL.`,
      { cause: error },
    );
  }
  const detail = getApiErrorMessage(error);
  const status = error?.response?.status;
  return new Error(
    typeof detail === "string" && detail.trim()
      ? detail
      : status
        ? `Inventory request failed (HTTP ${status}); the backend returned no error details.`
        : "The inventory backend is unreachable. Check the API connection.",
    { cause: error },
  );
}
export function unwrapInventory(response) {
  const body = response.data;
  if (
    body?.success === false ||
    body?.Success === false ||
    body?.status === false ||
    body?.Status === false
  )
    throw new Error(body.message || body.Message || "Inventory request failed.");
  return body?.data ?? body?.Data ?? body;
}
export function normalizeInventory(record, kind) {
  const r = Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key[0].toLowerCase() + key.slice(1), value]),
  );
  const aliases = {
    openingQuantity: "openingQty",
    contactPerson: "contact",
    transactionNumber: "number",
    transactionDate: "date",
    movementType: "type",
    totalAmount: "total",
    referenceNumber: "reference",
    invoiceNumber: "invoice",
    purchaseOrderNumber: "purchaseOrder",
    batchNumber: "batch",
    recipientName: "recipient",
    isReturnable: "returnable",
    correctionOfId: "correctionOf",
    returnOfId: "returnOf",
    runningBalance: "balance",
    itemName: "item",
    itemCode: "code",
    categoryName: "category",
    supplierName: "supplier",
  };
  for (const [from, to] of Object.entries(aliases)) if (from in r) r[to] = r[from];
  if (kind === "movements") {
    r.paymentTransactionNumber =
      r.paymentTransactionNumber || r.onlineTransactionNumber || r.paymentReference || "";
    const receipt =
      r.cashReceiptUrl ||
      r.receiptUrl ||
      r.cashReceiptPath ||
      r.receiptPath ||
      (typeof r.cashReceipt === "string" ? r.cashReceipt : null);
    if (receipt) r.cashReceiptUrl = inventoryReceiptUrl(receipt);
  }
  r.id = String(
    r.id ??
      r[
        kind === "items"
          ? "itemId"
          : kind === "categories"
            ? "categoryId"
            : kind === "suppliers"
              ? "supplierId"
              : "transactionId"
      ] ??
      "",
  );
  for (const key of ["itemId", "categoryId", "supplierId", "correctionOf", "returnOf"])
    if (r[key] != null) r[key] = String(r[key]);
  if (r.categoryIds) r.categoryIds = r.categoryIds.map(String);
  for (const key of [
    "date",
    "purchaseDate",
    "warrantyDate",
    "lastPurchaseDate",
    "expiryDate",
    "expectedReturnDate",
    "createdAt",
    "updatedAt",
  ])
    if (r[key]) r[key] = r[key].slice(0, 10);
  r.maxStock ??= "";
  r.code ??= "";
  return r;
}
const list = (data) => {
  const rows = Array.isArray(data) ? data : (data?.items ?? data?.rows ?? data?.$values);
  if (!Array.isArray(rows)) throw new Error("Invalid inventory list response.");
  return rows;
};
export async function loadInventoryApi(signal) {
  const paths = ["dashboard", "items", "categories", "suppliers", "movements"];
  const responses = await Promise.all(
    paths.map((path) =>
      apiClient
        .get(`${base}/${path}`, {
          signal,
          params: ["categories", "suppliers"].includes(path)
            ? { includeInactive: true }
            : undefined,
        })
        .then(unwrapInventory)
        .catch((error) => {
          throw inventoryRequestError(error, path);
        }),
    ),
  );
  const [dashboard, ...collections] = responses;
  const state = { dashboard, orders: [], activities: [], nextId: 1, serverBacked: true };
  paths.slice(1).forEach((kind, index) => {
    state[kind] = list(collections[index]).map((r) => normalizeInventory(r, kind));
  });
  state.nextId = Math.max(0, ...state.items.map((r) => Number(r.id) || 0)) + 1;
  return state;
}
const pick = (values, keys) =>
  Object.fromEntries(keys.split(" ").map((key) => [key, values[key] ?? null]));
export function inventoryPayload(kind, v) {
  if (kind.startsWith("stock-"))
    return {
      ...pick(
        v,
        "supplierInvoice location condition issueType department recipientId destination purpose approvedBy performedBy remarks",
      ),
      expiryDate: v.expiryDate || null,
      expectedReturnDate: v.returnable ? v.expectedReturnDate || null : null,
      itemId: Number(v.itemId),
      supplierId: v.supplierId ? Number(v.supplierId) : null,
      movementType: kind === "stock-in" ? "Stock In" : "Stock Out",
      quantity: Number(v.quantity),
      unitCost: Number(v.unitCost),
      transactionDate: v.date,
      transactionNumber:
        v.paymentMethod === "Online Transaction" ? String(v.number || "").trim() || null : null,
      paymentTransactionNumber:
        v.paymentMethod === "Online Transaction" ? String(v.number || "").trim() || null : null,
      paymentMethod: v.paymentMethod || null,
      cashReceiptPath:
        v.paymentMethod === "Cash"
          ? v.cashReceipt?.path || (typeof v.cashReceipt === "string" ? v.cashReceipt : null)
          : null,
      invoiceNumber: v.invoice || null,
      purchaseOrderNumber: v.purchaseOrder || null,
      referenceNumber: v.reference || null,
      batchNumber: v.batch || null,
      recipientName: v.recipient || null,
      isReturnable: !!v.returnable,
    };
  if (kind === "categories")
    return {
      name: String(v.name || "").trim(),
      code: String(v.code || "").trim(),
      description: v.description || "",
      department: v.department || "Administration",
      status: v.status || "Active",
    };
  if (kind === "suppliers")
    return {
      ...pick(
        v,
        "name code phone alternatePhone email gstin pan address1 address2 city state postalCode country paymentTerms bankName accountHolder accountNumber ifsc notes status",
      ),
      contactPerson: v.contact,
      categoryIds: (v.categoryIds || []).map(Number),
    };
  const payload = {
    ...pick(
      v,
      "name code unit type description brand model sku department location rack supplierItemCode remarks status",
    ),
    categoryId: Number(v.categoryId),
    supplierId: v.supplierId ? Number(v.supplierId) : null,
    purchaseDate: v.purchaseDate || null,
    warrantyDate: v.warrantyDate || null,
    maxStock: v.maxStock === "" || v.maxStock == null ? null : Number(v.maxStock),
  };
  for (const key of ["minStock", "reorderQty", "issueValue"]) payload[key] = Number(v[key] || 0);
  if (!v.id) {
    // New items receive their code from the backend during creation.
    // Keep the stored code in update requests so existing identities are preserved.
    payload.code = null;
    payload.openingQuantity = Number(v.openingQty || 0);
    payload.unitCost = Number(v.unitCost || 0);
  }
  return payload;
}
export async function saveInventoryApi(kind, values) {
  const path = kind.startsWith("stock-")
    ? `movements/${kind}`
    : `${kind}${values.id ? `/${encodeURIComponent(values.id)}` : ""}`;
  try {
    if (
      kind.startsWith("stock-") &&
      values.paymentMethod === "Cash" &&
      values.cashReceipt &&
      !values.cashReceipt.path &&
      typeof values.cashReceipt !== "string"
    ) {
      const path = await uploadInventoryReceipt(values.cashReceipt);
      // Reuse a successful upload if the movement save fails and is retried.
      values.cashReceipt.path = path;
    }
    return unwrapInventory(
      await apiClient[values.id && !kind.startsWith("stock-") ? "put" : "post"](
        `${base}/${path}`,
        inventoryPayload(kind, values),
      ),
    );
  } catch (error) {
    if (error?.response?.status === 404) throw inventoryRequestError(error, path);
    const detail = getApiErrorMessage(error);
    const status = error?.response?.status;
    const message =
      typeof detail === "string" && detail.trim()
        ? detail
        : status
          ? `Unable to save ${kind === "categories" ? "category" : "inventory record"}: the backend returned HTTP ${status} with no error details.`
          : "The inventory server did not provide an error message. Check the API connection and retry.";
    throw new Error(message, { cause: error });
  }
}
export function inventoryReceiptUrl(path) {
  try {
    const url = new URL(path, `${env.apiBaseUrl.replace(/\/$/, "")}/`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
export async function uploadInventoryReceipt(receipt) {
  let file = receipt.file;
  if (!file && receipt.dataUrl) {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(receipt.dataUrl);
    if (!match) throw new Error("The selected receipt image is invalid. Select it again.");
    file = new Blob([Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0))], { type: match[1] });
  }
  if (!file) throw new Error("Select a receipt image again before saving.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error("Choose a JPG, PNG, or WebP receipt up to 5 MB.");
  const body = new FormData();
  body.append("file", file, receipt.name || "cash-receipt.png");
  const result = await apiClient
    .post(`${base}/movements/upload-receipt`, body)
    .then(unwrapInventory)
    .catch((error) => {
      throw inventoryRequestError(error, "movements/upload-receipt");
    });
  const path =
    typeof result === "string"
      ? result
      : (result?.cashReceiptPath ??
        result?.CashReceiptPath ??
        result?.receiptPath ??
        result?.ReceiptPath ??
        result?.receiptUrl ??
        result?.ReceiptUrl ??
        result?.filePath ??
        result?.FilePath ??
        result?.path ??
        result?.Path ??
        result?.url ??
        result?.Url);
  if (!path || !inventoryReceiptUrl(path))
    throw new Error(
      "The receipt-upload API returned no valid receipt path. Contact your backend developer.",
    );
  return path;
}
export async function inventoryAction(path, method = "post") {
  return unwrapInventory(await apiClient[method](`${base}/${path}`));
}
export async function inventoryDetail(kind, id) {
  return normalizeInventory(
    unwrapInventory(await apiClient.get(`${base}/${kind}/${encodeURIComponent(id)}`)),
    kind,
  );
}
export async function inventoryLedger(id, dates, signal) {
  return list(
    unwrapInventory(
      await apiClient.get(`${base}/items/${encodeURIComponent(id)}/ledger`, {
        signal,
        params: { from: dates.from || undefined, to: dates.to || undefined },
      }),
    ),
  ).map((r) => normalizeInventory(r, "movements"));
}
export async function inventoryReport(report, filters, signal) {
  const names = {
    from: "DateFrom",
    to: "DateTo",
    itemId: "ItemId",
    categoryId: "CategoryId",
    department: "Department",
    supplierId: "SupplierId",
    type: "MovementType",
    stockStatus: "StockStatus",
  };
  const params = { ReportType: report };
  for (const [key, value] of Object.entries(filters))
    if (value && names[key]) params[names[key]] = value;
  const result = unwrapInventory(await apiClient.get(`${base}/reports`, { signal, params }));
  const rows = list(result.rows ?? result.Rows).map((row) => {
    const r = normalizeInventory(row, "movements");
    const aliases = {
      openingStock: "opening",
      receivedStock: "received",
      issuedStock: "issued",
      itemStatus: "status",
      totalValue: "total",
      currentStock: "quantity",
      preferredSupplier: "supplier",
      issuedBy: "performedBy",
      issueValue: "total",
      quantityReceived: "quantity",
      numberOfItems: "count",
      minimumStockAlerts: "alerts",
      batchOrSku: "batch",
      recordType: "kind",
      expiryWarrantyDate: "date",
      daysRemaining: "days",
      issueDate: "date",
    };
    for (const [from, to] of Object.entries(aliases)) if (from in r) r[to] = r[from];
    if (report === "Low Stock Report") {
      r.name = r.item;
      r.id = r.itemId && Number(r.itemId) > 0 ? String(r.itemId) : "";
    }
    if (report === "Stock Summary") r.name = r.item;
    if (report === "Supplier Purchase Report") r.partner = r.supplier;
    if (report === "Category-wise Inventory Value") {
      r.name = r.category;
      r.value = r.stockValue;
    }
    if (r.date) r.date = r.date.slice(0, 10);
    return r;
  });
  return { columns: result.columns ?? result.Columns, rows };
}

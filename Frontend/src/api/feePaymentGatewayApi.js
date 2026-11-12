import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { todayISO } from "@/data/feeManagementData.js";
import {
  gatewayData,
  reversalPayload,
  normalizePaymentConfig,
  paymentConfigCampusId,
  paymentConfigPayload,
  validatePaymentProof,
  paymentProofType,
} from "../modules/admin/AdminFees/services/paymentGatewaySession.js";

const config = {
  requireRealBackend: true,
  skipNetworkRetry: true,
  skipGlobalLoader: true,
  skipErrorLog: true,
};
const post = async (url, payload, signal) =>
  gatewayData((await apiClient.post(url, payload, { ...config, signal })).data);
export const feePaymentGatewayApi = {
  paymentProof: async (attachmentId, signal) => {
    const id = Number(attachmentId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("A valid payment proof ID is required.");
    const response = await apiClient.get(`/api/v1/fee-payments/gateway/attachments/${id}`, {
      ...config, signal, timeout: 60000, responseType: "blob", headers: { Accept: "image/jpeg,image/png,application/pdf" },
    });
    const blob = response.data;
    if (!(blob instanceof Blob) || !blob.size || blob.size > 5 * 1024 * 1024) throw new Error("Payment proof is empty or exceeds the supported size.");
    const type = paymentProofType(new Uint8Array(await blob.slice(0, 12).arrayBuffer()));
    if (!type || (blob.type && blob.type.split(";")[0] !== type)) throw new Error("The backend did not return a supported payment proof file.");
    signal?.throwIfAborted();
    return new Blob([blob], { type });
  },
  receiptPdf: async (feePaymentId, signal) => {
    const id = Number(feePaymentId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("A valid saved payment ID is required to retrieve the official receipt.");
    const response = await apiClient.get(`/api/v1/fee-payments/gateway/receipt/${id}/pdf`, {
      ...config, signal, responseType: "blob", headers: { Accept: "application/pdf" },
    });
    const blob = response.data;
    if (!(blob instanceof Blob) || !blob.size || !/application\/pdf/i.test(response.headers?.["content-type"] || blob.type))
      throw new Error("The backend did not return an official PDF receipt.");
    if (await blob.slice(0, 5).text() !== "%PDF-") throw new Error("The receipt response is not a valid PDF file.");
    signal?.throwIfAborted();
    return blob;
  },
  createOrder: (payload, signal) => post(apiEndpoints.feeGateway.createOrder, payload, signal),
  verify: (payload, signal) => post(apiEndpoints.feeGateway.verify, payload, signal),
  reverse: async (payload, signal) => {
    const data = await post(apiEndpoints.feeGateway.reverse, reversalPayload(payload), signal);
    if (data.success !== true)
      throw new Error("Reversal was not confirmed. Review Payment History before trying again.");
    return data;
  },
  submitUtr: async (payload, signal, { attachment, idempotencyKey } = {}) => {
    let data;
    if (attachment) {
      const type = await validatePaymentProof(attachment);
      const form = new FormData();
      for (const [key, value] of Object.entries(payload)) {
        if (value == null) continue;
        if (Array.isArray(value)) value.forEach(item => form.append(key, String(item)));
        else form.append(key, String(value));
      }
      form.append("attachment", attachment);
      if (idempotencyKey) form.append("idempotencyKey", idempotencyKey);
      data = gatewayData((await apiClient.post(apiEndpoints.feeGateway.submitUtr, form, {
        ...config, signal, timeout: 60000, ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}),
      })).data);
      if (data.success !== true || String(data.status).toLowerCase() !== "pendingverification"
        || !Number.isSafeInteger(Number(data.transactionId)) || Number(data.transactionId) <= 0
        || Number(data.studentId) !== Number(payload.studentId) || Number(data.studentFeeId) !== Number(payload.studentFeeId)
        || Math.abs(Number(data.amount) - Number(payload.amount)) > 0.005 || !Number.isFinite(Number(data.amount))
        || data.utrNumber !== payload.utrNumber || (payload.orderId && data.orderId !== payload.orderId)
        || !Number.isSafeInteger(Number(data.attachment?.attachmentId)) || Number(data.attachment.attachmentId) <= 0
        || data.attachment.contentType !== type || Number(data.attachment.sizeBytes) !== attachment.size) {
        throw new Error("The backend did not confirm that this verification request and its proof were stored together. Check the pending queue before retrying.");
      }
    } else data = await post(apiEndpoints.feeGateway.submitUtr, payload, signal);
    if (data.success !== true)
      throw new Error("UTR submission was not acknowledged. Review the queue before retrying.");
    return data;
  },
  approveUtr: async (payload, signal) => {
    const data = await post(apiEndpoints.feeGateway.approveUtr, payload, signal);
    if (data.success !== true)
      throw new Error("UTR review was not acknowledged. Review payment history before retrying.");
    return data;
  },
  status: async (studentFeeId, orderId, signal) => {
    try {
      return gatewayData(
        (
          await apiClient.get(apiEndpoints.feeGateway.status(studentFeeId), {
            ...config,
            params: { orderId },
            signal,
          })
        ).data,
      );
    } catch (error) {
      error.message = getApiErrorMessage(error);
      throw error;
    }
  },
  pendingUtrs: async (params, signal) => {
    const data = gatewayData(
      (await apiClient.get(apiEndpoints.feeGateway.pendingUtrs, { ...config, params, signal }))
        .data,
    );
    const rows = Array.isArray(data) ? data : data.items || data.results || data.$values;
    if (!Array.isArray(rows))
      throw new Error("The pending UTR API did not return a transaction list.");
    const normalized = rows.map(gatewayData);
    if (
      normalized.some(
        (row) =>
          !Number.isSafeInteger(Number(row.id)) ||
          Number(row.id) <= 0 ||
          !Number.isFinite(Number(row.amount)) ||
          Number(row.amount) <= 0,
      )
    )
      throw new Error("The pending UTR API returned incomplete transaction IDs or amounts.");
    return normalized;
  },
  exportLedger: async (params, signal) => {
    let response;
    try {
      response = await apiClient.get(apiEndpoints.feeGateway.exportLedger, {
        ...config,
        params,
        signal,
        responseType: "blob",
        headers: { Accept: "text/csv" },
      });
    } catch (error) {
      if (error.response?.data instanceof Blob) {
        try {
          error.response.data = JSON.parse(await error.response.data.text());
        } catch {
          /* Keep HTTP error. */
        }
      }
      throw new Error(getApiErrorMessage(error));
    }
    if (
      !(response.data instanceof Blob) ||
      !response.data.size ||
      !/text\/csv|application\/(octet-stream|csv|vnd.ms-excel)/i.test(
        response.headers["content-type"] || response.data.type,
      )
    )
      throw new Error("The ledger API did not return a CSV file.");
    const bytes = new Uint8Array(await response.data.arrayBuffer());
    signal?.throwIfAborted();
    const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
    const blob = new Blob(hasBom ? [bytes] : [new Uint8Array([0xef, 0xbb, 0xbf]), bytes], {
      type: "text/csv;charset=utf-8",
    });
    const disposition = response.headers["content-disposition"] || "";
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const plain = disposition.match(/filename="([^"]+)"|filename=([^;]+)/i);
    let filename = `Fee_Payments_Ledger_${todayISO()}.csv`;
    try {
      filename = encoded
        ? decodeURIComponent(encoded[1])
        : plain?.[1] || plain?.[2]?.trim() || filename;
    } catch {
      /* Use fallback filename. */
    }
    filename = Array.from(filename, (character) =>
      character.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(character) ? "_" : character,
    ).join("");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

export const reversePaymentApi = (payload, signal) => feePaymentGatewayApi.reverse(payload, signal);

export async function getPaymentGatewayConfigApi(campusId, signal) {
  const id = paymentConfigCampusId(campusId);
  const response = await apiClient.get(apiEndpoints.feeGateway.config, {
    ...config, params: { campusId: id }, signal,
    headers: { "X-Campus-Id": String(id) },
  });
  return normalizePaymentConfig(response.data, id);
}

export async function updatePaymentGatewayConfigApi(form, signal, section) {
  const payload = paymentConfigPayload(form, form.campusId, section);
  const data = await post(apiEndpoints.feeGateway.config, payload, signal);
  if (data.campusId != null && Number(data.campusId) !== payload.campusId)
    throw new Error("The backend acknowledged a different campus. Refresh before retrying.");
  // A successful transport response alone is not proof of persistence.
  if (data.success !== true && Number(data.campusId) !== payload.campusId)
    throw new Error("The backend did not acknowledge the configuration update. Refresh before retrying.");
  return data;
}

let checkoutPromise;
export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!checkoutPromise)
    checkoutPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const timer = window.setTimeout(() => fail(), 15000);
      const fail = () => {
        clearTimeout(timer);
        script.remove();
        checkoutPromise = null;
        const error = new Error("Razorpay Checkout could not be loaded. Please retry.");
        error.gatewayRetrySafe = true;
        reject(error);
      };
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        clearTimeout(timer);
        if (window.Razorpay) resolve(window.Razorpay);
        else fail();
      };
      script.onerror = fail;
      document.head.appendChild(script);
    });
  return checkoutPromise;
}

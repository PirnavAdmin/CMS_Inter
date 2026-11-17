# Technical Implementation Plan: Payment Gateway & Bank Account Configuration
## Omnichannel Fee Collection & Receiving Accounts Management

**Project:** College Management System  
**Module:** Admin Settings (`Frontend/src/modules/admin/AdminSettings/`) & Admin Fees (`Frontend/src/modules/admin/AdminFees/`)  
**Target Audience:** Frontend Development Team / Teammate  
**Document Type:** Feature Specification & Frontend Implementation Blueprint  
**Status:** Ready for Implementation  
**Date:** November 2026  

---

## 1. Executive Summary & Objective

To receive fee payments from students and parents through dynamic UPI QR, Razorpay checkout, or direct bank transfer, the college must configure its receiving account credentials. Currently, these settings are held in backend configuration files.

This specification provides the complete frontend blueprint for the **Payment Gateway & Bank Account Configuration** screen:

1. **New Settings Page:** [`Frontend/src/modules/admin/AdminSettings/PaymentGatewayConfigPage.jsx`](file:///c:/Users/ADMIN/Desktop/College-Management-System/Frontend/src/modules/admin/AdminSettings/PaymentGatewayConfigPage.jsx) reachable at `/dashboard/settings/payment-gateway`.
2. **Admin Settings Hub Card:** A dedicated card in [`SettingsPage.jsx`](file:///c:/Users/ADMIN/Desktop/College-Management-System/Frontend/src/modules/admin/AdminSettings/SettingsPage.jsx) titled **"Payment Gateway & Bank Accounts"**.
3. **Fee Management Quick Access:** A **"⚙️ Payment Settings"** toolbar button on [`FeeManagementPage.jsx`](file:///c:/Users/ADMIN/Desktop/College-Management-System/Frontend/src/modules/admin/AdminFees/FeeManagementPage.jsx) for instant access by accountants and finance managers.
4. **Role Security:** Strictly authorized for `Admin`, `Super Admin`, `SuperAdmin`, `Principal`, `Accountant`, and `Finance` roles.

---

## 2. Clarification: Why "QR is Not Generating"

Before proceeding with the configuration screen, here is the diagnosis of why the teammate experienced **"QR is not generating"**:

1. **Backend Controller Was Absent in the Teammate's Git Branch:**
   * In her report (`PAYMENT_GATEWAY_IMPLEMENTATION_REPORT.md` §A line 17 & §F line 93), she noted:  
     > *"There is no local FeePaymentGatewayController or gateway DTO/service to verify the proposed gateway contracts against."*
   * The backend gateway files were created locally and had not yet been pushed to Git. Therefore, when her frontend sent a request to `/api/v1/fee-payments/gateway/create-order`, the server returned **404 Not Found**.
2. **`requireRealBackend: true` Bypasses Mock Fallback:**
   * In `Frontend/src/api/feePaymentGatewayApi.js`:
     ```javascript
     const config = { requireRealBackend: true, skipNetworkRetry: true, ... };
     ```
   * The shared `apiClient.js` explicitly disables mock fallback when `requireRealBackend === true`. Because the real backend endpoint was not present in her branch, the request threw an error and failed to generate the QR.
3. **Click-to-Generate UX vs Auto-Generate:**
   * In `GatewayPaymentPanel.jsx`, the QR code does **not** auto-generate on opening the modal. The user must click the **"Generate UPI QR"** button first. If the button was clicked and the endpoint failed, an error message appeared instead of the QR image.
4. **Prerequisites for QR Generation:**
   * The student row must have a valid `studentId` and `studentFeeId` (or `assignmentId`).
   * The student must have an outstanding `balance > 0`.
   * The amount entered must be positive and `<= balance`.

Once the backend files are pulled and running, the QR code generation works immediately with the dynamic NPCI UPI string (`upi://pay?pa=...`).

---

## 3. Backend REST API Contracts

The backend provides two dedicated configuration endpoints under `/api/v1/fee-payments/gateway`:

### 3.1 Get Gateway & Bank Account Configuration
* **URL:** `GET /api/v1/fee-payments/gateway/config?campusId={optionalCampusId}`
* **Authorization:** `Bearer <JWT_TOKEN>` (`Admin, Super Admin, Principal, Accountant, Finance`)
* **Success Response (`200 OK`):**
  ```json
  {
    "id": 1,
    "campusId": null,
    "bankName": "HDFC Bank",
    "accountHolderName": "Pirnav Educational Group",
    "accountNumber": "50200012345678",
    "ifscCode": "HDFC0001234",
    "branchName": "Madhapur Branch, Hyderabad",
    "accountType": "Current",
    "payeeVpa": "pirnavcolleges@hdfcbank",
    "payeeName": "Pirnav Educational Group",
    "currency": "INR",
    "mcc": "8220",
    "enableCounterUpiQr": true,
    "provider": "Razorpay",
    "isLiveMode": false,
    "razorpayKeyId": "rzp_test_1DP5mmOlF5G5ag",
    "hasRazorpayKeySecret": true,
    "hasRazorpayWebhookSecret": true,
    "autoCapture": true,
    "enableRazorpay": true,
    "enableOfflineUtr": true,
    "pollingIntervalMs": 1200,
    "monitoringTimeoutSeconds": 600,
    "baseAppUrl": "http://192.168.1.15:5173",
    "frontendPort": 5173,
    "webhookUrl": "http://192.168.1.15:5173/api/v1/fee-payments/gateway/webhook",
    "updatedAt": "2026-11-10T08:30:00Z"
  }
  ```
  *(Note: Sensitive keys are never transmitted in plaintext. `hasRazorpayKeySecret` and `hasRazorpayWebhookSecret` indicate whether secrets are currently configured on the server).*

---

### 3.2 Update Gateway & Bank Account Configuration
* **URL:** `POST /api/v1/fee-payments/gateway/config`
* **Authorization:** `Bearer <JWT_TOKEN>` (`Admin, Super Admin, Principal, Accountant, Finance`)
* **Request Body:**
  ```json
  {
    "campusId": null,
    "bankName": "HDFC Bank",
    "accountHolderName": "Pirnav Educational Group",
    "accountNumber": "50200012345678",
    "ifscCode": "HDFC0001234",
    "branchName": "Madhapur Branch, Hyderabad",
    "accountType": "Current",
    "payeeVpa": "pirnavcolleges@hdfcbank",
    "payeeName": "Pirnav Educational Group",
    "currency": "INR",
    "mcc": "8220",
    "enableCounterUpiQr": true,
    "provider": "Razorpay",
    "isLiveMode": false,
    "razorpayKeyId": "rzp_test_1DP5mmOlF5G5ag",
    "razorpayKeySecret": "", 
    "razorpayWebhookSecret": "",
    "autoCapture": true,
    "enableRazorpay": true,
    "enableOfflineUtr": true,
    "pollingIntervalMs": 1200,
    "monitoringTimeoutSeconds": 600,
    "baseAppUrl": "http://192.168.1.15:5173",
    "frontendPort": 5173
  }
  ```
  *(Note: If `razorpayKeySecret` or `razorpayWebhookSecret` are left empty, the server preserves the previously stored secrets).*

---

## 4. Frontend API Client Updates

Add the following methods to [`Frontend/src/api/feePaymentGatewayApi.js`](file:///c:/Users/ADMIN/Desktop/College-Management-System/Frontend/src/api/feePaymentGatewayApi.js):

```javascript
/**
 * 9. Fetch Payment Gateway & Bank Account Configuration
 * @param {number|null} campusId - Optional campus filter
 * @param {AbortSignal} signal
 */
export async function getPaymentGatewayConfigApi(campusId = null, signal) {
  try {
    const response = await apiClient.get("/api/v1/fee-payments/gateway/config", {
      params: campusId ? { campusId } : {},
      skipGlobalLoader: false,
      signal
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to load payment gateway configuration."));
  }
}

/**
 * 10. Update Payment Gateway & Bank Account Configuration
 * @param {Object} payload - Configuration details
 * @param {AbortSignal} signal
 */
export async function updatePaymentGatewayConfigApi(payload, signal) {
  try {
    const response = await apiClient.post("/api/v1/fee-payments/gateway/config", payload, {
      skipGlobalLoader: false,
      signal
    });
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to update payment gateway configuration."));
  }
}
```

Also add endpoint definitions to [`Frontend/src/api/apiEndpoints.js`](file:///c:/Users/ADMIN/Desktop/College-Management-System/Frontend/src/api/apiEndpoints.js):

```javascript
// Inside apiEndpoints.feeGateway:
config: "/api/v1/fee-payments/gateway/config",
```

---

## 5. UI Component: `PaymentGatewayConfigPage.jsx`

Create [`Frontend/src/modules/admin/AdminSettings/PaymentGatewayConfigPage.jsx`](file:///c:/Users/ADMIN/Desktop/College-Management-System/Frontend/src/modules/admin/AdminSettings/PaymentGatewayConfigPage.jsx):

```jsx
import React, { useState, useEffect } from "react";
import { 
  Building2, 
  QrCode, 
  CreditCard, 
  ShieldCheck, 
  Clock, 
  Copy, 
  Check, 
  Save, 
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle
} from "lucide-react";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { 
  getPaymentGatewayConfigApi, 
  updatePaymentGatewayConfigApi 
} from "@/api/feePaymentGatewayApi.js";
import "./PaymentGatewayConfigPage.css";

export default function PaymentGatewayConfigPage() {
  const [activeTab, setActiveTab] = useState("bank"); // "bank" | "upi" | "razorpay" | "advanced"
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const [formData, setFormData] = useState({
    campusId: null,
    // Bank Details
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
    branchName: "",
    accountType: "Current",
    // UPI Details
    payeeVpa: "pirnavcolleges@hdfcbank",
    payeeName: "Pirnav Educational Group",
    currency: "INR",
    mcc: "8220",
    enableCounterUpiQr: true,
    // Razorpay Details
    provider: "Razorpay",
    isLiveMode: false,
    razorpayKeyId: "",
    razorpayKeySecret: "",
    razorpayWebhookSecret: "",
    hasRazorpayKeySecret: false,
    hasRazorpayWebhookSecret: false,
    autoCapture: true,
    enableRazorpay: true,
    enableOfflineUtr: true,
    // Polling & Network
    pollingIntervalMs: 1200,
    monitoringTimeoutSeconds: 600,
    baseAppUrl: "",
    frontendPort: 5173,
    webhookUrl: ""
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setStatusMessage({ type: "", text: "" });
      const data = await getPaymentGatewayConfigApi();
      if (data) {
        setFormData((prev) => ({
          ...prev,
          ...data,
          confirmAccountNumber: data.accountNumber || "",
          razorpayKeySecret: "",
          razorpayWebhookSecret: ""
        }));
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: "", text: "" });

    // Validate Account Numbers match
    if (formData.accountNumber && formData.accountNumber !== formData.confirmAccountNumber) {
      setStatusMessage({ type: "error", text: "Bank account numbers do not match." });
      return;
    }

    // Validate UPI VPA
    if (formData.payeeVpa && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(formData.payeeVpa)) {
      setStatusMessage({ type: "error", text: "Please enter a valid UPI VPA (e.g. name@bank)." });
      return;
    }

    // Validate IFSC code (11 characters)
    if (formData.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.toUpperCase())) {
      setStatusMessage({ type: "error", text: "Please enter a valid 11-character Indian IFSC code (e.g. HDFC0001234)." });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        ifscCode: formData.ifscCode.toUpperCase()
      };
      delete payload.confirmAccountNumber;

      const result = await updatePaymentGatewayConfigApi(payload);
      setStatusMessage({ type: "success", text: result.message || "Configuration saved successfully." });
      loadConfig();
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    if (!formData.webhookUrl) return;
    navigator.clipboard.writeText(formData.webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="pg-config-page">
        {/* Header */}
        <div className="pg-config-header">
          <div>
            <h1 className="pg-config-title">Payment Gateway & Bank Accounts</h1>
            <p className="pg-config-subtitle">
              Configure receiving bank details, countertop UPI QR parameters, and Razorpay gateway keys.
            </p>
          </div>
          <button 
            type="button" 
            className="cms-btn cms-btn-ghost" 
            onClick={loadConfig} 
            disabled={loading || saving}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>

        {/* Status Alerts */}
        {statusMessage.text && (
          <div className={`cms-alert cms-alert--${statusMessage.type === "error" ? "danger" : "success"}`}>
            {statusMessage.type === "error" && <AlertCircle size={18} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="pg-config-tabs" role="tablist">
          <button
            type="button"
            className={`pg-config-tab ${activeTab === "bank" ? "active" : ""}`}
            onClick={() => setActiveTab("bank")}
          >
            <Building2 size={16} /> College Bank Account
          </button>
          <button
            type="button"
            className={`pg-config-tab ${activeTab === "upi" ? "active" : ""}`}
            onClick={() => setActiveTab("upi")}
          >
            <QrCode size={16} /> NPCI UPI QR Config
          </button>
          <button
            type="button"
            className={`pg-config-tab ${activeTab === "razorpay" ? "active" : ""}`}
            onClick={() => setActiveTab("razorpay")}
          >
            <CreditCard size={16} /> Razorpay Gateway
          </button>
          <button
            type="button"
            className={`pg-config-tab ${activeTab === "advanced" ? "active" : ""}`}
            onClick={() => setActiveTab("advanced")}
          >
            <Clock size={16} /> Countertop & Polling
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="pg-config-form">
          {/* TAB 1: BANK ACCOUNT DETAILS */}
          {activeTab === "bank" && (
            <div className="pg-config-section">
              <h2 className="pg-section-title">Institutional Receiving Bank Account</h2>
              <p className="pg-section-desc">
                These bank details are displayed on student fee invoices and official receipts for offline NEFT/RTGS/IMPS transfers.
              </p>

              <div className="cms-form-grid cols-2">
                <div className="cms-field">
                  <label htmlFor="bankName">Bank Name <span className="req">*</span></label>
                  <input
                    id="bankName"
                    type="text"
                    placeholder="e.g. HDFC Bank, State Bank of India"
                    value={formData.bankName || ""}
                    onChange={(e) => handleChange("bankName", e.target.value)}
                    required
                  />
                </div>

                <div className="cms-field">
                  <label htmlFor="accountHolderName">Account Holder / Beneficiary Name <span className="req">*</span></label>
                  <input
                    id="accountHolderName"
                    type="text"
                    placeholder="e.g. Pirnav Educational Group Society"
                    value={formData.accountHolderName || ""}
                    onChange={(e) => handleChange("accountHolderName", e.target.value)}
                    required
                  />
                </div>

                <div className="cms-field">
                  <label htmlFor="accountNumber">Account Number <span className="req">*</span></label>
                  <input
                    id="accountNumber"
                    type="text"
                    placeholder="e.g. 50200012345678"
                    value={formData.accountNumber || ""}
                    onChange={(e) => handleChange("accountNumber", e.target.value)}
                    required
                  />
                </div>

                <div className="cms-field">
                  <label htmlFor="confirmAccountNumber">Confirm Account Number <span className="req">*</span></label>
                  <input
                    id="confirmAccountNumber"
                    type="text"
                    placeholder="Re-enter bank account number"
                    value={formData.confirmAccountNumber || ""}
                    onChange={(e) => handleChange("confirmAccountNumber", e.target.value)}
                    required
                  />
                </div>

                <div className="cms-field">
                  <label htmlFor="ifscCode">IFSC Code <span className="req">*</span></label>
                  <input
                    id="ifscCode"
                    type="text"
                    maxLength={11}
                    placeholder="e.g. HDFC0001234"
                    value={formData.ifscCode || ""}
                    onChange={(e) => handleChange("ifscCode", e.target.value.toUpperCase())}
                    required
                  />
                  <small className="field-hint">11 characters alphanumeric code</small>
                </div>

                <div className="cms-field">
                  <label htmlFor="branchName">Branch Name & City</label>
                  <input
                    id="branchName"
                    type="text"
                    placeholder="e.g. Madhapur Branch, Hyderabad"
                    value={formData.branchName || ""}
                    onChange={(e) => handleChange("branchName", e.target.value)}
                  />
                </div>

                <div className="cms-field">
                  <label htmlFor="accountType">Account Type</label>
                  <select
                    id="accountType"
                    value={formData.accountType || "Current"}
                    onChange={(e) => handleChange("accountType", e.target.value)}
                  >
                    <option value="Current">Current Account</option>
                    <option value="Savings">Savings Account</option>
                  </select>
                </div>

                <div className="cms-field">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={formData.enableOfflineUtr}
                      onChange={(e) => handleChange("enableOfflineUtr", e.target.checked)}
                    />
                    <span>Accept Offline Bank Transfer (UTR Submissions)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UPI CONFIGURATION */}
          {activeTab === "upi" && (
            <div className="pg-config-section">
              <h2 className="pg-section-title">NPCI Dynamic UPI QR Setup</h2>
              <p className="pg-section-desc">
                Defines the merchant Virtual Payment Address (VPA) encoded into countertop dynamic QR codes scanned by GPay, PhonePe, and Paytm.
              </p>

              <div className="cms-form-grid cols-2">
                <div className="cms-field">
                  <label htmlFor="payeeVpa">Payee VPA / UPI ID <span className="req">*</span></label>
                  <input
                    id="payeeVpa"
                    type="text"
                    placeholder="e.g. pirnavcolleges@hdfcbank"
                    value={formData.payeeVpa}
                    onChange={(e) => handleChange("payeeVpa", e.target.value)}
                    required
                  />
                  <small className="field-hint">Format: merchantname@bankhandle</small>
                </div>

                <div className="cms-field">
                  <label htmlFor="payeeName">Payee Display Name <span className="req">*</span></label>
                  <input
                    id="payeeName"
                    type="text"
                    placeholder="e.g. Pirnav Educational Group"
                    value={formData.payeeName}
                    onChange={(e) => handleChange("payeeName", e.target.value)}
                    required
                  />
                  <small className="field-hint">Name displayed inside the parent's UPI mobile app</small>
                </div>

                <div className="cms-field">
                  <label htmlFor="currency">Currency Code</label>
                  <input
                    id="currency"
                    type="text"
                    readOnly
                    value={formData.currency}
                    className="readonly-input"
                  />
                </div>

                <div className="cms-field">
                  <label htmlFor="mcc">Merchant Category Code (MCC)</label>
                  <input
                    id="mcc"
                    type="text"
                    value={formData.mcc || "8220"}
                    onChange={(e) => handleChange("mcc", e.target.value)}
                  />
                  <small className="field-hint">Standard MCC: 8220 (Colleges & Universities)</small>
                </div>

                <div className="cms-field full">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={formData.enableCounterUpiQr}
                      onChange={(e) => handleChange("enableCounterUpiQr", e.target.checked)}
                    />
                    <span>Enable Dynamic UPI QR tab in Admin Fee Collection modal</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RAZORPAY CONFIGURATION */}
          {activeTab === "razorpay" && (
            <div className="pg-config-section">
              <h2 className="pg-section-title">Razorpay Payment Gateway Integration</h2>
              <p className="pg-section-desc">
                Enables online card checkout, NetBanking, and automated webhook settlement.
              </p>

              <div className="cms-form-grid cols-2">
                <div className="cms-field full">
                  <div className="env-mode-selector">
                    <span className="env-label">Environment Mode:</span>
                    <label className={`env-chip ${!formData.isLiveMode ? "selected test" : ""}`}>
                      <input
                        type="radio"
                        name="isLiveMode"
                        checked={!formData.isLiveMode}
                        onChange={() => handleChange("isLiveMode", false)}
                      />
                      🧪 Test / Sandbox Mode
                    </label>
                    <label className={`env-chip ${formData.isLiveMode ? "selected live" : ""}`}>
                      <input
                        type="radio"
                        name="isLiveMode"
                        checked={formData.isLiveMode}
                        onChange={() => handleChange("isLiveMode", true)}
                      />
                      🚀 Live / Production Mode
                    </label>
                  </div>
                </div>

                <div className="cms-field full">
                  <label htmlFor="razorpayKeyId">Razorpay Key ID</label>
                  <input
                    id="razorpayKeyId"
                    type="text"
                    placeholder="rzp_test_... or rzp_live_..."
                    value={formData.razorpayKeyId || ""}
                    onChange={(e) => handleChange("razorpayKeyId", e.target.value)}
                  />
                </div>

                <div className="cms-field">
                  <label htmlFor="razorpayKeySecret">
                    Razorpay Key Secret {formData.hasRazorpayKeySecret && <span className="configured-badge">✓ Configured</span>}
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      id="razorpayKeySecret"
                      type={showKeySecret ? "text" : "password"}
                      placeholder={formData.hasRazorpayKeySecret ? "•••••••••••••••• (Leave blank to keep existing)" : "Enter key secret"}
                      value={formData.razorpayKeySecret || ""}
                      onChange={(e) => handleChange("razorpayKeySecret", e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setShowKeySecret(!showKeySecret)}
                    >
                      {showKeySecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="cms-field">
                  <label htmlFor="razorpayWebhookSecret">
                    Webhook Secret {formData.hasRazorpayWebhookSecret && <span className="configured-badge">✓ Configured</span>}
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      id="razorpayWebhookSecret"
                      type={showWebhookSecret ? "text" : "password"}
                      placeholder={formData.hasRazorpayWebhookSecret ? "•••••••••••••••• (Leave blank to keep existing)" : "Enter webhook secret"}
                      value={formData.razorpayWebhookSecret || ""}
                      onChange={(e) => handleChange("razorpayWebhookSecret", e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    >
                      {showWebhookSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="cms-field full">
                  <label>Webhook URL (Configure this in Razorpay Dashboard → Webhooks):</label>
                  <div className="webhook-box">
                    <input type="text" readOnly value={formData.webhookUrl} />
                    <button type="button" className="cms-btn cms-btn-ghost btn-copy" onClick={copyWebhookUrl}>
                      {copiedWebhook ? <Check size={14} /> : <Copy size={14} />} {copiedWebhook ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <small className="field-hint">Subscribe to events: <code>payment.captured</code> and <code>order.paid</code></small>
                </div>

                <div className="cms-field full">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={formData.autoCapture}
                      onChange={(e) => handleChange("autoCapture", e.target.checked)}
                    />
                    <span>Auto-Capture Payments Immediately</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ADVANCED / COUNTERTOP POLLING */}
          {activeTab === "advanced" && (
            <div className="pg-config-section">
              <h2 className="pg-section-title">Countertop Polling & Network Configuration</h2>
              <p className="pg-section-desc">
                Tune reactive polling intervals and cross-device network resolution for cashier workstations.
              </p>

              <div className="cms-form-grid cols-2">
                <div className="cms-field">
                  <label htmlFor="pollingIntervalMs">Reactive Polling Interval (Milliseconds)</label>
                  <input
                    id="pollingIntervalMs"
                    type="number"
                    min="500"
                    max="10000"
                    step="100"
                    value={formData.pollingIntervalMs}
                    onChange={(e) => handleChange("pollingIntervalMs", Number(e.target.value))}
                  />
                  <small className="field-hint">Recommended: 1200ms</small>
                </div>

                <div className="cms-field">
                  <label htmlFor="monitoringTimeoutSeconds">QR Monitoring Timeout (Seconds)</label>
                  <input
                    id="monitoringTimeoutSeconds"
                    type="number"
                    min="60"
                    max="3600"
                    step="30"
                    value={formData.monitoringTimeoutSeconds}
                    onChange={(e) => handleChange("monitoringTimeoutSeconds", Number(e.target.value))}
                  />
                  <small className="field-hint">Default: 600 seconds (10 minutes)</small>
                </div>

                <div className="cms-field">
                  <label htmlFor="baseAppUrl">Dynamic LAN / Mobile Base URL</label>
                  <input
                    id="baseAppUrl"
                    type="text"
                    placeholder="e.g. http://192.168.1.15:5173"
                    value={formData.baseAppUrl || ""}
                    onChange={(e) => handleChange("baseAppUrl", e.target.value)}
                  />
                  <small className="field-hint">Leave blank to auto-detect the local Wi-Fi IP address</small>
                </div>

                <div className="cms-field">
                  <label htmlFor="frontendPort">Frontend Workstation Port</label>
                  <input
                    id="frontendPort"
                    type="number"
                    min="1"
                    max="65535"
                    value={formData.frontendPort}
                    onChange={(e) => handleChange("frontendPort", Number(e.target.value))}
                  />
                  <small className="field-hint">Default: 5173 (Vite default)</small>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pg-config-footer">
            <button
              type="submit"
              className="cms-btn cms-btn-primary btn-save-config"
              disabled={saving}
            >
              <Save size={16} /> {saving ? "Saving Configuration..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
```

---

## 6. CSS Stylesheet: `PaymentGatewayConfigPage.css`

Create [`Frontend/src/modules/admin/AdminSettings/PaymentGatewayConfigPage.css`](file:///c:/Users/ADMIN/Desktop/College-Management-System/Frontend/src/modules/admin/AdminSettings/PaymentGatewayConfigPage.css):

```css
.pg-config-page {
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
}

.pg-config-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.pg-config-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--cms-text-primary, #0f172a);
  margin: 0;
}

.pg-config-subtitle {
  font-size: 0.9rem;
  color: var(--cms-text-muted, #64748b);
  margin-top: 4px;
}

.pg-config-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--cms-border, #e2e8f0);
  margin-bottom: 24px;
  overflow-x: auto;
}

.pg-config-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--cms-text-muted, #64748b);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.pg-config-tab:hover {
  color: var(--cms-primary, #0284c7);
}

.pg-config-tab.active {
  color: var(--cms-primary, #0284c7);
  border-bottom-color: var(--cms-primary, #0284c7);
}

.pg-config-form {
  background: #ffffff;
  border: 1px solid var(--cms-border, #e2e8f0);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.pg-section-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--cms-text-primary, #0f172a);
  margin: 0 0 6px 0;
}

.pg-section-desc {
  font-size: 0.85rem;
  color: var(--cms-text-muted, #64748b);
  margin: 0 0 20px 0;
}

.field-hint {
  display: block;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 4px;
}

.readonly-input {
  background: #f8fafc;
  cursor: not-allowed;
  color: #64748b;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  color: #334155;
  margin-top: 10px;
}

.toggle-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.env-mode-selector {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #f8fafc;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.env-label {
  font-weight: 600;
  font-size: 0.85rem;
  color: #475569;
}

.env-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.env-chip.selected.test {
  background: #fef9c3;
  color: #a16207;
  border-color: #facc15;
}

.env-chip.selected.live {
  background: #dcfce7;
  color: #15803d;
  border-color: #4ade80;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper input {
  width: 100%;
  padding-right: 40px;
}

.btn-toggle-eye {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
}

.configured-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 12px;
  background: #dcfce7;
  color: #15803d;
  font-size: 0.75rem;
  font-weight: 600;
}

.webhook-box {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.webhook-box input {
  flex: 1;
  background: #f8fafc;
  font-family: monospace;
  font-size: 0.85rem;
}

.pg-config-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--cms-border, #e2e8f0);
}

.btn-save-config {
  min-width: 160px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## 7. Routing & Navigation Wiring

### 7.1 Register Route in `Frontend/src/routes/AppRoutes.jsx`

Add the route under the Admin protected routes section:

```jsx
// 1. Import
const PaymentGatewayConfigPage = lazy(() => import("@/modules/admin/AdminSettings/PaymentGatewayConfigPage.jsx"));

// 2. Add route inside Admin Protected Routes:
<Route
  path="/dashboard/settings/payment-gateway"
  element={
    <ProtectedRoute allowedRoles={["Admin", "Super Admin", "SuperAdmin", "Principal", "Accountant", "Finance"]}>
      <PaymentGatewayConfigPage />
    </ProtectedRoute>
  }
/>
```

### 7.2 Add Settings Card in `Frontend/src/modules/admin/AdminSettings/SettingsPage.jsx`

Inside `settingsCards` array in [`SettingsPage.jsx`](file:///c:/Users/ADMIN/Desktop/College-Management-System/Frontend/src/modules/admin/AdminSettings/SettingsPage.jsx#L45):

```javascript
{
  id: "payment-gateway-configuration",
  title: "Payment Gateway & Bank Accounts",
  description: "Configure receiving bank details, countertop NPCI UPI QR, Razorpay API credentials, and polling timeouts.",
  icon: CreditCard,
  image: templatesImage,
  to: "/dashboard/settings/payment-gateway",
  buttonText: "Configure Accounts",
  primary: true,
},
```

### 7.3 Add Toolbar Action in `Frontend/src/modules/admin/AdminFees/FeeManagementPage.jsx`

In the header toolbar of [`FeeManagementPage.jsx`](file:///c:/Users/ADMIN/Desktop/College-Management-System/Frontend/src/modules/admin/AdminFees/FeeManagementPage.jsx), next to the "Pending UTR Queue" and "Export Ledger" buttons:

```jsx
<button
  type="button"
  className="cms-btn cms-btn-ghost"
  title="Configure Receiving Accounts & Payment Gateway"
  onClick={() => navigate("/dashboard/settings/payment-gateway")}
>
  <CreditCard size={15} /> Payment Settings
</button>
```

---

## 8. Summary Checklist for Frontend Teammate

| # | Task | Target File | Status |
|---|------|-------------|--------|
| **1** | Add `getPaymentGatewayConfigApi` & `updatePaymentGatewayConfigApi` | `Frontend/src/api/feePaymentGatewayApi.js` | ⏳ Ready to Code |
| **2** | Add `/config` endpoint key to `apiEndpoints.feeGateway` | `Frontend/src/api/apiEndpoints.js` | ⏳ Ready to Code |
| **3** | Create `PaymentGatewayConfigPage.jsx` | `Frontend/src/modules/admin/AdminSettings/` | ⏳ Ready to Code |
| **4** | Create `PaymentGatewayConfigPage.css` | `Frontend/src/modules/admin/AdminSettings/` | ⏳ Ready to Code |
| **5** | Register route `/dashboard/settings/payment-gateway` | `Frontend/src/routes/AppRoutes.jsx` | ⏳ Ready to Code |
| **6** | Add "Payment Gateway & Bank Accounts" card | `Frontend/src/modules/admin/AdminSettings/SettingsPage.jsx` | ⏳ Ready to Code |
| **7** | Add "Payment Settings" shortcut button in toolbar | `Frontend/src/modules/admin/AdminFees/FeeManagementPage.jsx` | ⏳ Ready to Code |

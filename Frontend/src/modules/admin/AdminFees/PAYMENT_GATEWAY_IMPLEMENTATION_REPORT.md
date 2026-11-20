# Admin payment gateway implementation report

Date: 9 November 2026

The frontend integration is implemented against the supplied API contracts. Production readiness and real settlement are **not verified**: this checkout contains no gateway controller/DTOs, and no real financial transaction or approval was initiated.

## A. Inspection findings

The original Admin flow is collection list → selected student account → Collect Payment modal → `POST /api/v1/fees/collect` → refresh ledger, collection, overview and selected account → existing receipt preview/isolated print document. Payment history can also retrieve official receipts by number or payment ID.

Existing functionality reused: authenticating Axios client, campus/academic contexts, real installment IDs, multiple schedule selection, partial schedule amounts, full balance, manual payment methods, discounts/fines, fee account normalization, receipt normalization, shared Modal/Toast/Skeleton components, CMS styles and five-row pagination.

The Accountant module has its own collection and receipt components/services and imports the Admin fee stylesheet. No Accountant file was changed. New CSS selectors have a gateway scope. The shared client's new safeguards are opt-in; existing callers retain their behavior.

The existing Axios client supports `skipGlobalLoader` and AbortController signals. It also contains automatic mock fallback and network retries, including mutations. New opt-in flags prevent those behaviors on gateway calls and the Admin cash write, avoiding synthetic payment results and automatic replay of an uncertain financial write. Authentication/authorization logic was not changed.

The local backend `FeeController`, `CreateFeePaymentRequest`, `FeeService` and `FeeRepository` confirm the existing cash contract and real schedule IDs. There is no local `FeePaymentGatewayController` or gateway DTO/service to verify the proposed gateway contracts against. Routes and existing permission utilities were inspected; no route or permission definition changed.

## B. Document comparison and implementation

The supplied specification and implementation-plan files have identical SHA-256 hashes. The third API integration plan was supplied in the conversation during implementation and was compared with both files.

The third plan adds the dedicated API module, quiet polling, cancellation, explicit verify response, `PendingVerification` queue status, and fallback filename `Fee_Payments_Ledger_YYYY-MM-DD.csv`. Those are incorporated once.

Unsafe sample behavior was corrected: no generated receipt numbers; no recursive Razorpay launch using stale state; no order creation on every amount keystroke; no overlapping interval requests; no success from order creation/scanning; no credit from UTR submission; no replacement of multiple schedule selection with a single-select dropdown; no payment-link or POS controls without contracts.

Implemented:

- Four tabs inside the existing collection modal: UPI QR, Razorpay card/netbanking, bank UTR, and existing cash/manual collection.
- Explicit order generation after amount/identity validation. Once an order exists, payment target and method are locked. The real returned PNG QR and UPI URI are displayed; clipboard failures expose the URI for manual copying.
- Sequential 1200ms polling after each completed probe, cancellation, stale-response protection, transient network errors, terminal failures, expiry/monitoring deadlines, and same-order status rechecks. No automatic new charge on timeout.
- Backend-confirmed settlement only, optional D5/A5 confirmation chime, 1.2-second confirmation state, refresh of balances/history/overview and retrieval of the existing official receipt. If receipt retrieval fails, payment remains confirmed and the UI reports receipt unavailability without fabricating receipt data.
- Razorpay script loading with timeout/retry, returned public key/order/amount, paise conversion, cancellation/failure handling, backend signature verification, and a separate backend status confirmation path. Signature verification stays on the server. See [Razorpay Standard Checkout documentation](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/).
- Pending UTR submission with duplicate-click protection. The documented UTR endpoint has **no installment-ID field**. Therefore UTR collection explicitly operates at fee-account level and supports a smaller account-level amount; selecting particular schedules requires switching to the account-level target. Schedule selection remains available for gateway orders and cash. UTR-specific installment allocation requires a backend extension.
- Scoped, searchable, paginated pending UTR queue with approve/reject confirmation, required rejection reason, existing view/edit permission checks, duplicate guards, uncertain-outcome handling and settlement refresh after approval.
- Backend CSV blob export scoped to selected campus/year, backend filename handling, fallback filename, preservation/addition of UTF-8 BOM, error handling and object URL cleanup. Existing print exports remain available.
- Existing cash endpoint and all existing manual methods, calculation fields and receipt flow retained. Validation now also prevents invalid IDs, negative/nonfinite adjustments, duplicate writes and unacknowledged results.

## C. Files changed

All paths are relative to the repository root.

| File | Reason |
| --- | --- |
| `Frontend/src/api/apiEndpoints.js` | Single definitions for seven gateway endpoints. |
| `Frontend/src/api/apiClient.js` | Opt-in real-backend-only and no-network-replay safeguards; defaults unchanged. |
| `Frontend/src/api/feePaymentGatewayApi.js` | Shared gateway requests, CSV handling and Razorpay script loader. |
| `Frontend/src/modules/admin/AdminFees/FeeManagementPage.jsx` | Four payment tabs integrated into the existing modal, queue/export navigation, permissions, cache invalidation and official receipt refresh. |
| `Frontend/src/modules/admin/AdminFees/FeeManagementPage.css` | Scoped gateway layout, responsive tabs and QR panel. |
| `Frontend/src/modules/admin/AdminFees/components/GatewayPaymentPanel.jsx` | UPI/Razorpay sessions and account-level pending UTR entry. |
| `Frontend/src/modules/admin/AdminFees/components/OfflineUtrQueueTab.jsx` | Scoped pending queue, review actions and shared pagination. |
| `Frontend/src/modules/admin/AdminFees/components/PaymentReversalModal.jsx` | Confirmed, authorized reversal with audit reason and duplicate protection. |
| `Frontend/src/modules/admin/AdminFees/hooks/usePaymentPolling.js` | React polling lifecycle and countdown. |
| `Frontend/src/modules/admin/AdminFees/services/paymentGatewaySession.js` | Response normalization, amount/ID validation and cancellable sequential polling engine. |
| `Frontend/src/modules/admin/AdminFees/tests/paymentGateway.test.js` | Mocked API, polling, component event, CSV, cash and queue tests. |
| `Frontend/src/modules/admin/AdminFees/PAYMENT_GATEWAY_IMPLEMENTATION_REPORT.md` | Findings, contract differences, validation and handoff requirements. |

No backend, routing, Accountant, Faculty, Student or unrelated Admin feature file was changed. No dependency was added. Temporary preview files were removed.

## D. API integration report

Gateway base: `/api/v1/fee-payments/gateway`. All gateway requests use `Frontend/src/api/feePaymentGatewayApi.js` and the existing authenticated client.

| Method / path | Frontend caller | Verification |
| --- | --- | --- |
| POST `/create-order` | `GatewayPaymentPanel.startOrder` | Supplied contract; mocked request/response tested; local backend implementation absent. |
| GET `/status/{studentFeeId}?orderId=…` | `usePaymentPolling` / `startPaymentPolling` | Silent config, real IDs/order, non-overlap, cancellation, timeout and settlement tested with mocks; deployed contract unverified. |
| POST `/verify` | Razorpay handler in `GatewayPaymentPanel` | Exact supplied payload and success/receipt/amount contract mocked; actual signatures/capture not exercised. |
| POST `/submit-utr` | `GatewayPaymentPanel.submitUtr` | Documented account-level payload and pending-only behavior mocked; no installment allocation contract supplied. |
| GET `/pending-utrs` | `OfflineUtrQueueTab` | Campus/year params, direct/wrapped rows and table behavior mocked. |
| POST `/approve-utr` | `OfflineUtrQueueTab.confirm` | Approve/reject payloads, required reason, duplicate guard and refresh mocked; no real approval performed. |
| GET `/export-ledger` | Ledger toolbar | Blob request, campus/year scope, filename, BOM and cleanup mocked. |
| POST `/reverse` | `PaymentReversalModal` | Addendum payload, confirmation, authorization gating and failure paths mocked; deployed reversal effects unverified. |
| POST `/api/v1/fees/collect` | Existing `CollectPaymentModal.save` | Controller/DTO/service/repository inspected; cash multiple schedules, partial amount and adjustments mocked. |
| GET `/api/v1/fees/receipt/{number}` | Existing receipt flow, plus confirmed gateway handoff | Local backend route/DTO inspected; real receipt rendering/printing was not exercised end to end. |

## E. Testing results

Commands run from `Frontend`:

- `node --test src/modules/admin/AdminFees/tests/paymentGateway.test.js`: **35 tests passed** after the technical addendum. Tests use in-memory Axios adapters and a component event harness, not real payments or a browser.
- `npx eslint src/api/feePaymentGatewayApi.js src/api/apiEndpoints.js src/modules/admin/AdminFees`: passed with no findings.
- `apiClient.js` lint: three `no-empty` findings at lines 150, 151 and 232. Linting the HEAD version via stdin produced the exact same findings. No new shared-client lint error was introduced.
- `npm run build`: passed. Existing large-chunk and mixed static/dynamic import warnings remain.
- `git diff --check`: passed.
- Existing `node --test src/modules/accountant/tests/accountantDashboard.test.js`: 41 tests passed, five failed, and several suites could not initialize because of stale `/src/Dashboard/AccountantDashboard/...` and other old imports. Additional existing source assertions fail. Those tests and Accountant implementation files were left unchanged. The new gateway suite separately verifies that a legacy caller still uses its existing shared-client configuration.
- Browser visual verification was attempted with a temporary, isolated local fixture. Browser access was unavailable; native browser inspection then stopped because the computer-use tool could not determine the current browser URL confidently. No visual or responsive browser pass is claimed. The temporary server was stopped and fixture removed.

Automated coverage includes direct/wrapped responses, real unpaid IDs, multiple and partial schedule payments, overpayment/invalid input rejection, matching backend order/amount, polling interval and cancellation, hung-request expiry, transient failures, authorization errors, authenticated/silent requests, no automatic mutation replay/mock substitution, pending UTR acknowledgment, queue scope, rejection reason, review permission/duplicate guards, backend filename/BOM export, explicit QR generation, backend QR rendering, Razorpay verification, pending verification, preserved cash adjustments and no invented receipt.

## F. Backend dependencies and remaining limitations

1. Supply/verify the actual eight gateway endpoints and DTOs (including reversal), with authorization, student/fee/schedule ownership checks, server-side payable validation, capture verification and idempotent settlement. The local backend currently has none of this gateway implementation.
2. The create-order response in all three documents omits a QR expiry value. The UI accepts `expiresAt` when available; otherwise it labels the 600-second countdown as a **monitoring limit**, not a guaranteed bank QR expiry. An actual QR-expiry contract is needed to guarantee expiry display.
3. UTR submission lacks selected installment IDs. The frontend makes this explicit and does not silently invent an allocation. Backend support is required for UTR-specific schedule allocation. The original documents say “12-digit” while the third plan tests an alphanumeric UTR; the UI accepts 6–100 alphanumeric characters. Confirm final reference/bank/remarks constraints against the real DTO.
4. Verify success is accepted only from the authenticated backend with `success: true`, matching amount and a receipt number; if a status is supplied, it must indicate settlement. The backend must ensure that this response really represents settled credit. A generic signature-valid/pending response cannot claim settlement.
5. Backend review permission mapping must be confirmed. Frontend review uses the existing fee-collection approve/reject action (normalized by existing permission utilities to edit); export uses Fee Management export permission. Backend enforcement is required independently.
6. Export must return a CSV MIME type. Cross-origin servers must expose `Content-Disposition` if the frontend is expected to use the server filename. The documented fallback is available otherwise.
7. The technical addendum adds copying of validated backend-generated mobile links. Mobile checkout itself remains unavailable: the referenced frontend route is absent and no secure existing-order checkout-details contract is supplied. WhatsApp/SMS delivery, physical card POS and a new gateway PDF endpoint remain outside the verified contracts. Existing Admin receipt printing remains the official flow; browser Save as PDF can use that print document, but print/PDF output was not visually verified here.
8. Closing an order window stops monitoring, not bank settlement. The backend has no documented cancellation endpoint. A timeout never automatically creates another order. Cross-session/server-level duplicate prevention depends on backend idempotency; local click guards cannot replace it.
9. Real Razorpay test-mode checkout, webhook capture, UTR settlement, official receipt retrieval/printing, CSV download in Excel, responsive layout and full authenticated Admin/Accountant navigation still need end-to-end testing with the deployed backend and an available browser.

No claim is made that real payment collection is fully working until those integration checks pass.

## G. Technical addendum implementation — 9 November 2026

### Inspection and differences from the supplied examples

The new task and complete addendum were read, including the reversal payload `{ transactionId, reason }`, authorized roles, mobile link response, multi-installment example, and worker-owned overdue status. The specification and implementation plan were rechecked and remain byte-identical; the third API integration plan supplied earlier in chat was compared with the addendum.

Frontend inspection covered the existing Admin collection/history/account/receipt normalization and UI, gateway components/API/polling/session helpers/tests/CSS, shared receipt rendering, existing role and permission utilities, `apiClient.js` and `apiEndpoints.js`, Student Portal routes/fees/profile/endpoint definitions, Parent Portal context/fees routes, and Accountant fee views/services/status helpers. Backend inspection was read-only: fee controller, request/response DTOs, notification methods and payment implementation. Relevant paths beyond the changed files include:

- `Frontend/src/modules/student/StudentPortalRoutes.jsx`
- `Frontend/src/modules/student/pages/StudentFees.jsx`
- `Frontend/src/modules/student/context/StudentProfileContext.jsx`
- `Frontend/src/modules/student/api/studentApiEndpoints.js`
- `Frontend/src/modules/parent/context/ParentPortalContext.jsx`
- `Frontend/src/modules/parent/pages/ParentFeesPage.jsx`
- `Frontend/src/routes/AppRoutes.jsx` and `Frontend/src/routes/ProtectedRoute.jsx`
- `Frontend/src/modules/admin/AdminRolesPermissions/useEffectivePermissions.js`, `permissionUtils.jsx`, and `rolesPermissions.constants.js`
- `Frontend/src/modules/accountant/pages/AccountantFeeManagement.jsx`, `services/accountantService.js`, and `utils/feeViewData.js`
- `Frontend/src/shared/components/Ui.jsx` and `Frontend/src/data/feeManagementData.js`
- `Backend/src/CollegeManagement.API/Controllers/V1/FeeController.cs`
- `Backend/src/CollegeManagement.API/DTOs/Fees/FeeDtos.cs`

Important differences resolved before implementing the addendum:

- The reversal sample falls back to `transaction.id`. Existing history IDs identify **FeePayment** records, not necessarily **PaymentGatewayTransaction** records. The UI therefore requires an explicit positive numeric `gatewayTransactionId`, `paymentGatewayTransactionId`, or numeric `transactionId` (including PascalCase). It never substitutes a generic row ID, receipt ID, fee assignment ID or provider `pay_*` reference.
- The earlier status contract calls a provider `pay_*` reference `transactionId`, while the new reversal contract uses a numeric database primary ID with the same name. These are kept distinct. Missing gateway primary IDs hide the action.
- The sample shows Reverse for every non-reversed row. The actual implementation permits only captured payments, with an allowed accounting role **and** existing fee-collection edit permission. A plain Paid status without evidence of gateway capture is insufficient.
- The addendum mentions a three-character reason in API documentation and five characters in the UI. The UI and API helper consistently require at least five characters containing letters or digits and trim whitespace.
- The addendum states the server features are implemented, but the corresponding gateway controller/DTOs and worker are not present in this checkout. Deployed behavior remains unverified.
- A LAN URL is not proof that a payment page exists, that another device can reach it, or that it enforces student/parent ownership.

### Already present before this addendum

Four payment methods, multiple installment checkboxes, partial schedule payments, correct installment-ID payloads, cash adjustments, backend settlement polling, official receipt handoff, UTR queue/review and CSV export were already present. Those were extended, not replaced. Existing global notification components remain available for actual backend notifications.

### New behavior and exact incremental file changes

| File | Addendum change |
| --- | --- |
| `Frontend/src/api/apiEndpoints.js` | Adds `feeGateway.reverse` once. |
| `Frontend/src/api/feePaymentGatewayApi.js` | Adds guarded reversal request plus `reversePaymentApi` export using existing authenticated, real-backend-only, non-replayed requests. |
| `Frontend/src/modules/admin/AdminFees/services/paymentGatewaySession.js` | Explicit gateway-ID extraction, role/capture eligibility, reversal validation, exact mobile-link validation, backend overdue predicate, and conservative installment deduplication. |
| `Frontend/src/modules/admin/AdminFees/components/PaymentReversalModal.jsx` | Only new production component: shared confirmation modal with transaction context, ledger warning, required reason, duplicate guard, cancellation, backend errors, uncertain-outcome handling and confirmed-success callback. |
| `Frontend/src/modules/admin/AdminFees/components/GatewayPaymentPanel.jsx` | Copies the exact matching backend `paymentLink` with clipboard success/error states and an explicit checkout-availability limitation. |
| `Frontend/src/modules/admin/AdminFees/FeeManagementPage.jsx` | Wires reversal into global and selected-account history, refreshes backend data, preserves reversed historical receipts/statuses, retains backend schedule balances/statuses and adds an overdue details warning. |
| `Frontend/src/modules/admin/AdminFees/FeeManagementPage.css` | Scoped reversal, mobile-link and overdue styles; no standalone CSS file or screen redesign. |
| `Frontend/src/modules/admin/AdminFees/tests/paymentGateway.test.js` | Extends the existing 22 tests to 35 tests. |
| `Frontend/src/modules/admin/AdminFees/PAYMENT_GATEWAY_IMPLEMENTATION_REPORT.md` | Documents this addendum and remaining dependencies. |

No new dependency, backend change, Student/Parent/Accountant feature edit or routing change was made. The existing polling hook and UTR component were reused without addendum changes. Shared fee data utilities were not modified, protecting their other consumers.

Reversal is available in both Payment History and the selected account's history when eligible. Merely opening the modal never calls the endpoint. Only **Confirm & Reverse Payment** submits it. Confirmed, pending or uncertain attempts are guarded against repeat submission during this page session. A backend validation rejection remains visible and can be corrected; an uncertain outcome requires investigation. After confirmed success, only a transaction status marker is retained locally to prevent stale captured copies being offered again. Account balances, paid totals, schedules, collection and overview are reloaded from backend data. Original transaction amounts/rows and receipt actions remain intact; reversed receipts display an explicit historical-record warning.

The mobile-link button appears only for an absolute HTTP(S) backend URL matching this fee assignment and order. It rejects script/credential/loopback URLs and mismatched order IDs, keeps the original URL byte-for-byte, and never substitutes the UPI URI or the counter's hostname. No message is sent. Because this checkout has no matching `/student/fees/pay/:studentFeeId` page, the UI explicitly says mobile checkout is unavailable in this build. This is link-copy support, **not completed mobile checkout**.

Multi-installment selection now deduplicates repeated real IDs and excludes conflicting duplicate balances or any duplicate explicitly marked settled. Totals use selected outstanding balances exactly once, retaining full balance, partial schedule payment, fine/discount and backend allocation behavior. Admin account normalization now preserves the backend `BalanceAmount` and installment status rather than accepting the shared demo helper's recomputation.

Overdue badges and details warnings reflect explicit backend statuses. Old dates alone do not trigger the new warning, and no hourly worker or new overdue calculation was added. Existing overview date grouping and existing fine rules were retained. A three-day reminder banner was **not fabricated**: no scheduled-reminder data contract was supplied. The local backend has reminder notification endpoints, but their presence does not prove an automated reminder was scheduled or delivered. No notification or financial action was sent during testing.

### Addendum endpoints and verification

- New caller: `PaymentReversalModal` → `feePaymentGatewayApi.reverse` → `POST /api/v1/fee-payments/gateway/reverse`, body `{ transactionId: <gateway primary ID>, reason: <trimmed explanation> }`. The supplied `success/receiptNumber/amount` response is checked against the selected transaction. Mocked only; deployed authorization, settlement and receipt reversal remain unverified.
- Existing `POST /create-order` supplies `paymentLink`. No replacement URL or new order is generated to copy it. Secure mobile order-details/checkout APIs are not documented.
- Existing history, fee-details, ledger, collection, dashboard and receipt endpoints provide refresh and historical records. No frontend ledger arithmetic was added.
- Read-only inspection found `POST /api/v1/fees/students/{studentId}/send-reminder`, `send-overdue-alert`, and `send-bulk-due-reminders`. No calls were made; no new manual notification flow was added.

### Addendum validation and remaining dependencies

The 35 mocked tests pass, including allowed/denied reversal roles and statuses, generic-ID rejection, explicit confirmation, reason validation, single submission, backend 400 errors, uncertain networks, mismatched reversal amounts, abort/stale success, exact clipboard content and denial, invalid links, duplicate schedule rows, backend-overdue preservation, history action visibility and historical receipts. Production build and changed-file lint pass. The Accountant suite was rerun: the same 41 passing/five failing tests and stale-path setup failures remain. No Accountant file was changed. No new browser or live financial verification is claimed.

Backend handoff requirements:

1. History/payment-detail responses must expose the actual gateway primary ID and captured/reversed status. The local `FeePaymentResponse` currently has no gateway-ID field; action visibility correctly remains off when that data is absent.
2. Confirm `/reverse` authorization, idempotency, transaction ownership, concurrent-request handling, server-side ledger restoration and receipt/audit retention on the deployed server.
3. Supply a secure existing-order mobile checkout contract: a server-authorized or signed-token endpoint returning public checkout details for exactly that fee account/order, with parent-child/student ownership enforcement and expiry. The current status response lacks the checkout public key and ownership contract. An unauthenticated numeric-fee-ID page must not be used as a substitute.
4. Once that contract exists, implement and verify the mobile route behind its access controls. Test it from the actual parent device/network; LAN links are not necessarily publicly accessible. Neither route reachability nor cross-student access protection is verified by copying a URL.
5. Supply actual reminder records/scheduling metadata if a three-day banner is desired; otherwise existing backend notifications remain the source of delivered reminders.

All Admin-side additions are implemented and tested with mocks. Usable cross-device checkout, real reversal/receipt effects and scheduled-reminder delivery remain incomplete or unverified for the specific reasons above.

## H. Confirmed create-order 404 diagnosis — 10 November 2026

**Outcome: the configured, running backend does not expose the documented gateway API. No compatible replacement endpoint was found. A frontend endpoint or proxy change cannot safely unblock QR/Card payments.** This section supersedes the earlier uncertainty about deployed route availability.

### Request trace and live evidence

1. `FeeManagementPage.jsx` passes the selected account, selected pending installment IDs and collection amount into `GatewayPaymentPanel.jsx`.
2. The panel validates these through `collectionPayload`, then calls `feePaymentGatewayApi.createOrder` with `paymentMethod: "UPI_QR"` or `"RAZORPAY"`.
3. `feePaymentGatewayApi.js` uses the existing authenticated Axios client and `apiEndpoints.feeGateway.createOrder`: `POST /api/v1/fee-payments/gateway/create-order`. Gateway requests require the real backend, bypass the global loader and disable automatic network replay.
4. In development, Axios uses a relative base URL. Vite proxies `/api` to `VITE_API_BASE_URL`, defaulting to `https://willfully-external-disinfect.ngrok-free.dev`. The proxy preserves the path; its route-specific middleware does not intercept the gateway path. Proxy connection failures produce 502, rather than the observed 404.
5. Read-only probes through the active Vite server returned **401** for `GET http://localhost:5173/api/v1/fees/types` and **404** for `GET http://localhost:5173/api/v1/fee-payments/gateway/create-order`. These were GET probes, not a repeated order-creation POST. The user's browser evidence supplies the POST 404.
6. The configured upstream's `/swagger/v1/swagger.json` returned **200**, identifying `Intermediate College Management System API`, version `v1`, with **829 paths**. Its paths contain no gateway, Razorpay, checkout or create-order endpoint; its schemas contain no gateway/Razorpay/checkout DTOs. This confirms a reachable API with no advertised compatible order endpoint.
7. Backend source inspection agrees: `Program.cs` maps controllers; `FeeController.cs` registers `/api/v1/fees`; no gateway controller, order route or gateway DTO is present in this checkout. Existing `POST /api/v1/fees/collect` accepts `CreateFeePaymentRequest` and records payment immediately. It must not replace gateway order creation, since that would credit the ledger before online settlement.

The intended backend endpoint remains **`POST /api/v1/fee-payments/gateway/create-order`**. It is a documented contract, not an available route on the inspected server. Backend teammates must implement or deploy the gateway controller at that path and include it in the running API definition. No backend file was changed.

### Required backend contract

Use the existing Bearer JWT authentication. The expected create-order request DTO is:

```ts
{
  studentId: number;             // Actual positive student ID
  studentFeeId: number;          // Actual positive fee assignment ID
  feeInstallmentIds: number[];   // Actual selected pending IDs; [] for full balance
  amount: number;                // INR rupees: 17500.00 for the user's example
  paymentMethod: "UPI_QR" | "RAZORPAY";
}
```

The expected successful create-order response DTO is:

```ts
{
  success: true;
  orderId: string;       // Real provider order identifier
  amount: number;        // 17500.00 INR rupees for the example
  currency: "INR";
  upiUri: string;        // Actual NPCI upi://pay URI for QR collection
  qrCodeBase64: string;  // Actual data:image/png;base64,... QR image
  keyId: string;         // Public Razorpay checkout key, never the secret
  paymentLink?: string; // Backend-resolved mobile link, when supported
  errorMessage?: string | null;
}
```

The backend must validate account ownership, selected installments and amount, and generate the real provider order/QR. Card checkout converts the rupee amount to paise only when initializing Razorpay Checkout.

End-to-end collection also requires the currently absent related contracts:

- `GET /api/v1/fee-payments/gateway/status/{studentFeeId}?orderId={orderId}` returning `success`, `orderId`, `status`, `isPaid`, `amount`, `receiptNumber`, `transactionId` and `failureReason` for that exact account/order.
- `POST /api/v1/fee-payments/gateway/verify` accepting `{ orderId, razorpayPaymentId, razorpaySignature, studentFeeId, amount }`, validating the signature and provider settlement on the server, and returning confirmed `{ success, receiptNumber, amount }`.
- Server-side webhook/settlement handling and idempotency so concurrent polling, checkout verification and provider callbacks cannot record the payment twice. Ledger allocation and official receipt creation must occur only after confirmed capture.

### Validation and scope of this diagnosis

- Existing gateway suite: **35 tests passed**. These use mocked transport/component harnesses and cover amount/ID validation, QR/Card initialization, polling, cleanup, settlement gating and duplicate guards. They do not prove a real gateway works.
- Targeted ESLint for the API service, gateway panel and fee page passed. Production build passed with existing chunk-size and mixed static/dynamic import warnings.
- No order-creation POST, verification POST, payment collection, UTR action, reversal or real financial transaction was initiated during this diagnosis.
- Actual QR rendering from a live order, real Card/NetBanking initialization, deployed signature/settlement verification, ledger effects and concurrent settlement remain **blocked and untested** until the gateway API is deployed.
- The user's actual student/assignment/installment IDs and selected INR 17,500 account were not available for live validation. Existing amount/ID selection logic was inspected; fixture tests do not verify that real account.
- Only this existing handoff report changed. Frontend endpoint, Axios configuration, Vite proxy, backend, Cash/Manual, Bank Transfer/UTR, schedules, UI and routing remain unchanged.

## I. Campus payment configuration implementation — 10 November 2026

### Inspection and verified API availability

The user-authored task requests the frontend configuration feature; `ACCOUNT_DETAILS_CONFIGURATION_PLAN.md` supplies a proposed contract and sample implementation. Its claims that gateway endpoints are deployed, blank secrets are preserved and pulling files makes QR work were checked rather than treated as verified facts.

Inspected Settings, Admin fee collection and normalization, gateway service/panel/polling, shared Axios and environment configuration, Vite proxy, Admin and Accountant routing/layouts, CampusContext, role/permission utilities, Accountant fee collection/services, receipt normalization/printing and backend fee/settings controllers/DTOs. Existing authenticated Axios requests, campus selector, shared form/button classes, DashboardLayout actions, AccountantLayout, ConfirmDialog, fee selection, settlement checks and authoritative receipt flow are reused. No duplicate payment service or receipt component was created.

The live configuration GET through Vite returned **404**. The configured upstream Swagger was retrieved with JSON Accept and ngrok's warning-bypass header: **829 paths, no gateway/config/order routes or gateway DTO schemas**. Local backend source also has no matching controller. Neither response envelope, secret-preservation semantics nor deployed configuration authorization can therefore be verified. The frontend is wired to the supplied contract but persistence is **not live-verified**. The prior 404 is still a backend deployment dependency, not an incorrect frontend path or missing receiving account.

### Exact feature files

| File (relative to `Frontend/src/`) | Purpose and change |
| --- | --- |
| `modules/admin/AdminSettings/PaymentGatewayConfigPage.jsx` (new) | Four-tab campus configuration form; read/edit permission checks; scope enforcement; masked account numbers; blank password fields; validation; receiving-account/live-mode confirmation; cancellation, guarded submission and reload verification. Also supplies the shared permission-gated settings link used by the entry points. |
| `modules/admin/AdminSettings/PaymentGatewayConfigPage.css` (new) | Page-scoped responsive grid, tab wrapping, error, form and action styling using existing theme variables. |
| `modules/admin/AdminSettings/SettingsPage.jsx` | Adds the requested card and Configure Accounts action only for permitted accounting roles. |
| `api/apiEndpoints.js` | Adds the single documented `feeGateway.config` path. |
| `api/feePaymentGatewayApi.js` | Adds `getPaymentGatewayConfigApi` and `updatePaymentGatewayConfigApi` using real authenticated transport, cancellation, disabled replay and suppressed request-error logging. GET requires an exact campus response; update uses an explicit DTO whitelist. |
| `modules/admin/AdminFees/services/paymentGatewaySession.js` | Adds shared scoped configuration normalization, defaults, validation and request construction. Rejects invalid scope/flags/network values and numeric account numbers; never copies response secrets into form state. |
| `routes/AppRoutes.jsx` | Registers `/dashboard/settings/payment-gateway` behind existing authentication and Settings screen permission checks. |
| `modules/accountant/AccountantPortalRoutes.jsx` | Adds `/accountant-dashboard/settings/payment-gateway` under the existing AccountantLayout and permission route. Canonical Admin URL redirects Accountant/Finance users to this layout. |
| `modules/accountant/pages/AccountantSettingsPage.jsx` | Adds an authorized Configure Accounts entry while retaining the theme settings. |
| `modules/accountant/pages/AccountantFeeManagement.jsx` | Adds only a permission-gated Payment Settings shortcut to the existing header actions; fee collection implementation is unchanged. |
| `modules/admin/AdminFees/FeeManagementPage.jsx` | Adds the header Payment Settings action and passes selected campus to the gateway panel. Retains backend account campus metadata to reject known account/campus mismatches. No installment/fee arithmetic changes. |
| `modules/admin/AdminFees/components/GatewayPaymentPanel.jsx` | QR/Card explicitly fetch exact-campus settings before loading Checkout or creating an order; block absent/disabled/incomplete configuration with a clear error. Cash/UTR submission paths are unchanged. Uses validated polling settings on new orders. |
| `modules/admin/AdminFees/hooks/usePaymentPolling.js` | Uses the order's configuration snapshot for interval/timeout, preserving prior 1200 ms/600-second defaults for existing callers and respecting order expiry. |
| `modules/admin/AdminFees/tests/paymentGateway.test.js` | Extends the existing suite from 35 to 43 tests; no new test organization or test dependencies. |
| `modules/admin/AdminFees/PAYMENT_GATEWAY_IMPLEMENTATION_REPORT.md` | Records implementation, real API evidence, validation limits and backend handoff. |

### Scope, authorization and persistence behavior

The active campus ID must be a positive integer and match the selected campus object. Non-admin users additionally require an explicit matching `assignedCampusIds` or `campusId` in their existing account. The server must enforce this scope too; the permissive fallback in CampusContext is not accepted as configuration authorization. No college/default-campus fallback or multiple-account activation/switching model was invented. A campus change remounts the form, clears sensitive state and aborts the previous read/write, rejecting stale responses. This prevents another campus's fields or confirmation from appearing under the new campus heading.

Allowed accounting roles use the existing role eligibility helper; view requires existing `settings` / `payment-gateway` view permission and edit requires its edit permission. Accountant/Finance do not gain modification rights from their role alone. The backend's actual configuration permission policy remains missing and must be reconciled before live use. Existing route guards, session behavior, sidebar/layout components and global permission rules were not changed.

GET is `GET /api/v1/fee-payments/gateway/config?campusId=<selected ID>`. POST is `/api/v1/fee-payments/gateway/config`, accepting only `campusId`, bank fields, UPI fields, Razorpay input fields/provider/flags, polling interval/timeout and application URL/port from the supplied request DTO. It excludes `id`, `confirmAccountNumber`, `updatedAt`, `webhookUrl` and secret-presence flags. Responses may use the gateway service's existing direct/data/PascalCase envelopes. Cross-campus/default responses, invalid types and missing required flags/network settings fail closed. HTTP 400/401/403/404/409/500 errors are preserved and displayed; a failed load cannot enable saving. An unsuccessful write disables saving until refresh rather than replaying an uncertain mutation.

The form validates required bank fields, string account numbers and matching confirmation, IFSC, account type, UPI VPA/payee name, INR, four-digit MCC, Razorpay key/environment, required secrets and numeric ranges (interval 500–10000 ms, monitoring 60–3600 seconds, port 1–65535). Application URLs must be HTTP(S), without credentials/query/fragment. A change to a loaded bank identity or enabling Live mode requires explicit shared-dialog confirmation. Saving is guarded against double clicks and only reports success after backend acknowledgement followed by an exact-campus GET whose editable fields match the submitted values. Secret changes check presence flags on reload; actual secret contents cannot be independently verified by the browser.

Secrets are never loaded from response values, displayed from saved data, stored in browser storage or logged by this feature. Newly entered secrets are cleared after submission/refresh/navigation; HTTP error text is redacted if it contains those inputs. **Blank-secret preservation is not verified:** when a response reports a stored secret, saving with that secret blank is blocked. The user must provide a replacement until the backend teammate verifies a preservation contract. Blank secrets with no stored secret are omitted, not sent as empty replacement strings. This conservative limitation is intentional; the sample's unconditional empty-string update was not copied.

The webhook field uses only the backend-supplied value; it is never derived from the frontend hostname or Base Application URL. Copy is restricted to an HTTPS URL with the documented backend webhook path and without known local/private hosts. Format checks do not establish public reachability, correct provider registration or signature verification. The form clearly states those backend dependencies. Polling/network settings do not alter Vite, environment variables or workstation network configuration.

### Backend teammate handoff

1. Deploy **GET and POST `/api/v1/fee-payments/gateway/config`** with the documented read/update DTOs. Return a complete object explicitly identifying the requested campus, including booleans and numeric network fields. A new campus needs an explicit scoped empty record or a documented distinguishable not-configured response; the frontend cannot treat an ambiguous route 404 as a safe create form.
2. Verify authorization separately for read and update, enforce tenant/campus assignment, and define which existing Settings permissions apply to Principal/Accountant/Finance. Expose the user's assigned campuses through the existing identity contract. Return 403 for unauthorized scope rather than another campus's receiving account.
3. Define and verify omitted/blank-secret behavior before relaxing the current replacement requirement. Keep secrets encrypted/server-only, return presence flags, ensure updates cannot accidentally erase secrets, and prevent logging sensitive request bodies. Confirm account-number mask/update semantics if the backend later returns only masked numbers; this implementation requires actual account numbers as strings for safe full-object saves.
4. Deploy create-order/status/verify/webhook and server-side idempotent settlement, as detailed in section H. The backend must resolve receiving configuration using the **student fee assignment's campus**, validate it against caller scope and selected installments, and never silently settle to a different campus/default account. The frontend campus check is not a substitute for backend ownership validation.
5. Verify server-side use of enable flags, polling settings and application URL resolution. The existing UTR submission/review and Cash workflows were not replaced; backend enforcement must govern offline transfer availability. Multiple bank accounts, switching/activation/default selection require additional contracts and are not implemented.
6. Configure the correct Razorpay onboarded merchant and settlement account separately from college bank-detail fields. Supply a public backend webhook URL and verify signatures/provider settlement; displaying QR or receiving Checkout callbacks cannot credit fees.
7. Generate authoritative receipt numbers and receipt/account/history responses after confirmed settlement. Existing Admin receipt normalization supports student, admission, campus, amount, method, reference, date and balances; fee-breakdown/paid-allocation rows are shown only when supplied and consistent. This task preserves receipt layout/printing and does not invent installment allocations, receipt IDs or missing receipt data. Complete live receiving-account-to-settlement-to-receipt behavior remains unverified.

### Validation results and limitations

- **43/43** focused gateway/configuration tests pass with fixtures and mocked transport/component handlers. Added coverage includes exact campus response matching, leading-zero preservation, secret stripping/preservation guards, input validation, request whitelist/authentication/HTTP failures, explicit account and live-mode confirmation, duplicate-save prevention and reload verification, aborted stale loads, read-only/role/campus checks, Accountant redirect, and QR/Card configuration failures before any order/Checkout initialization.
- The existing Accountant suite reports **41 passing / 5 failing** tests, matching the previously identified failures: four Payroll harness tests reference an undefined `AccountantDataTable`, and one Attendance test expects an obsolete source pattern. Additional suite setup errors still import removed `/src/Dashboard/AccountantDashboard/...` paths. Those unrelated tests/files were not rewritten.
- Targeted ESLint passes. Production build passes with existing bundle-size/mixed-import warnings.
- Both deep-link paths and the JSX module return HTTP 200 from Vite's SPA/module server. This verifies route serving, not authenticated Accountant rendering.
- Existing signed-in Admin browser: direct configuration URL rendered successfully with the correct active campus, matching design, two-column desktop and wrapping narrow layout, working Bank/Razorpay tab navigation, blank disabled credential fields and a visible 404 explanation with Save disabled. No credential was entered and no configuration/payment write was sent.
- Browser automation stopped during F5 checking because its safety layer could no longer establish the current URL confidently. No further UI interaction was attempted. **F5 completion, actual Settings-card/shortcut clicks, other campus selection and live Accountant rendering were not browser-verified.** Their wiring and access/lifecycle behavior are covered by inspection/component tests where described.
- Real save-and-refresh persistence, live secret retention, QR/Card generation/settlement, webhook reachability, backend permissions and authoritative receipt effects remain blocked by missing backend endpoints. Mocks are tests only, never runtime substitutes.

No backend, unrelated API/integration, global layout/CSS, existing fee schedule/calculation, payment-history/receipt renderer or Cash/UTR recording logic was modified. Only the two requested screen/style files were added; remaining changes reuse existing feature files.

## J. Non-editable configuration fields fix — 10 November 2026

This follow-up supersedes section I's behavior that disabled all configuration inputs after a failed GET.

**Root cause:** `CampusPaymentConfig` used `<fieldset disabled={!ready || loading || saving || !editable || Boolean(confirmation)}>`. A 404 left `ready` false, disabling every descendant input, select, checkbox and radio button. Controlled `value`/`onChange` handlers were correct. Page CSS contains no pointer-events blocker or overlay; only INR and the backend webhook were explicitly read-only. Separately, refresh and failed-save paths cleared entered secrets, and the campus-keyed remount discarded drafts.

Only three existing files changed for this follow-up:

- `Frontend/src/modules/admin/AdminSettings/PaymentGatewayConfigPage.jsx`: separates local editing from persistence readiness. Authorized fields remain editable while loading and after 404/500/network failures. Save remains disabled until an exact-campus configuration loads successfully. Existing view/edit permissions remain in force; 401/403 responses protect the form. The real API warning remains visible while editing. Blur validation works without a usable backend. Password visibility uses existing shared password/eye-button classes; INR and webhook remain read-only. No CSS change or form redesign.
- The same page retains edited values after failed writes, including newly entered secrets, without claiming success. Explicit refresh and late GET responses merge server values into untouched fields and preserve edited fields. A page-local Map keeps drafts separately by campus; switching back restores only that campus's edits. No browser storage or external persistence is used. Drafts clear on leaving/reloading the page or losing edit access, and successful verified saves clear the corresponding draft. The page explains this lifetime explicitly.
- `Frontend/src/modules/admin/AdminFees/tests/paymentGateway.test.js`: updates the failed-load expectation and adds four regression cases for all four tabs, masked-input visibility, draft retention, late loads/refresh, separate campus drafts, authorization failures and failed-save retention. Total **47/47 tests pass**. Tests exercise controlled handlers for typing/replacement/clearing (including pasted-value equivalents), dropdown selection, checkbox/radio toggles, local validation and read-only fields. These are component harness tests, not native keyboard-event tests.
- `Frontend/src/modules/admin/AdminFees/PAYMENT_GATEWAY_IMPLEMENTATION_REPORT.md`: records this diagnosis, change scope and test limitations.

The test count above includes all existing payment tests. Targeted ESLint passes, production build passes with existing bundle/mixed-import warnings, and `git diff --check` passes. No configuration POST or financial operation was sent.

**Current API status:** read-only `GET /api/v1/fee-payments/gateway/config?campusId=1` returns **404** through Vite. Endpoint mapping, shared Axios base URL and Vite's path-preserving `/api` proxy still match the supplied contract. Local backend source has no gateway configuration controller or DTO. Unlike the earlier checks, the configured upstream Swagger URL now also returns **404**, and the fee-types probe returned 404 too; current deployed route availability cannot be independently established from Swagger. Do not interpret this broader upstream failure as new proof of a route-specific missing controller. The configuration POST was deliberately not exercised. A backend teammate must restore/verify the configured upstream and expose the documented GET/POST contract before actual saving can be verified. An ambiguous 404 is not treated as proof of “no configuration saved”; a successful explicitly scoped empty configuration shows that distinct state.

**Browser check:** the direct browser-control host was unavailable; native browser inspection succeeded. Reloading the existing signed-in Admin configuration URL completed and showed Main Campus (HQ), the persistent 404 warning, Bank Name/Beneficiary/Account Number/Confirmation/IFSC/Branch fields as settable, Account Type as selectable, and Save disabled. Subsequent focus attempts were blocked by stale-element/active-user-input protection; UI input stopped to avoid interfering with the user. Physical typing, Backspace/Delete, clipboard paste and all-tab browser interactions were therefore not completed. No fixture or real credential was entered in the browser. These interaction/state paths are covered by the component tests above; no browser controlled-input warning audit is claimed.

No global campus context, authentication/authorization policy, routing, API contract/client/proxy, page CSS, QR generation, Razorpay initialization, fee collection/calculations, ledger/history or receipt implementation changed in this follow-up. Existing workspace changes from the previous task were retained.

## K. Bank-account overview and multiple-account backend handoff — 10 November 2026

Inspection confirmed that the available API supports one bank account embedded in a campus payment configuration, not a collection of receiving accounts. `PaymentGatewayConfig` has bank fields but no bank-account entity ID, active-account ID or activation status. `GetConfigAsync()` returns one configuration; `UpdateConfigAsync()` finds the campus configuration and replaces its bank fields. Neither a second row in the database nor an unsaved draft can be treated as a supported second account. The existing POST must not be used to add an additional account.

Inspected the configuration page/CSS, configuration API and normalization/validation, campus scoping, backend gateway controller/DTO/model/service, Admin gateway collection, Accountant manual collection, UPI/Razorpay configuration and UTR submission. No multiple-account API was found; staff beneficiary accounts belong to payroll and are unrelated.

Implemented only supported frontend behavior in the existing configuration page and stylesheet:

- A compact College Bank Accounts overview shows the number of bank accounts represented by the successfully loaded configuration (zero or one). It explicitly states that a complete saved-account count is unavailable; loading/errors show Unavailable rather than zero or stale data. Draft values never affect the count.
- A saved-account card masks the account number and shows bank, beneficiary, account type and Configured status. Radio selection highlights the card and opens saved details, including IFSC/branch and offline UTR enablement. Selecting is view-only: it makes no request, activates nothing and preserves drafts. Active status is explicitly Not reported by the backend.
- Add Bank Account and Set as Active Receiving Account are disabled with an explanation of the missing backend support. No fake account array, localStorage persistence, add request, activation request or payment routing was introduced.
- The existing single-account form and independent tab saves remain. Password inputs hide account numbers by default; confirmation is never populated from a masked value. A masked/incomplete account number cannot be replayed through the combined replacement-style POST, including from another tab. A valid full-number replacement plus confirmation can still use the existing bank update flow.
- The bank tab warns that bank fields do not change the bank linked to a UPI VPA or Razorpay's merchant settlement account. Other tab markup, header/navigation, payment methods, receipt/verification and collection implementations are unchanged.

### Minimum backend contract required before multiple accounts can work

Keep existing configuration endpoints compatible. Agree API routes and DTOs for the following operations before frontend integration; the following are required capabilities, not claims that new endpoints already exist:

1. **List accounts for an authorized campus:** return stable bank-account IDs, explicit campus IDs, bank/beneficiary/type, masked account number or last four digits, offline-UTR eligibility, actual active ID/status and a total count (including pagination semantics if applicable). Return an explicit empty list for no accounts; never substitute another campus/global account.
2. **Create an account without replacing existing accounts:** validate full account number, IFSC and required bank fields server-side. Return the new ID and persisted state. Support duplicate-request protection and define whether the first account becomes active. Do not silently select it in the frontend.
3. **Retrieve details by account ID and campus:** enforce ownership and return masked bank data, IFSC/branch/type/UTR status and authoritative activation state. Never use masked strings as writable account numbers.
4. **Activate an existing account:** verify campus ownership/eligibility and atomically persist the applicable campus configuration's active bank-account ID. Enforce at most one active account under concurrent requests, retain an audit record, and return state that can be independently reloaded. A UI selection is not activation.
5. **Optional safe update:** define explicit bank-field patch semantics and account-number replacement/preservation. Omitted number preserves the stored number; masked placeholders are rejected. Define concurrency/version checks so edits cannot overwrite another administrator's changes. Deletion is outside this task.
6. **Payment integration:** expose the authoritative active account through a safe instructions contract for supported offline payments. Preserve the receiving account ID/snapshot with the UTR/payment so later activation does not change historical instructions or reconciliation. Enforce campus/account association on the server. Reconcile the legacy single bank fields with this active-account model rather than maintain conflicting sources of truth.
7. **Provider boundaries:** a bank-account activation must not rewrite UPI destinations or Razorpay settlement credentials. Any linkage requires an explicit verified bank/provider mapping and separate authorization. Provider onboarding remains external to this UI.

**Current payment integration:** neither Admin UTR submission nor Accountant manual collection supplies a receiving bank-account ID. Admin QR uses the backend's student-campus UPI/provider configuration; Razorpay uses its merchant credentials. No active receiving-account integration or persistence is claimed. Payment screens were deliberately left unchanged until an authoritative active-account contract is available.

**Verification:** focused component tests cover saved-data-only counts, zero-to-one after acknowledged save/reload, masked cards/details, view selection without writes or draft loss, disabled unsupported controls, failed refresh hiding stale data, separate campus details and masked-value replay prevention. Existing tab-save/permission/campus/payment regressions remain in the same test suite. These are test harness checks, not live account creation, activation, payment routing or native-browser visual verification.

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

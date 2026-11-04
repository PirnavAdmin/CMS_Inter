# Super Admin module

Local frontend implementation, following the existing `modules/admin/Admin*/Page.jsx` and adjacent CSS organization. `SuperAdminDashboard`, `SuperAdminColleges`, `SuperAdminSubscriptions`, `SuperAdminAccess`, `SuperAdminPlatform` and `SuperAdminLogin` own their page styles; `layout` and `components` contain shared portal presentation.

## Run locally

1. Configure ignored `.env.local` with `VITE_ENABLE_SUPER_ADMIN_PREVIEW=true`, `VITE_SUPER_ADMIN_PREVIEW_EMAIL` and `VITE_SUPER_ADMIN_PREVIEW_PASSWORD_SHA256` (the SHA-256 hex digest of your chosen preview password). Do not commit credentials. The hash comparison is a local preview gate, not a production authentication mechanism.
2. Restart `npm run dev` after changing environment values.
3. Open `/super-admin/preview-login` or use the configured preview credentials on `/login`.
4. Dashboard: `/super-admin/dashboard`.
5. Logout ends the preview session. Tab session storage retains preview changes across refreshes. Clear `pirnav-super-admin-preview-data-v1` from session storage to reset the dataset.

The preview is gated by both `import.meta.env.DEV` and the opt-in variable. Production builds cannot create or restore preview sessions. The preview does not generate a JWT, change normal auth storage, call protected APIs, send invitations, process money or create backend accounts. Its eight-hour session and dataset use separate session-storage keys. All sample data is labelled. Existing Admin, Student and Faculty routes remain in place.

## Implemented preview flows

- Sidebar navigation, responsive layout, existing CMS theme tokens and theme toggle.
- Dashboard counts/charts computed from preview records, not fixed headline totals.
- College creation, detail view, edit, approval, activation and deactivation.
- New colleges receive the Free plan. College Admin preview records can be created without plaintext passwords or email delivery.
- Configurable plan prices, account limits, module inclusion, assignment, renewal and cancellation; changes are logged in preview activity.
- Global user search, college/role/status filters and read-only details. User edit and activation/deactivation controls are disabled until an authorized platform API is integrated; no frontend-only account status mutation is performed. Distinct, active, login-enabled account counting remains in place for subscription usage.
- Payments/invoices, permission-scope reference, module-access matrix, notification drafts, profile, global settings and activity views.
- Backend-authenticated users with an unexpired JWT containing exactly `SuperAdmin` or `Super Admin` route to the platform workspace. Without verified platform APIs this workspace is empty, with writes disabled. Ordinary roles do not gain platform access through the normal session.

## Repository inspection and backend gap

The sibling `Backend/src/CollegeManagement.API` was inspected read-only. `AuthController`, `AuthService`, `Role`, `User` and `AppDbContext` already recognize authentication/roles, including some `Super Admin` handling. No complete college-tenant/subscription platform implementation was identified in these inspected controllers/models/context. College fee payments must not be reused as platform subscription payments.

Existing `/api/Auth/login` (through the existing login service), auth storage, routing, Lucide components and theme system are reused. No platform endpoint paths were invented. No backend/database files or seeds were changed; the UI preview makes no new backend requests.

Backend work still required before production use:

1. Confirm/standardize platform role claims; securely bootstrap a platform account using deployment secrets, a password hash, idempotent seeding, password rotation and MFA where supported.
2. Model independent college tenants and enforce tenant authorization on every data operation. Campus IDs alone are not college-tenant isolation.
3. Implement and document authorized college registration/admin-invitation, plan/subscription/history, unique login-account usage, renewal, payments/invoices and platform-audit/settings APIs.
4. Enforce account limits transactionally in backend activation paths; exclude disabled, non-login and platform accounts and count multi-role accounts once.
5. Enforce distinct platform and college permission scopes, including prevention of custom-role privilege escalation.
6. Provide real audit persistence, signed invitation delivery, billing/payment verification and backend authorization tests.

Real Super Admin credential login, tenant isolation, invitations, subscriptions and billing have not been end-to-end verified. Frontend preview behavior must not be represented as completion of those backend phases.

## Validation performed

- Production Vite build passed (existing bundle/import warnings remain).
- Vite-loaded module tests passed for valid/invalid preview login, session restore/logout and separation from normal JWT storage.
- Ordinary Admin, Student, Faculty and similarly named non-platform roles were rejected by the platform session resolver; the exact Super Admin claim was accepted.
- Production-mode module checks rejected both preview login and stored preview sessions. Production artifacts did not contain the configured preview email or plaintext password.
- All 19 portal routes rendered through React server rendering with the sidebar and preview banner.
- Unique-account counting, Free plan capacity, inactive-account exclusion, inactive-college rejection and upgrade behavior passed focused assertions.
- Real backend login and existing-portal end-to-end regression testing have not been performed.

## Super Admin UI enhancement

Modified existing files only:

- `layout/SuperAdminLayout.jsx` / `.css`: reuse the shared Admin shell and olive palette, College logo, navigation/header tokens, compact typography, responsive sidebar and focus states. The shell is bounded to the viewport; only main content and sidebar navigation scroll vertically. Cards/tables do not have fixed-height vertical scroll containers. Tables retain horizontal scrolling on narrow screens.
- `components/SuperAdminTable.jsx` / `.css`: reuse shared Admin Pagination and SkeletonRow components, five rows per page, common badge classes, aligned toolbar/filter controls, compact table spacing, hover states and search/empty/error presentation.
- `SuperAdminDashboard/DashboardPage.jsx` / `.css`: greeting, updated time, preview refresh, eight colored summary cards following Admin KPI styling, existing Recharts components for registrations/subscriptions/revenue, account usage, renewals and activities. Chart animations are disabled to keep data immediately readable.
- `SuperAdminAccess/AccessPage.jsx` / `.css`: search plus college/role/status filters, role chips, account badges and Admin-style icon controls. View opens the existing shared Modal with user details and keyboard focus handling. Protected user identity and status are not editable without verified backend support.
- `SuperAdminProvider.jsx`: browser-preview refresh without resetting college/subscription changes; removed frontend-only user activation/deactivation.

No Admin/Student/Faculty components, global styles, authentication rules, route definitions or backend endpoints were changed for this enhancement.

### Browser validation

Hidden Chrome tested the local development preview at 1440×1000, 1024×768 and 390×844. Tests covered login, all 19 sidebar destinations, refresh/session restoration, user search, college/role/status filtering, page reset and five-row pagination, user details, disabled unauthorized writes, light/dark olive palettes, mobile menu and table scrolling.

Dashboard measurements confirmed one main content scroller, zero nested vertical content scrollers, no browser scrollbar alongside the main scroller, eight KPI cards and the olive primary token `#617800`. Mobile checks confirmed no horizontal page overflow and horizontal scrolling confined to the table. Browser runtime exceptions: zero. Production build passed; existing bundle-size/dynamic-import warnings remain. Backend requests were blocked during these preview-only UI tests; this is not verification of real platform APIs.

## Navbar alignment, 3D icons and analytics refinement

Files changed for this refinement:

- `layout/SuperAdminLayout.jsx` / `.css`: one shared header-height variable for logo and navbar; vertically centered controls; desktop expanded/collapsed sidebar; independent mobile drawer. Reuses the existing `ThreeDIcon` component/assets with compact raised gradient icon containers. Sidebar icon labels stay accessible when collapsed.
- `SuperAdminDashboard/DashboardPage.jsx` / `.css`: preserves eight KPI totals and adds differentiated raised Lucide icons. The registration chart combines monthly bars with a cumulative registered-college growth line. Free/paid donut includes total and percentages. Revenue axes/tooltips use INR. A horizontal account-usage chart includes actual used/limit counts, percentage labels and 80%/100% warnings. Plan distribution is derived only from configured plans. No active-college history is fabricated from present-day status.
- `SuperAdminColleges/CollegesPage.jsx`, `SuperAdminSubscriptions/SubscriptionsPage.jsx`, `SuperAdminAccess/AccessPage.jsx`, `SuperAdminPlatform/PlatformPage.jsx`: reuse the same 3D page-title treatment. The college modal effect now depends directly on its open state to satisfy lint without moving focus while typing.

Browser checks measured identical header bottom coordinates in both desktop sidebar states (60.46875px at a 1440px viewport), and identical 56px edges at tablet/mobile widths. Sidebar widths measured 218px expanded and 70px collapsed. All five chart panels, 19 routes, icon image loading, mobile drawer, light/dark mode, refresh and overflow checks passed with zero runtime exceptions. No nested dashboard vertical scrollers or duplicate browser scrollbar were found. Scoped Super Admin lint passed without warnings. The production build passed with existing project bundle/import warnings.

Authentication, authorization, backend endpoints and existing college/subscription state integration were not changed for this refinement. All analytics remain clearly labelled preview data where applicable.

## Current consolidation and Admin icon matching

Payments and Invoices now share one `Payments & Invoices` sidebar destination at `/super-admin/payments-invoices` (16 sidebar destinations total). Both former screens displayed the same payment records and columns, so the combined screen retains that table, search and pagination. Legacy `/payments` and `/invoices` URLs redirect to the combined module. No billing data or backend integration changed.

- The sidebar now has 17 destinations. Dashboard includes the existing analytics; `/super-admin/analytics` redirects to `/super-admin/dashboard`.
- Roles & Permissions is available at `/super-admin/roles-permissions`, with System Roles and Permissions tabs. Legacy `/roles` and `/permissions` links redirect to the corresponding tab. The selected tab and permission-role selection persist in the URL.
- The role table retains search and pagination. The permission reference uses existing module/action definitions, labels unconnected grants explicitly, and provides no permission editing without a verified backend contract.
- Dashboard summary cards now reuse the existing Admin `ThreeDIcon` image assets, with compact horizontal cards. Sidebar and page-title icons show the original assets without raised icon tiles.
- Existing files modified: `SuperAdminPortalRoutes.jsx`, `layout/SuperAdminLayout.jsx` and `.css`, `SuperAdminAccess/AccessPage.jsx` and `.css`, `SuperAdminDashboard/DashboardPage.jsx` and `.css`, and this README.

Validation: scoped ESLint and production build passed. Headless Chrome verified 17 sidebar destinations, eight summary cards, five chart panels, icon loading, role search/pagination, both tabs, refresh persistence, three legacy redirects, mobile overflow and dark mode, with zero runtime exceptions. Tab and role changes issued no API requests. Preview browser checks do not verify real backend permission grants.

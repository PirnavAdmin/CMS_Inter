# Accountant Dashboard organization

Prefer one primary JSX file per screen, one Accountant service module, and one organized test file. Ongoing editing instructions are in [AGENTS.md](AGENTS.md).

## Current cleanup

The worktree was clean before consolidation. File count changed from 44 to 33, including this README and the scoped AGENTS.md. Existing runtime behavior, endpoint contracts, calculations, validation, routes and styles were preserved.

## Original structure

```text
AccountantDashboard/
  AccountantDashboard.css
  AccountantDashboard.jsx
  AccountantPortalRoutes.jsx
  README.md
  __tests__/
    accountantData.test.js
    accountantFeeLedger.test.js
    accountantFeeRequests.test.js
    accountantFeeSetup.test.js
    accountantLeaveStats.test.js
    accountantPayrollPagination.test.js
    accountantProfileData.test.js
    accountantProfileEditing.test.js
    accountantProfileWorkflow.test.js
    feeViewData.test.js
  api/
    accountantFeeRequests.js
  components/
    AccountantFeeOverview.jsx
    AccountantFeeSetupModal.jsx
    AccountantFeeUI.jsx
    AccountantPayrollRecords.css
    AccountantPayrollRecords.jsx
    AccountantProfile.css
    AccountantProfileContent.jsx
    AccountantProfilePhotoActions.jsx
    AccountantProfilePhotoEditor.jsx
  layout/
    AccountantLayout.jsx
    AccountantNavbar.jsx
    AccountantSidebar.jsx
  pages/
    AccountantFeeManagement.css
    AccountantFeeManagement.jsx
    AccountantHolidays.css
    AccountantHolidays.jsx
    AccountantLeave.css
    AccountantLeave.jsx
    AccountantMyAttendance.css
    AccountantMyAttendance.jsx
    AccountantPages.jsx
  services/
    accountantData.js
    accountantFeeLedger.js
    accountantFeeSetup.js
    accountantHolidayData.js
  utils/
    accountantLeaveStats.js
    accountantProfileData.js
    accountantProfileEditing.js
    feeViewData.js
```

## Updated structure

```text
AccountantDashboard/
  AGENTS.md
  AccountantDashboard.css
  AccountantDashboard.jsx
  AccountantPortalRoutes.jsx
  README.md
  components/
    AccountantFeeOverview.jsx
    AccountantFeeSetupModal.jsx
    AccountantProfile.css
    AccountantProfilePhotoActions.jsx
    AccountantProfilePhotoEditor.jsx
    AccountantUI.jsx
  layout/
    AccountantLayout.jsx
    AccountantNavbar.jsx
    AccountantSidebar.jsx
  pages/
    AccountantAttendanceImpact.jsx
    AccountantFeeManagement.css
    AccountantFeeManagement.jsx
    AccountantHolidays.css
    AccountantHolidays.jsx
    AccountantLeave.css
    AccountantLeave.jsx
    AccountantMyAttendance.css
    AccountantMyAttendance.jsx
    AccountantPages.jsx
    AccountantPayments.jsx
    AccountantPayroll.jsx
    AccountantProfile.jsx
    AccountantReports.jsx
  services/
    accountantService.js
  tests/
    accountantDashboard.test.js
  utils/
    accountantLeaveStats.js
    accountantProfileData.js
    feeViewData.js
```

## Consolidation mapping

| Original files or sections | Destination |
| --- | --- |
| `pages/AccountantPages.jsx` screen implementations | `pages/AccountantPayments.jsx`, `AccountantPayroll.jsx`, `AccountantAttendanceImpact.jsx`, `AccountantReports.jsx`, `AccountantProfile.jsx` |
| Existing `AccountantPages.jsx` exported names | Retained as compatibility re-exports; route configuration and Dashboard imports remain compatible |
| `AccountantPages.jsx` display adapters and shared hooks | `services/accountantService.js`; both existing loading-hook behaviors are preserved under distinct names |
| `AccountantPages.jsx` shared PageState | `components/AccountantUI.jsx` |
| `components/AccountantPayrollRecords.jsx` | Internal component in `pages/AccountantPayroll.jsx` |
| `components/AccountantPayrollRecords.css` | Unchanged rules appended to existing `AccountantDashboard.css` |
| `components/AccountantProfileContent.jsx` | Internal component/helpers in `pages/AccountantProfile.jsx` |
| `utils/accountantProfileEditing.js` | Existing `utils/accountantProfileData.js` |
| `components/AccountantFeeUI.jsx` | `components/AccountantUI.jsx`, now also serving other screens |
| `services/accountantData.js` | `services/accountantService.js` |
| `api/accountantFeeRequests.js` | `services/accountantService.js` |
| `services/accountantFeeLedger.js` | `services/accountantService.js` |
| `services/accountantFeeSetup.js` | `services/accountantService.js` |
| `services/accountantHolidayData.js` | `services/accountantService.js` |
| `__tests__/accountantData.test.js` | `tests/accountantDashboard.test.js` with isolated feature suites |
| `__tests__/accountantFeeLedger.test.js` | `tests/accountantDashboard.test.js` with isolated feature suites |
| `__tests__/accountantFeeRequests.test.js` | `tests/accountantDashboard.test.js` with isolated feature suites |
| `__tests__/accountantFeeSetup.test.js` | `tests/accountantDashboard.test.js` with isolated feature suites |
| `__tests__/accountantLeaveStats.test.js` | `tests/accountantDashboard.test.js` with isolated feature suites |
| `__tests__/accountantPayrollPagination.test.js` | `tests/accountantDashboard.test.js` with isolated feature suites |
| `__tests__/accountantProfileData.test.js` | `tests/accountantDashboard.test.js` with isolated feature suites |
| `__tests__/accountantProfileEditing.test.js` | `tests/accountantDashboard.test.js` with isolated feature suites |
| `__tests__/accountantProfileWorkflow.test.js` | `tests/accountantDashboard.test.js` with isolated feature suites |
| `__tests__/feeViewData.test.js` | `tests/accountantDashboard.test.js` with isolated feature suites |

## Removed superseded files

- `__tests__/accountantData.test.js`
- `__tests__/accountantFeeLedger.test.js`
- `__tests__/accountantFeeRequests.test.js`
- `__tests__/accountantFeeSetup.test.js`
- `__tests__/accountantLeaveStats.test.js`
- `__tests__/accountantPayrollPagination.test.js`
- `__tests__/accountantProfileData.test.js`
- `__tests__/accountantProfileEditing.test.js`
- `__tests__/accountantProfileWorkflow.test.js`
- `__tests__/feeViewData.test.js`
- `api/accountantFeeRequests.js`
- `components/AccountantFeeUI.jsx`
- `components/AccountantPayrollRecords.css`
- `components/AccountantPayrollRecords.jsx`
- `components/AccountantProfileContent.jsx`
- `services/accountantData.js`
- `services/accountantFeeLedger.js`
- `services/accountantFeeSetup.js`
- `services/accountantHolidayData.js`
- `utils/accountantProfileEditing.js`

## Retained boundaries

- The dashboard entry, route configuration, navbar, sidebar and layout remain in place.
- Each primary screen owns its small, screen-specific JSX. `AccountantPages.jsx` is a compatibility export file rather than a large multi-screen implementation.
- Camera capture and photo crop dialogs remain separate: they manage media streams, canvas transforms, async uploads and cleanup independently.
- Fee overview and setup components remain separate because they contain chart/subtab loading and multiple permission-aware editor forms. Shared UI primitives are kept in `AccountantUI.jsx`.
- Existing large page stylesheets and `components/AccountantProfile.css` remain separate. Only the six payroll pagination rules were merged into the existing dashboard stylesheet; their selector bodies were preserved.
- `utils/feeViewData.js` remains shared by fee views/services. Leave eligibility/quota logic stays in its pure utility module for independent testing. Profile pure helpers now share one existing module.
- Global/shared API clients and feature services retain their project ownership. The Accountant service reuses the existing payroll, report, attendance and reimbursement integrations; screen-specific profile/leave workflows stay with their primary JSX.
- No empty folders or compatibility service wrappers were introduced. The empty superseded `api/` and `__tests__/` folders were removed.

## Imports and tests

Updated Accountant-local imports, shared helper imports, service imports, SSR module paths and source-reading fixtures. Existing page export names and the portal entry path remain valid. No backend or other-dashboard files were changed.

All 85 existing test cases and all 349 assertions are retained. Tests are grouped into Fee Management, Payroll, Profile, Leave and Attendance suites. Existing fee-view cases continue checking Accountant sidebar destinations and route links. There were no pre-existing automated holiday-specific cases; holiday code is covered by the implementation-transfer and build checks.

Baseline before cleanup: 85 tests, 83 pass, 2 fail. The pre-existing failures are `display adapters use backend payroll and fee fields without inventing missing values` (expects 45 but receives 0) and `personal attendance never queries the student or administrative staff register` (expects the old placeholder attendance screen). These assertions and existing application behavior were intentionally preserved.

Run from `Frontend/`:

```powershell
node --test src/Dashboard/AccountantDashboard/tests/accountantDashboard.test.js
npx eslint src/Dashboard/AccountantDashboard
npm run build
```

Final validation: production build and Accountant-directory ESLint passed. The consolidated suite runs all 85 tests in 11 suites: 83 pass and the same two baseline tests fail. Git whitespace checks, whole-app import-reference checks, and Accountant-local circular-dependency checks passed. Source-transfer checks confirm all primary screen bodies, original service bodies, route definitions, and 349 existing assertions were retained. No files outside Accountant Dashboard changed. Existing build warnings about large chunks and mixed static/dynamic imports remain.

No browser, real camera, or live API verification was performed. Test API adapters and UI harnesses use mocks; no real account was modified.

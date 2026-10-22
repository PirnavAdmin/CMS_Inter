# Accountant Dashboard folder refactor

This is a file organization refactor. Component logic, API contracts, validation, routes, CSS contents, and business calculations are preserved. The worktree was clean before the refactor.

## Original structure

```text
AccountantDashboard/
  AccountantDashboard.css
  AccountantDashboard.jsx
  AccountantFeeManagement.css
  AccountantHolidays.css
  AccountantLeave.css
  AccountantMyAttendance.css
  AccountantPortalRoutes.jsx
  AccountantProfile.css
  accountantData.js
  accountantData.test.js
  accountantFeeLedger.js
  accountantFeeLedger.test.js
  accountantFeeRequests.js
  accountantFeeRequests.test.js
  accountantFeeSetup.js
  accountantFeeSetup.test.js
  accountantHolidayData.js
  accountantLeaveStats.js
  accountantLeaveStats.test.js
  accountantProfileData.js
  accountantProfileData.test.js
  accountantProfileEditing.js
  accountantProfileEditing.test.js
  accountantProfileWorkflow.test.js
  feeViewData.js
  feeViewData.test.js
  layout/
    AccountantLayout.jsx
    AccountantNavbar.jsx
    AccountantSidebar.jsx
  pages/
    AccountantFeeManagement.jsx
    AccountantFeeOverview.jsx
    AccountantFeeSetupModal.jsx
    AccountantFeeUI.jsx
    AccountantHolidays.jsx
    AccountantLeave.jsx
    AccountantMyAttendance.jsx
    AccountantPages.jsx
    AccountantProfileContent.jsx
    AccountantProfilePhotoActions.jsx
    AccountantProfilePhotoEditor.jsx
```

## Updated structure

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

## Complete move mapping

All paths below are relative to this directory.

| Original path | New path |
| --- | --- |
| `accountantFeeRequests.js` | `api/accountantFeeRequests.js` |
| `accountantData.js` | `services/accountantData.js` |
| `accountantFeeSetup.js` | `services/accountantFeeSetup.js` |
| `accountantFeeLedger.js` | `services/accountantFeeLedger.js` |
| `accountantHolidayData.js` | `services/accountantHolidayData.js` |
| `feeViewData.js` | `utils/feeViewData.js` |
| `accountantLeaveStats.js` | `utils/accountantLeaveStats.js` |
| `accountantProfileData.js` | `utils/accountantProfileData.js` |
| `accountantProfileEditing.js` | `utils/accountantProfileEditing.js` |
| `pages/AccountantFeeOverview.jsx` | `components/AccountantFeeOverview.jsx` |
| `pages/AccountantFeeSetupModal.jsx` | `components/AccountantFeeSetupModal.jsx` |
| `pages/AccountantFeeUI.jsx` | `components/AccountantFeeUI.jsx` |
| `pages/AccountantProfileContent.jsx` | `components/AccountantProfileContent.jsx` |
| `pages/AccountantProfilePhotoActions.jsx` | `components/AccountantProfilePhotoActions.jsx` |
| `pages/AccountantProfilePhotoEditor.jsx` | `components/AccountantProfilePhotoEditor.jsx` |
| `AccountantProfile.css` | `components/AccountantProfile.css` |
| `AccountantFeeManagement.css` | `pages/AccountantFeeManagement.css` |
| `AccountantHolidays.css` | `pages/AccountantHolidays.css` |
| `AccountantLeave.css` | `pages/AccountantLeave.css` |
| `AccountantMyAttendance.css` | `pages/AccountantMyAttendance.css` |
| `accountantData.test.js` | `__tests__/accountantData.test.js` |
| `accountantFeeLedger.test.js` | `__tests__/accountantFeeLedger.test.js` |
| `accountantFeeRequests.test.js` | `__tests__/accountantFeeRequests.test.js` |
| `accountantFeeSetup.test.js` | `__tests__/accountantFeeSetup.test.js` |
| `accountantLeaveStats.test.js` | `__tests__/accountantLeaveStats.test.js` |
| `accountantProfileData.test.js` | `__tests__/accountantProfileData.test.js` |
| `accountantProfileEditing.test.js` | `__tests__/accountantProfileEditing.test.js` |
| `accountantProfileWorkflow.test.js` | `__tests__/accountantProfileWorkflow.test.js` |
| `feeViewData.test.js` | `__tests__/feeViewData.test.js` |

## Responsibilities and preserved boundaries

- `api/`: existing fee request helpers and response checking.
- `services/`: finance data loaders/hooks, fee setup workflows, ledger access, and holiday loading. Mixed-purpose modules remain intact to preserve behavior.
- `utils/`: pure fee-view, leave-quota, and profile mapping/validation/payload helpers.
- `components/`: fee overview/setup/UI and profile content/photo dialogs, plus their existing profile stylesheet.
- `pages/`: route-level modules and their existing stylesheets. `AccountantPages.jsx` retains its existing exports and helpers.
- `layout/`: existing layout/navbar/sidebar, unchanged.
- `__tests__/`: all nine existing test files, with paths updated.
- Root entry, portal routes, and dashboard stylesheet remain unchanged. Existing shared Student components, global contexts, API clients, and assets retain their original ownership. No empty assets/context directories were added.

## Import updates

Updated relative imports, re-exports, stylesheet imports, Vite SSR test paths, and source-file URLs. Five unmoved page modules needed path substitutions: `pages/AccountantFeeManagement.jsx`, `pages/AccountantPages.jsx`, `pages/AccountantMyAttendance.jsx`, `pages/AccountantLeave.jsx`, and `pages/AccountantHolidays.jsx`. No imports outside Accountant Dashboard needed changes; the AppRoutes entry path is unchanged.

## Verification

- Replacements were copied and checked before originals were removed.
- Source audit confirms only file-path literals changed; CSS contents are byte-identical.
- Accountant-local module graph resolves without circular dependencies.
- Production build: passed; existing dynamic-import and large-chunk warnings remain.
- Accountant-directory ESLint: passed.
- Existing tests before refactor: 81 total, 79 passed, 2 failed.
- Existing tests after refactor: 81 total, 79 passed, the same 2 failed.
- Pre-existing failures: `display adapters use backend payroll and fee fields without inventing missing values` (expected 45, received 0), and `personal attendance never queries the student or administrative staff register` (expects the old placeholder attendance implementation). These tests and application behavior were preserved.
- Existing tests cover registered sidebar destinations and dashboard/nested route links; they continue passing.
- Git whitespace check: passed; no files outside this dashboard changed.
- Live browser/backend interactions were not tested. No real account/API mutations were performed.

Run tests from `Frontend/` using `node --test src/Dashboard/AccountantDashboard/__tests__/*.test.js`. On PowerShell versions without wildcard argument expansion, pass the FullName values from `Get-ChildItem` instead.

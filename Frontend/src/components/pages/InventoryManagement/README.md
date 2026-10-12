# Inventory Management demo

Open **Academic → Inventory Management** as an administrator. The protected route is
`/dashboard/inventory-management`; its seven navigation links use normal React Router
URLs, including browser back/forward and direct links to `/items`, `/stock-in`,
`/stock-out`, `/suppliers`, `/categories`, and `/reports`.

All inventory changes are local. The module uses the existing dashboard shell,
authentication user, theme variables, Lucide icons, Recharts, shared tables, fields,
modals, confirmation dialogs, toasts, and the installed Excel/PDF export utilities.
It does not call inventory APIs or alter authentication storage.

## Files

Created in this directory:

- `InventoryManagementPage.jsx` and `InventoryManagement.css`: module entry,
  navigation, local state, actions and responsive theme styling.
- `data/inventoryMockData.js`: the sample dataset and lookup options.
- `inventoryModel.js`, `inventoryFields.js`, `inventoryReports.js` and
  `inventoryCsv.js`: stock rules, form definitions, reporting and CSV encoding.
- `components/InventoryScreens.jsx`, `components/InventoryForm.jsx`,
  `components/InventoryDetails.jsx` and `components/InventoryUi.jsx`: screens,
  reusable forms, details/ledgers and adapters for existing common components.
- `inventoryModel.test.js` and `inventoryRender.test.js`: model and render tests.
- `README.md`: operation, file inventory, rules and verification notes.

The only existing files changed are `src/routes/AppRoutes.jsx` (the lazy protected
route) and `src/components/layout/DashboardLayout.jsx` (the Academic menu entry
and Boxes icon import).

## Workflows

- Add/edit items, suppliers and categories with inline validation, unique codes,
  non-negative quantities/costs, required fields, and form reset/cancel.
- Receive stock from active suppliers; issue stock to college recipients with
  department, purpose, condition and optional return details.
- View item details and dated ledgers, movement details, supplier histories and
  category inventories. Item ledgers include opening stock and chronological
  running balances, including corrections and returns.
- Search, filter and paginate records. Reset Filters also clears table search.
  Refresh recalculates from current local data and retains the active filters.
- Switch among eight reports and explicitly apply date/entity filters. CSV exports
  include all currently filtered rows, excluding action controls. The shared table
  **Export** menu provides Excel, PDF and clean browser printing. Printing supports
  saving as PDF and excludes dashboard navigation and action columns.
- Deactivate referenced items, suppliers or categories with confirmation. Only
  items with zero stock and no transaction history can be deleted. Reactivation
  is available through Edit → Status. Inactive references remain visible in history.
- Reverse the latest unreturned posted movement for an item with confirmation.
  A compensating movement adjusts quantity and value; original posted quantities
  and costs remain unchanged. Earlier movements cannot be reversed if later
  movements exist. Correction/return records cannot themselves be reversed.
- Record an explicit full return of a returnable issue. Expected return dates do
  not add stock. Partial returns are not supported in this demo.
- Confirm **Reset Demo Data** to restore 22 items, 15 categories, 5 suppliers and
  18 reconciled movements. Purchase orders are not modeled; Pending Orders shows
  zero with an explanation.

## Calculations and persistence

Receipts use moving weighted-average valuation:
`new cost = (available stock value + receipt value) / new quantity`.
Issues use the current average cost and retain it in their immutable transaction
record. Returns use the original issue cost. Reversals undo the original posted
value. Backdating before an item's latest movement is rejected to protect costs
and chronological balances. Opening quantities and opening costs are immutable
after item creation; subsequent balance changes use stock transactions.

Stock reports use balances as of Date To and opening balances before Date From.
An item created within the period contributes its initial quantity to received
stock. Category values and low-stock reports use those same balances. Movement
Type filters the item scope in balance reports, while complete movements still
determine each balance. Department/supplier filters use the owning department and
preferred supplier for item balance reports, and transaction fields for movement
reports. Expiry/warranty date filters apply to the expiry/warranty date itself.
Purchase and issue reports omit reversed postings and corrections; the movement
report and ledger retain them. Returns remain visible as separate receipts.

Active items below their minimum, including zero-stock items, contribute to
low-stock alerts. Stock labels distinguish zero stock, positive stock below minimum,
and stock at or above minimum. Values use Indian rupee formatting.

Demo state loads and saves under `pirnav-inventory-demo-v1`. A refresh preserves
edits. Invalid saved data falls back to the initial dataset with a warning. A
storage failure blocks the mutation and shows an error, preventing unsaved changes
from appearing successful. This is a single-browser demo, without multi-tab or
multi-user synchronization.

## Verification

From the frontend directory:

```text
node --test src/components/pages/InventoryManagement/inventoryModel.test.js src/components/pages/InventoryManagement/inventoryRender.test.js
node node_modules/eslint/bin/eslint.js src/components/pages/InventoryManagement src/routes/AppRoutes.jsx src/components/layout/DashboardLayout.jsx
npm.cmd run build
```

The tests cover business rules, value and quantity reconciliation, dated reports,
CSV encoding, storage isolation/reset, and server rendering of every screen, form
and detail view. Server rendering is a smoke test; it does not replace checking
clicks, downloads, browser history, dialog focus, print dialogs, responsive layouts
and light/dark appearance in a real authenticated browser.

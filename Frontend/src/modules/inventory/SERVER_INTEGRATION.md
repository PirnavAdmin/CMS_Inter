# Inventory user portal — server integration and backend gaps

## Connected to existing APIs

- Login uses the normal authentication API and shared token storage. No fixed
  password or mock session bypass remains. Inventory roles (including Inventory
  Manager), Store Manager, and Storekeeper route to `/inventory-dashboard`.
- Admin and employee portals share `/api/v1/inventory` lists, item/category/
  supplier mutations, Stock In/Out, uploaded receipts, movement detail, ledger,
  reversals, returns, and reports. Changes appear after refresh; the user portal
  also reloads every 30 seconds while visible and on window focus.
- Employee profile is read from GET `/api/v1/staff/{staffId}`.
- Leave categories: GET `/api/v1/leave-categories`.
- Applications: GET/POST `/api/v1/staff-attendance/leave`, with authenticated StaffId.
- Aggregate leave balance: GET `/api/v1/staff-attendance/leave/history/staff/{staffId}`.
- Payslips: GET `/api/v1/Payroll/payslips?search={employeeCode}`, detail, and PDF.
  Responses are filtered/checked against the session StaffId; another employee's
  payslip is not displayed or downloaded by this frontend.

No sample stock, salary, leave entitlements, or employee records are substituted
when an API fails. No inventory data is saved to browser storage. Errors are
shown separately so payroll/leave failures do not hide working stock records.
The layout and screen controls are preserved, with accurate loading/error text.

## Required backend work

1. Provision an actual inventory account through the normal auth system. Return
   the correct Inventory role, StaffId, and employee code. The old demo password
   only works if an account with those credentials is created on the server.
2. Permit the Inventory role to use inventory APIs and the appropriate staff
   profile, leave-category, leave-history/application, and payroll read/PDF APIs.
   The local LeaveManagementController currently excludes Inventory and also
   requires staff-leave-management permission. Enforce employee ownership on
   the server; frontend filtering is not an authorization boundary.
3. Add self-service leave cancellation. The existing leave action API is for
   approval/rejection and its enum does not include Cancelled. Do not repurpose
   approval privileges for an employee Cancel button.
4. Provide per-category/year leave entitlements, used, pending, and remaining
   balances. Existing history provides an aggregate balance only. The portal
   displays the aggregate and shows category entitlement as unavailable.
5. Provide inventory purchase-order list/create/cancel/receipt-tracking APIs.
   No matching endpoints were supplied. The screen remains, but cannot create
   or pretend to save local orders.
6. Provide a safe self-service profile endpoint for name/phone changes. The
   administrative full staff PUT is not used to overwrite an employee record
   from the small profile form.
7. Provide employee notification/read-all/read-one and preference GET/PUT APIs.
   Current alerts derive from server stock levels; marking an alert read lasts
   only for the current page session and is labeled as such. Preferences cannot
   be saved until supported. No local mock preferences are persisted.
8. Payroll must generate actual monthly payslips for the employee. Salary setup
   alone does not supply a payslip. Protect list/detail/PDF by employee identity.

No backend files were edited. Live verification was blocked because the current
configured ngrok server returned ERR_NGROK_3200 (offline). Restore that server
or provide its replacement URL, then verify authenticated reads and writes.
Do not call the integration fully operational until permissions, missing
services, and employee ownership have been verified on the deployed backend.

# Inventory user portal

Route: `/inventory-dashboard`. Sign in through the normal `/login` page with a server-provisioned Inventory account. The former hardcoded demo credentials and mock datasets have been removed.

The original screens and layout are preserved. Inventory records share the admin inventory APIs; employee leave, profile, and payslips use the existing staff/payroll services. No sample data replaces failed requests.

See [SERVER_INTEGRATION.md](./SERVER_INTEGRATION.md) for connected endpoints, required Inventory-role permissions, missing purchase order/cancellation/preferences APIs, and live-server verification requirements.

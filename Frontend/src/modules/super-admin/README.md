# Super Admin

The Super Admin portal uses backend authentication and the `/api/v1/super-admin/*` APIs. It has no preview login or seeded/mock records.

## Sign in

1. Set `VITE_API_BASE_URL` in the frontend environment to the running backend URL and restart Vite.
2. Open `/login` and enter the Super Admin account credentials. The shared college login page submits credentials to the existing authentication API and routes verified Super Admin accounts to the platform dashboard.
3. The portal accepts a session only when the returned JWT is unexpired and contains a SuperAdmin role claim.

## Live data and actions

`SuperAdminProvider.jsx` loads bootstrap, dashboard, colleges, college admins, plans/subscriptions, usage, renewals, payments, module access, notifications, audit logs, settings and profile through `src/api/superAdminApi.js`. Writes call the corresponding API methods and refresh the live data after success. Failed requests are surfaced in the portal; the UI does not substitute fixture records.

If sign-in fails, check the backend URL, authentication response token/role claims and the account's SuperAdmin role. If an action fails, inspect its API response and required backend fields. Frontend code cannot fix missing database columns or backend-required fields.

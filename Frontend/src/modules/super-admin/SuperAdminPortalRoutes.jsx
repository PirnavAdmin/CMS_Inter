import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { getPlatformSession, previewEnabled } from "./superAdminSession.js";
import SuperAdminProvider from "./SuperAdminProvider.jsx";
import SuperAdminLayout from "./layout/SuperAdminLayout.jsx";
import DashboardPage from "./SuperAdminDashboard/DashboardPage.jsx";
import CollegesPage from "./SuperAdminColleges/CollegesPage.jsx";
import SubscriptionsPage from "./SuperAdminSubscriptions/SubscriptionsPage.jsx";
import AccessPage from "./SuperAdminAccess/AccessPage.jsx";
import PlatformPage from "./SuperAdminPlatform/PlatformPage.jsx";
import LoginPage from "./SuperAdminLogin/LoginPage.jsx";

function PlatformGate() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const session = getPlatformSession();
  if (!session) return <Navigate to="/super-admin/login" replace/>;
  return <SuperAdminProvider session={session}><Outlet/></SuperAdminProvider>;
}

export default function SuperAdminPortalRoutes() {
  return <Routes>
    <Route path="login" element={<LoginPage/>}/>
    <Route path="preview-login" element={<LoginPage/>}/>
    <Route element={<PlatformGate/>}><Route element={<SuperAdminLayout/>}>
      <Route index element={<Navigate to="dashboard" replace/>}/>
      <Route path="dashboard" element={<DashboardPage/>}/>
      <Route path="analytics" element={<Navigate to="/super-admin/dashboard" replace/>}/>
      <Route path="colleges" element={<CollegesPage/>}/>
      <Route path="registrations" element={<CollegesPage registrations/>}/>
      {["users", "college-admins"].map((section) => <Route key={section} path={section} element={<AccessPage key={section} section={section}/>}/>)}
      <Route path="roles-permissions" element={<AccessPage section="roles-permissions"/>}/>
      <Route path="roles" element={<Navigate to="/super-admin/roles-permissions?tab=roles" replace/>}/>
      <Route path="permissions" element={<Navigate to="/super-admin/roles-permissions?tab=permissions" replace/>}/>
      {["plans", "subscriptions", "account-usage", "renewals"].map((section) => <Route key={section} path={section} element={<SubscriptionsPage key={section} section={section}/>}/>)}
      {["modules", "notifications", "audit-logs", "settings", "profile"].map((section) => <Route key={section} path={section} element={<PlatformPage key={section} section={section}/>}/>)}
      <Route path="payments-invoices" element={<PlatformPage section="payments-invoices"/>}/>
      <Route path="payments" element={<Navigate to="/super-admin/payments-invoices" replace/>}/>
      <Route path="invoices" element={<Navigate to="/super-admin/payments-invoices" replace/>}/>
      <Route path="*" element={<Navigate to="/super-admin/dashboard" replace/>}/>
    </Route></Route>
  </Routes>;
}

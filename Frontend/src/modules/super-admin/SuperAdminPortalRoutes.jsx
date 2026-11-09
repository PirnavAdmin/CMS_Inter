import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { getPlatformSession } from "./superAdminSession.js";
import SuperAdminProvider from "./SuperAdminProvider.jsx";
import SuperAdminLayout from "./layout/SuperAdminLayout.jsx";
import DashboardPage from "./SuperAdminDashboard/DashboardPage.jsx";
import CollegesPage from "./SuperAdminColleges/CollegesPage.jsx";
import RegisterCollegePage from "./SuperAdminColleges/RegisterCollegePage.jsx";
import CollegeAdminsPage from "./SuperAdminAdmins/CollegeAdminsPage.jsx";
import AddCollegeAdminPage from "./SuperAdminAdmins/AddCollegeAdminPage.jsx";
import SubscriptionsPage from "./SuperAdminSubscriptions/SubscriptionsPage.jsx";
import CollegeSubscriptionsPage from "./SuperAdminSubscriptions/CollegeSubscriptionsPage.jsx";
import RenewalsPage from "./SuperAdminSubscriptions/RenewalsPage.jsx";
import SubscriptionPlansPage from "./SuperAdminSubscriptions/SubscriptionPlansPage.jsx";
import PlatformPage from "./SuperAdminPlatform/PlatformPage.jsx";
import AuditLogsPage from "./SuperAdminPlatform/AuditLogsPage.jsx";
import MyProfilePage from "./SuperAdminPlatform/MyProfilePage.jsx";
import GlobalSettingsPage from "./SuperAdminPlatform/GlobalSettingsPage.jsx";
import PaymentsInvoicesPage from "./SuperAdminPlatform/PaymentsInvoicesPage.jsx";

function PlatformGate() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const session = getPlatformSession();
  if (!session) return <Navigate to="/login" replace/>;
  return <SuperAdminProvider session={session}><Outlet/></SuperAdminProvider>;
}

export default function SuperAdminPortalRoutes() {
  return <Routes>
    <Route path="login" element={<Navigate to="/login" replace/>}/>
    <Route path="preview-login" element={<Navigate to="/login" replace/>}/>
    <Route element={<PlatformGate/>}><Route element={<SuperAdminLayout/>}>
      <Route index element={<Navigate to="dashboard" replace/>}/>
      <Route path="dashboard" element={<DashboardPage/>}/>
      <Route path="analytics" element={<Navigate to="/super-admin/dashboard" replace/>}/>
      <Route path="colleges" element={<CollegesPage/>}/>
      <Route path="college-management" element={<CollegesPage/>}/>
      <Route path="register-college" element={<RegisterCollegePage/>}/>
      <Route path="registrations" element={<Navigate to="/super-admin/colleges" replace/>}/>
      <Route path="college-admins" element={<CollegeAdminsPage/>}/>
      <Route path="admins" element={<Navigate to="/super-admin/college-admins" replace/>}/>
      <Route path="add-college-admin" element={<AddCollegeAdminPage/>}/>
      <Route path="users" element={<Navigate to="/super-admin/college-admins" replace/>}/>
      <Route path="global-users" element={<Navigate to="/super-admin/college-admins" replace/>}/>
      <Route path="roles-permissions" element={<Navigate to="/super-admin/college-admins" replace/>}/>
      <Route path="roles" element={<Navigate to="/super-admin/college-admins" replace/>}/>
      <Route path="permissions" element={<Navigate to="/super-admin/college-admins" replace/>}/>
      <Route path="subscriptions" element={<CollegeSubscriptionsPage/>}/>
      <Route path="college-subscriptions" element={<Navigate to="/super-admin/subscriptions" replace/>}/>
      <Route path="account-usage" element={<Navigate to="/super-admin/subscriptions" replace/>}/>
      <Route path="renewals" element={<RenewalsPage/>}/>
      <Route path="plans" element={<SubscriptionPlansPage/>}/>
      <Route path="subscription-plans" element={<Navigate to="/super-admin/plans" replace/>}/>
      <Route path="audit-logs" element={<AuditLogsPage/>}/>
      <Route path="profile" element={<MyProfilePage/>}/>
      <Route path="settings" element={<GlobalSettingsPage/>}/>
      <Route path="global-settings" element={<Navigate to="/super-admin/settings" replace/>}/>
      <Route path="modules" element={<PlatformPage section="modules"/>}/>
      <Route path="notifications" element={<Navigate to="/super-admin/dashboard" replace/>}/>
      <Route path="payments-invoices" element={<PaymentsInvoicesPage/>}/>
      <Route path="payments" element={<Navigate to="/super-admin/payments-invoices" replace/>}/>
      <Route path="invoices" element={<Navigate to="/super-admin/payments-invoices" replace/>}/>
      <Route path="*" element={<Navigate to="/super-admin/dashboard" replace/>}/>
    </Route></Route>
  </Routes>;
}

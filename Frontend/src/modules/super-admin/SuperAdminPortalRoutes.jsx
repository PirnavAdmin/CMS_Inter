import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { getPlatformSession } from "./superAdminSession.js";
import SuperAdminProvider from "./SuperAdminProvider.jsx";
import SuperAdminLayout from "./layout/SuperAdminLayout.jsx";

const DashboardPage = lazy(() => import("./SuperAdminDashboard/DashboardPage.jsx"));
const CollegesPage = lazy(() => import("./SuperAdminColleges/CollegesPage.jsx"));
const RegisterCollegePage = lazy(() => import("./SuperAdminColleges/RegisterCollegePage.jsx"));
const CollegeAdminsPage = lazy(() => import("./SuperAdminAdmins/CollegeAdminsPage.jsx"));
const AddCollegeAdminPage = lazy(() => import("./SuperAdminAdmins/AddCollegeAdminPage.jsx"));
const SubscriptionsPage = lazy(() => import("./SuperAdminSubscriptions/SubscriptionsPage.jsx"));
const CollegeSubscriptionsPage = lazy(() => import("./SuperAdminSubscriptions/CollegeSubscriptionsPage.jsx"));
const RenewalsPage = lazy(() => import("./SuperAdminSubscriptions/RenewalsPage.jsx"));
const SubscriptionPlansPage = lazy(() => import("./SuperAdminSubscriptions/SubscriptionPlansPage.jsx"));
const PlatformPage = lazy(() => import("./SuperAdminPlatform/PlatformPage.jsx"));
const AuditLogsPage = lazy(() => import("./SuperAdminPlatform/AuditLogsPage.jsx"));
const MyProfilePage = lazy(() => import("./SuperAdminPlatform/MyProfilePage.jsx"));
const GlobalSettingsPage = lazy(() => import("./SuperAdminPlatform/GlobalSettingsPage.jsx"));
const PaymentsInvoicesPage = lazy(() => import("./SuperAdminPlatform/PaymentsInvoicesPage.jsx"));

function SuperAdminPageFallback() {
  return <div className="sa-page-loading" role="status" aria-label="Loading Super Admin page">
    <span className="sa-skeleton sa-page-loading-title" />
    <span className="sa-skeleton sa-page-loading-description" />
    <div className="sa-page-loading-stats" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => <span className="sa-skeleton" key={index} />)}
    </div>
    <div className="sa-page-loading-panels" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => <span className="sa-skeleton" key={index} />)}
    </div>
    <span className="sa-skeleton sa-page-loading-table" aria-hidden="true" />
  </div>;
}

function SuperAdminPageBoundary() {
  return <Suspense fallback={<SuperAdminPageFallback/>}><Outlet/></Suspense>;
}

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
      <Route element={<SuperAdminPageBoundary/>}>
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
      </Route>
    </Route></Route>
  </Routes>;
}

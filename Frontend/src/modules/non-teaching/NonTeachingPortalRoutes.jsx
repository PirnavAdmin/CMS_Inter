import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import NonTeachingLayout from "./layout/NonTeachingLayout.jsx";
import ProtectedRoute from "@/routes/ProtectedRoute.jsx";

const NonTeachingDashboardHome = lazy(() => import("./pages/NonTeachingDashboardHome.jsx"));
const NonTeachingProfile = lazy(() => import("./pages/NonTeachingProfile.jsx"));
const NonTeachingAttendance = lazy(() => import("./pages/NonTeachingAttendance.jsx"));
const NonTeachingLeave = lazy(() => import("./pages/NonTeachingLeave.jsx"));
const NonTeachingTasks = lazy(() => import("./pages/NonTeachingTasks.jsx"));
const NonTeachingAnnouncements = lazy(() => import("./pages/NonTeachingAnnouncements.jsx"));
const NonTeachingPayslip = lazy(() => import("./pages/NonTeachingPayslip.jsx"));
const NonTeachingDepartment = lazy(() => import("./pages/NonTeachingDepartment.jsx"));
const NonTeachingSupport = lazy(() => import("./pages/NonTeachingSupport.jsx"));
const ReceptionistEnquiriesPage = lazy(() => import("./pages/ReceptionistEnquiriesPage.jsx"));

function PortalLoadingFallback() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "240px", color: "#64748b" }}>
      <div style={{ display: "inline-block", width: "24px", height: "24px", border: "2px solid #cbd5e1", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
      <span style={{ marginLeft: "12px", fontSize: "14px", fontWeight: 500 }}>Loading section...</span>
    </div>
  );
}

export default function NonTeachingPortalRoutes() {
  return (
    <Routes>
      <Route element={<NonTeachingLayout />}>
        <Route
          index
          element={
            <Suspense fallback={<PortalLoadingFallback />}>
              <NonTeachingDashboardHome />
            </Suspense>
          }
        />
        <Route
          path="overview"
          element={
            <Suspense fallback={<PortalLoadingFallback />}>
              <NonTeachingDashboardHome />
            </Suspense>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute requiredModule="profile">
              <Suspense fallback={<PortalLoadingFallback />}>
                <NonTeachingProfile />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="attendance"
          element={
            <ProtectedRoute requiredModule="staff-attendance" requiredScreen="my-attendance">
              <Suspense fallback={<PortalLoadingFallback />}>
                <NonTeachingAttendance />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="my-attendance" element={<Navigate to="/non-teaching-dashboard/attendance" replace />} />
        <Route
          path="leave"
          element={
            <ProtectedRoute requiredModule="staff-leave-management" requiredScreen="staff-leave">
              <Suspense fallback={<PortalLoadingFallback />}>
                <NonTeachingLeave />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="staff-leave" element={<Navigate to="/non-teaching-dashboard/leave" replace />} />
        <Route
          path="tasks"
          element={
            <ProtectedRoute requiredModule="dashboard">
              <Suspense fallback={<PortalLoadingFallback />}>
                <NonTeachingTasks />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="payslip"
          element={
            <ProtectedRoute requiredModule="payroll">
              <Suspense fallback={<PortalLoadingFallback />}>
                <NonTeachingPayslip />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="payslips" element={<Navigate to="/non-teaching-dashboard/payslip" replace />} />
        <Route
          path="announcements"
          element={
            <ProtectedRoute requiredModule="reports-analytics">
              <Suspense fallback={<PortalLoadingFallback />}>
                <NonTeachingAnnouncements />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="department"
          element={
            <ProtectedRoute requiredModule="department-designation">
              <Suspense fallback={<PortalLoadingFallback />}>
                <NonTeachingDepartment />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="support"
          element={
            <ProtectedRoute requiredModule="settings">
              <Suspense fallback={<PortalLoadingFallback />}>
                <NonTeachingSupport />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="enquiries"
          element={
            <ProtectedRoute requiredModule="enquiry-management">
              <Suspense fallback={<PortalLoadingFallback />}>
                <ReceptionistEnquiriesPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/non-teaching-dashboard" replace />} />
      </Route>
    </Routes>
  );
}

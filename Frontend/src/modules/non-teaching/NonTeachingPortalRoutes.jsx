import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import NonTeachingLayout from "./layout/NonTeachingLayout.jsx";

const NonTeachingDashboardHome = lazy(() => import("./pages/NonTeachingDashboardHome.jsx"));
const NonTeachingProfile = lazy(() => import("./pages/NonTeachingProfile.jsx"));
const NonTeachingAttendance = lazy(() => import("./pages/NonTeachingAttendance.jsx"));
const NonTeachingLeave = lazy(() => import("./pages/NonTeachingLeave.jsx"));
const NonTeachingTasks = lazy(() => import("./pages/NonTeachingTasks.jsx"));
const NonTeachingAnnouncements = lazy(() => import("./pages/NonTeachingAnnouncements.jsx"));
const NonTeachingPayslip = lazy(() => import("./pages/NonTeachingPayslip.jsx"));
const NonTeachingDepartment = lazy(() => import("./pages/NonTeachingDepartment.jsx"));
const NonTeachingSupport = lazy(() => import("./pages/NonTeachingSupport.jsx"));

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
            <Suspense fallback={<PortalLoadingFallback />}>
              <NonTeachingProfile />
            </Suspense>
          }
        />
        <Route
          path="attendance"
          element={
            <Suspense fallback={<PortalLoadingFallback />}>
              <NonTeachingAttendance />
            </Suspense>
          }
        />
        <Route path="my-attendance" element={<Navigate to="/non-teaching-dashboard/attendance" replace />} />
        <Route
          path="leave"
          element={
            <Suspense fallback={<PortalLoadingFallback />}>
              <NonTeachingLeave />
            </Suspense>
          }
        />
        <Route path="staff-leave" element={<Navigate to="/non-teaching-dashboard/leave" replace />} />
        <Route
          path="tasks"
          element={
            <Suspense fallback={<PortalLoadingFallback />}>
              <NonTeachingTasks />
            </Suspense>
          }
        />
        <Route
          path="payslip"
          element={
            <Suspense fallback={<PortalLoadingFallback />}>
              <NonTeachingPayslip />
            </Suspense>
          }
        />
        <Route path="payslips" element={<Navigate to="/non-teaching-dashboard/payslip" replace />} />
        <Route
          path="announcements"
          element={
            <Suspense fallback={<PortalLoadingFallback />}>
              <NonTeachingAnnouncements />
            </Suspense>
          }
        />
        <Route
          path="department"
          element={
            <Suspense fallback={<PortalLoadingFallback />}>
              <NonTeachingDepartment />
            </Suspense>
          }
        />
        <Route
          path="support"
          element={
            <Suspense fallback={<PortalLoadingFallback />}>
              <NonTeachingSupport />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/non-teaching-dashboard" replace />} />
      </Route>
    </Routes>
  );
}

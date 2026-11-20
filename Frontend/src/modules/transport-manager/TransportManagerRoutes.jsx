import React from "react";
import { Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import TransportManagerDashboard from "./TransportManagerDashboard.jsx";
import { TransportManagerProvider } from "./TransportManagerContext.jsx";
import ErrorBoundary from "@/shared/components/ErrorBoundary.jsx";
import ProtectedRoute from "@/routes/ProtectedRoute.jsx";

import TransportManagerHome from "./pages/TransportManagerHome.jsx";
import TransportManagerSetup from "./pages/TransportManagerSetup.jsx";
import TransportManagerOperations from "./pages/TransportManagerOperations.jsx";
import TransportManagerReports from "./pages/TransportManagerReports.jsx";
import TransportManagerPayslips from "./pages/TransportManagerPayslips.jsx";
import TransportManagerReimbursements from "./pages/TransportManagerReimbursements.jsx";
import TransportManagerLeave from "./pages/TransportManagerLeave.jsx";
import TransportManagerHolidays from "./pages/TransportManagerHolidays.jsx";
import TransportManagerMyAttendance from "./pages/TransportManagerMyAttendance.jsx";
import TransportManagerProfile from "./pages/TransportManagerProfile.jsx";
import TransportManagerSettings from "./pages/TransportManagerSettings.jsx";

function TransportManagerLegacyRedirect({ path, tab }) {
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  next.set("tab", tab);
  return <Navigate to={`/transport-manager/${path}?${next}`} replace />;
}

export function TransportManagerContent() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<TransportManagerDashboard />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<TransportManagerHome />} />
          <Route path="setup" element={<ProtectedRoute requiredModule="transport-manager-setup"><TransportManagerSetup /></ProtectedRoute>} />
          <Route path="operations" element={<ProtectedRoute requiredModule="transport-manager-operations"><TransportManagerOperations /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute requiredModule="reports-analytics"><TransportManagerReports /></ProtectedRoute>} />

          {/* Legacy route redirects to internal sub-tabs */}
          <Route path="drivers" element={<ProtectedRoute requiredModule="transport-manager-setup"><TransportManagerLegacyRedirect path="setup" tab="drivers" /></ProtectedRoute>} />
          <Route path="vehicles" element={<ProtectedRoute requiredModule="transport-manager-setup"><TransportManagerLegacyRedirect path="setup" tab="vehicles" /></ProtectedRoute>} />
          <Route path="assignments" element={<ProtectedRoute requiredModule="transport-manager-operations"><TransportManagerLegacyRedirect path="operations" tab="vehicleAssignments" /></ProtectedRoute>} />
          <Route path="maintenance" element={<ProtectedRoute requiredModule="transport-manager-operations"><TransportManagerLegacyRedirect path="operations" tab="maintenance" /></ProtectedRoute>} />
          <Route path="my-attendance" element={<ProtectedRoute requiredModule="staff-attendance"><TransportManagerMyAttendance /></ProtectedRoute>} />
          <Route path="payslips" element={<ProtectedRoute requiredModule="payroll"><TransportManagerPayslips /></ProtectedRoute>} />
          <Route path="reimbursements" element={<ProtectedRoute requiredModule="reimbursement"><TransportManagerReimbursements /></ProtectedRoute>} />
          <Route path="leave" element={<ProtectedRoute requiredModule="staff-leave-management"><TransportManagerLeave /></ProtectedRoute>} />
          <Route path="holidays" element={<ProtectedRoute requiredModule="holiday-management"><TransportManagerHolidays /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute requiredModule="profile"><TransportManagerProfile /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute requiredModule="settings"><TransportManagerSettings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default function TransportManagerRoutes() {
  return (
    <TransportManagerProvider>
      <TransportManagerContent />
    </TransportManagerProvider>
  );
}

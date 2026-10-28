import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import TransportManagerDashboard from "./TransportManagerDashboard.jsx";
import { TransportManagerProvider } from "./TransportManagerContext.jsx";
import ErrorBoundary from "@/shared/components/ErrorBoundary.jsx";

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

export function TransportManagerContent() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<TransportManagerDashboard />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<TransportManagerHome />} />
          <Route path="setup" element={<TransportManagerSetup />} />
          <Route path="operations" element={<TransportManagerOperations />} />
          <Route path="reports" element={<TransportManagerReports />} />

          {/* Legacy route redirects to internal sub-tabs */}
          <Route path="drivers" element={<Navigate to="/transport-manager/setup?tab=drivers" replace />} />
          <Route path="vehicles" element={<Navigate to="/transport-manager/setup?tab=vehicles" replace />} />
          <Route path="assignments" element={<Navigate to="/transport-manager/operations?tab=vehicleAssignments" replace />} />
          <Route path="maintenance" element={<Navigate to="/transport-manager/operations?tab=maintenance" replace />} />
          <Route path="my-attendance" element={<TransportManagerMyAttendance />} />
          <Route path="payslips" element={<TransportManagerPayslips />} />
          <Route path="reimbursements" element={<TransportManagerReimbursements />} />
          <Route path="leave" element={<TransportManagerLeave />} />
          <Route path="holidays" element={<TransportManagerHolidays />} />
          <Route path="profile" element={<TransportManagerProfile />} />
          <Route path="settings" element={<TransportManagerSettings />} />
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

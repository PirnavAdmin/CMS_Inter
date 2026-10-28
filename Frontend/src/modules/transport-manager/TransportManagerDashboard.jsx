import React from "react";
import { useOutlet } from "react-router-dom";
import TransportManagerLayout from "./layout/TransportManagerLayout.jsx";
import {
  TransportManagerProvider,
  useTransportManagerSafe,
} from "./TransportManagerContext.jsx";
import TransportManagerHome from "./pages/TransportManagerHome.jsx";
import "./TransportManagerDashboard.css";

function TransportManagerDashboardInner() {
  const outlet = useOutlet();

  return (
    <TransportManagerLayout>
      {outlet || <TransportManagerHome />}
    </TransportManagerLayout>
  );
}

export default function TransportManagerDashboard() {
  const context = useTransportManagerSafe();

  if (!context) {
    return (
      <TransportManagerProvider>
        <TransportManagerDashboardInner />
      </TransportManagerProvider>
    );
  }

  return <TransportManagerDashboardInner />;
}

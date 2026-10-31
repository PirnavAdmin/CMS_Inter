import React from "react";

export default function TransportManagerStatusBadge({ status, condition }) {
  const label = condition || status || "Unknown";
  const normalized = String(label).trim().toLowerCase();

  let modifier = "neutral";
  if (
    normalized === "active" ||
    normalized === "operational" ||
    normalized === "completed" ||
    normalized === "approved" ||
    normalized === "paid" ||
    normalized === "true"
  ) {
    modifier = "success";
  } else if (
    normalized === "needs inspection" ||
    normalized === "pending" ||
    normalized === "under review" ||
    normalized === "scheduled" ||
    normalized === "unassigned" ||
    normalized === "warning"
  ) {
    modifier = "warning";
  } else if (
    normalized === "inactive" ||
    normalized === "under maintenance" ||
    normalized === "maintenance required" ||
    normalized === "out of service" ||
    normalized === "rejected" ||
    normalized === "danger"
  ) {
    modifier = "danger";
  } else if (normalized === "draft" || normalized === "clarification") {
    modifier = "info";
  }

  return (
    <span className={`tm-badge tm-badge--${modifier}`}>
      <span className="tm-badge__dot" />
      {label}
    </span>
  );
}

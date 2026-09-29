import React from "react";

export default function DriverStatusBadge({ status, tone }) {
  const normalized = (status || "").toLowerCase().trim();

  let resolvedTone = tone;
  if (!resolvedTone) {
    if (["online", "completed", "picked up", "valid", "active", "success"].includes(normalized)) {
      resolvedTone = "success";
    } else if (["in progress", "ongoing", "warning", "pending", "break"].includes(normalized)) {
      resolvedTone = "warning";
    } else if (["not started", "not boarded", "absent", "danger", "offline", "expired"].includes(normalized)) {
      resolvedTone = "danger";
    } else if (["upcoming", "neutral", "purple"].includes(normalized)) {
      resolvedTone = "purple";
    } else {
      resolvedTone = "default";
    }
  }

  const toneClassMap = {
    success: "dp-badge-success",
    warning: "dp-badge-warning",
    danger: "dp-badge-danger",
    purple: "dp-badge-purple",
    blue: "dp-badge-blue",
    default: "dp-badge-default",
  };

  return (
    <span className={`dp-status-badge ${toneClassMap[resolvedTone] || "dp-badge-default"}`}>
      <span className="dp-status-dot" />
      {status}
    </span>
  );
}


import React from "react";
import { Inbox } from "lucide-react";

export default function TransportManagerEmptyState({
  title = "No data available",
  subtitle = "There are no records to display at this time.",
  action,
  icon: Icon = Inbox,
}) {
  return (
    <div className="tm-empty-state">
      <div className="tm-empty-state__icon-wrap">
        <Icon size={36} className="tm-empty-state__icon" />
      </div>
      <h3 className="tm-empty-state__title">{title}</h3>
      <p className="tm-empty-state__subtitle">{subtitle}</p>
      {action && <div className="tm-empty-state__action">{action}</div>}
    </div>
  );
}

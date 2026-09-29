import React from "react";
import { FolderOpen } from "lucide-react";

export default function DriverEmptyState({ icon: Icon = FolderOpen, title = "No Data Found", description = "There are no records to display at this moment.", actionText, onAction }) {
  return (
    <div className="dp-empty-state">
      <div className="dp-empty-icon-wrap">
        <Icon size={32} />
      </div>
      <h3 className="dp-empty-title">{title}</h3>
      <p className="dp-empty-desc">{description}</p>
      {actionText && onAction && (
        <button type="button" className="dp-btn dp-btn-primary dp-btn-sm" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
}


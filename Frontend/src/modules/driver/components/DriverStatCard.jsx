import React from "react";

export default function DriverStatCard({ icon: Icon, title, value, subtitle, badge, tone = "primary", onClick }) {
  const toneClasses = {
    primary: "dp-stat-primary",
    success: "dp-stat-success",
    warning: "dp-stat-warning",
    danger: "dp-stat-danger",
    purple: "dp-stat-purple",
    blue: "dp-stat-blue",
  };

  return (
    <div
      className={`dp-stat-card ${toneClasses[tone] || "dp-stat-primary"} ${onClick ? "dp-stat-clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="dp-stat-top">
        <div className="dp-stat-icon-box">
          {Icon && <Icon className="dp-stat-icon" size={20} />}
        </div>
        {badge && <span className="dp-stat-pill">{badge}</span>}
      </div>
      <div className="dp-stat-info">
        <span className="dp-stat-title">{title}</span>
        <strong className="dp-stat-value">{value}</strong>
        {subtitle && <span className="dp-stat-sub">{subtitle}</span>}
      </div>
    </div>
  );
}


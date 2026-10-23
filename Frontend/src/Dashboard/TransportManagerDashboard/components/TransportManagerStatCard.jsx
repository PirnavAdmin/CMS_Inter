import React from "react";

export default function TransportManagerStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "primary",
  trend,
  onClick,
}) {
  return (
    <div
      className={`tm-stat-card tm-stat-card--${variant} ${onClick ? "tm-stat-card--clickable" : ""}`}
      onClick={onClick}
    >
      <div className="tm-stat-card__header">
        <span className="tm-stat-card__title">{title}</span>
        {Icon && (
          <div className="tm-stat-card__icon-wrapper">
            <Icon size={20} className="tm-stat-card__icon" />
          </div>
        )}
      </div>
      <div className="tm-stat-card__value">{value ?? "--"}</div>
      {(subtitle || trend) && (
        <div className="tm-stat-card__footer">
          {trend && <span className="tm-stat-card__trend">{trend}</span>}
          {subtitle && <span className="tm-stat-card__subtitle">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}

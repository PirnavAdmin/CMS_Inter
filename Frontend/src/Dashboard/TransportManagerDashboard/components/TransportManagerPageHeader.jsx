import React from "react";

export default function TransportManagerPageHeader({
  title,
  subtitle,
  actions,
  children,
}) {
  return (
    <div className="tm-page-header">
      <div className="tm-page-header__left">
        <h1 className="tm-page-header__title">{title}</h1>
        {subtitle && <p className="tm-page-header__subtitle">{subtitle}</p>}
      </div>
      {(actions || children) && (
        <div className="tm-page-header__actions">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
}

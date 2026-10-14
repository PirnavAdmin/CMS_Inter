import { Link, useLocation } from "react-router-dom";

import ExamCellVisual from "./ExamCellVisuals.jsx";

// A content-only adapter: module screens never mount the administrator shell.
export default function ExamCellPageLayout({ title, subtitle, actions, backLink, children }) {
  const { pathname } = useLocation();
  const pageName = pathname.split("/")[2] || "";
  return <section className="ec-page">
    {backLink && <Link to={backLink.to || backLink.path || "/exam-cell-dashboard"}>{backLink.label || "Back"}</Link>}
    <header className="ec-page-heading"><div><h1 className="ec-page-title-3d"><ExamCellVisual name={pageName} className="ec-page-title-image" />{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="ec-actions">{actions}</div>}</header>
    {children}
  </section>;
}

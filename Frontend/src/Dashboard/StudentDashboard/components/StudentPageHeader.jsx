import { useLocation } from "react-router-dom";
import { studentMenuGroups } from "../layout/StudentSidebar.jsx";

export default function StudentPageHeader({ title, subtitle, action }) {
  const { pathname } = useLocation();
  const module = pathname.replace(/^\/student-dashboard\/?/, "").split("/")[0];
  const menuEntry = studentMenuGroups.flatMap(([, links]) => links).find(([, path]) => path === module);
  const icon = menuEntry?.[2];

  return <header className="sp-page-header">
    <div className="sp-page-heading">
      {icon ? <img className="sp-page-heading-icon" src={icon} alt="" aria-hidden="true"/> : null}
      <div><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>
    </div>
    {action}
  </header>;
}

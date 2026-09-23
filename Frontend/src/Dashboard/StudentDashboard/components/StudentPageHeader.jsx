export default function StudentPageHeader({ title, subtitle, action }) {
  return <header className="sp-page-header"><div><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>{action}</header>;
}

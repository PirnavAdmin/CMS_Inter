export default function StudentCard({ title, subtitle, action, children, className = "" }) {
  return <section className={`sp-card ${className}`}><header className="sp-card-head"><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>{action}</header><div className="sp-card-body">{children}</div></section>;
}

export default function StudentSummaryCard({ icon: Icon, label, value, note, tone = "green" }) {
  const iconNode = typeof Icon === "string"
    ? <img className="sp-summary-3d-icon" src={Icon} alt="" aria-hidden="true" />
    : Icon?.src
      ? <span className="sp-summary-3d-icon sp-summary-generated-icon" style={{ backgroundImage: `url(${Icon.src})`, backgroundPosition: Icon.position }} aria-hidden="true" />
      : <Icon size={20} />;
  return <article className={`sp-summary sp-tone-${tone}`}><span className="sp-summary-icon">{iconNode}</span><div><small>{label}</small><strong>{value}</strong>{note ? <em>{note}</em> : null}</div></article>;
}

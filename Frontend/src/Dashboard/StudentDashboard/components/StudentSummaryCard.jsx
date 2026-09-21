export default function StudentSummaryCard({ icon: Icon, label, value, note, tone = "green" }) {
  return <article className={`sp-summary sp-tone-${tone}`}><span className="sp-summary-icon"><Icon size={20}/></span><div><small>{label}</small><strong>{value}</strong>{note ? <em>{note}</em> : null}</div></article>;
}

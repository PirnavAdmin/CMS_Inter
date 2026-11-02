import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";

export default function StudentSummaryCard({ icon: Icon, label, value, note, tone = "green" }) {
  return (
    <article className={`sp-summary sp-tone-${tone}`}>
      <span className="sp-summary-icon">
        <ThreeDIcon icon={Icon} size={28} className="sp-summary-3d-icon" />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {note ? <em>{note}</em> : null}
      </div>
    </article>
  );
}


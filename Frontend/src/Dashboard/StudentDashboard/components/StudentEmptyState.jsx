import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";

export default function StudentEmptyState({ icon: Icon, title, text }) {
  return (
    <div className="sp-empty-state">
      {Icon ? <ThreeDIcon name={Icon} size={48} /> : null}
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

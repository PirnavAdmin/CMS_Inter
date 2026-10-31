export default function StudentEmptyState({ icon: Icon, title, text }) {
  return <div className="sp-empty-state">{Icon ? <Icon size={34}/> : null}<h2>{title}</h2><p>{text}</p></div>;
}

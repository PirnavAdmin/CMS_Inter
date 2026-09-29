export default function StudentStatusBadge({ children, value = children }) {
  const tone = /paid|pass|ready|active|good|completed|published/i.test(String(value)) ? "success" : /high|absent|due/i.test(String(value)) ? "danger" : /current|process|medium/i.test(String(value)) ? "warning" : "neutral";
  return <span className={`sp-badge is-${tone}`}>{value}</span>;
}

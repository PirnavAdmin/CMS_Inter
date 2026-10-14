import ReimbursementPage from "./ReimbursementPage.jsx";

/**
 * Defensive alias component:
 * Guarantees that any legacy route, stale branch merge, or teammate commit
 * importing AdminReimbursementsPage will always render Lohith's full-featured ReimbursementPage.
 */
export default function AdminReimbursementsPage(props) {
  return <ReimbursementPage {...props} />;
}


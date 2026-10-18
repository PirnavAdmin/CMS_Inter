/**
 * FacultyReimbursement.jsx
 * Thin wrapper around the shared ReimbursementPage for the Staff Portal.
 * Renders the reimbursement UI inside the existing FacultyLayout — no nested DashboardLayout.
 * isAccountantView=true skips the outer DashboardLayout wrapper in ReimbursementPage
 * so the staff portal's own FacultyLayout is used instead.
 */
import React from "react";
import ReimbursementPage from "@/components/pages/ReimbursementPage.jsx";

export default function FacultyReimbursement() {
  // isAccountantView=true bypasses the DashboardLayout wrapper in ReimbursementPage
  // but the component still auto-detects isFacultyUser from the JWT token,
  // so staff see the "Submit & Track My Claims" faculty view, not the admin review panel.
  return <ReimbursementPage isAccountantView={true} />;
}

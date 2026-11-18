import React from "react";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import EnquiriesListView from "./components/EnquiriesListView.jsx";

export default function EnquiryManagementPage() {
  const isPrincipal = typeof window !== "undefined" && window.location.pathname.includes("principal");

  return (
    <DashboardLayout
      title="Enquiry Management"
      subtitle="Monitor visitor enquiries, track follow-ups, and manage prospective student leads."
      breadcrumb={[isPrincipal ? "Principal Portal" : "Administration", "Enquiry Management"]}
    >
      <div style={{ padding: "8px 0" }}>
        <EnquiriesListView portalType={isPrincipal ? "principal" : "admin"} />
      </div>
    </DashboardLayout>
  );
}

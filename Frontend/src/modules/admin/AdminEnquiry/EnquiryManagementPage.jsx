import React from "react";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import EnquiriesListView from "./components/EnquiriesListView.jsx";

export default function EnquiryManagementPage() {
  return (
    <DashboardLayout
      title="Enquiry Management"
      subtitle="Monitor visitor enquiries, track follow-ups, and manage prospective student leads."
      breadcrumb={["Administration", "Enquiry Management"]}
    >
      <div style={{ padding: "8px 0" }}>
        <EnquiriesListView portalType="admin" />
      </div>
    </DashboardLayout>
  );
}

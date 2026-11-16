import React from "react";
import EnquiriesListView from "@/modules/admin/AdminEnquiry/components/EnquiriesListView.jsx";

export default function ReceptionistEnquiriesPage() {
  return (
    <div style={{ padding: "4px 0" }}>
      <EnquiriesListView portalType="receptionist" />
    </div>
  );
}

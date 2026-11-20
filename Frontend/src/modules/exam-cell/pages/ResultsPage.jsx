import React from "react";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import ResultsManagementView from "@/modules/admin/AdminResults/components/ResultsManagementView.jsx";

export default function ResultsPage(props) {
  return (
    <ResultsManagementView
      LayoutComponent={DashboardLayout}
      defaultPageSize={6}
      defaultAnalyticsPageSize={5}
      pageTitle="Results Management"
      pageSubtitle="Generate, publish, inspect and analyze examination results"
      {...props}
    />
  );
}

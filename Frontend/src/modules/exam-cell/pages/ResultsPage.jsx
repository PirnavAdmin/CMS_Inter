import React from "react";
import DashboardLayout from "../layout/ExamCellPageLayout.jsx";
import ResultsManagementView from "@/modules/admin/AdminResults/components/ResultsManagementView.jsx";

export default function ResultsPage(props) {
  return (
    <ResultsManagementView
      LayoutComponent={DashboardLayout}
      defaultPageSize={10}
      defaultAnalyticsPageSize={10}
      initialView="table"
      pageTitle="Results"
      pageSubtitle="Generate, inspect and analyze examination results."
      {...props}
    />
  );
}

import React, { lazy, Suspense } from "react";
import { SkeletonPage } from "@/shared/components/Ui.jsx";

const LazyHostelPage = lazy(() => import("./HostelPage.jsx"));

function HostelWrapper(props) {
  return React.createElement(
    Suspense,
    {
      fallback: React.createElement(
        "div",
        { style: { padding: "24px", minHeight: "80vh" } },
        React.createElement(SkeletonPage, { variant: "card", rows: 6 }),
      ),
    },
    React.createElement(LazyHostelPage, props),
  );
}

export {
  HostelWrapper as HostelDashboard,
  HostelWrapper as HostelMasterSetup,
  HostelWrapper as HostelStudentManagement,
  HostelWrapper as HostelAttendanceRegister,
  HostelWrapper as HostelReports,
};

export default HostelWrapper;

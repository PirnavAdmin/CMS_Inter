import React from "react";
import AdminExaminationPage, { pageConfig } from "@/modules/admin/AdminExaminations/ExaminationPage.jsx";

export { pageConfig };

export default function ExaminationPage(props) {
  return <AdminExaminationPage {...props} />;
}

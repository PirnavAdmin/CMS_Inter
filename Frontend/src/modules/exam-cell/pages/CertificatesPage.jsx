import ExamCellPageLayout from "../layout/ExamCellPageLayout.jsx";
import CertificatesManagementView from "@/modules/admin/AdminCertificates/components/CertificatesManagementView.jsx";

export const pageConfig = {
  title: "Certificates",
  route: "/exam-cell-dashboard/certificates",
};

export default function ExamCellCertificatesPage() {
  return <CertificatesManagementView Layout={ExamCellPageLayout} pageSize={10} />;
}

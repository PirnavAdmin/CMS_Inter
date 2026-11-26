import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import CertificatesManagementView from "./components/CertificatesManagementView.jsx";

export const pageConfig = {
  title: "Certificates",
  route: "/admin-dashboard/certificates",
};

export default function AdminCertificatesPage() {
  return <CertificatesManagementView Layout={DashboardLayout} pageSize={5} />;
}

import AppRoutes from "../routes/AppRoutes.jsx";
import { AcademicProvider } from "../context/AcademicContext.jsx";
import { CampusProvider } from "../context/CampusContext.jsx";
import ErrorBoundary from "../shared/components/ErrorBoundary.jsx";
import { useLocation } from "react-router-dom";

export default function App() {
  const { pathname } = useLocation();
  // The platform mock workspace has its own data provider and no tenant APIs.
  if (pathname === "/super-admin" || pathname.startsWith("/super-admin/")) {
    return <ErrorBoundary><AppRoutes /></ErrorBoundary>;
  }
  return (
    <ErrorBoundary>
      <CampusProvider>
        <AcademicProvider>
          <AppRoutes />
        </AcademicProvider>
      </CampusProvider>
    </ErrorBoundary>
  );
}

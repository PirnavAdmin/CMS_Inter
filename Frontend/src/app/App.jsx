import AppRoutes from "../routes/AppRoutes.jsx";
import { AcademicProvider } from "../context/AcademicContext.jsx";
import { CampusProvider } from "../context/CampusContext.jsx";
import ErrorBoundary from "@/components/common/ErrorBoundary.jsx";

export default function App() {
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

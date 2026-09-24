import AppRoutes from "@/routes/AppRoutes.jsx";
import { AcademicProvider } from "@/context/AcademicContext.jsx";
import { CampusProvider } from "@/context/CampusContext.jsx";

export default function App() {
  return (
    <CampusProvider>
      <AcademicProvider>
        <AppRoutes />
      </AcademicProvider>
    </CampusProvider>
  );
}




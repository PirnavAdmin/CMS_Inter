import AppRoutes from "@/routes/AppRoutes.jsx";
import { AcademicProvider } from "@/context/AcademicContext.jsx";

export default function App() {
  return (
    <AcademicProvider>
      <AppRoutes />
    </AcademicProvider>
  );
}




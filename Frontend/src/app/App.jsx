import AppRoutes from "../routes/AppRoutes.jsx";
import { AcademicProvider } from "../context/AcademicContext.jsx";
import { CampusProvider } from "../context/CampusContext.jsx";
import { EffectivePermissionsProvider } from "../features/rolesPermissions/EffectivePermissionsContext.jsx";

export default function App() {
  return (
    <CampusProvider>
      <AcademicProvider>
        <EffectivePermissionsProvider>
          <AppRoutes />
        </EffectivePermissionsProvider>
      </AcademicProvider>
    </CampusProvider>
  );
}




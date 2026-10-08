import { getAuthUser } from "../../../features/authStorage.js";

// Use the authenticated driver's API profile, with session identity as fallback.
export function getDriverIdentity(profile = {}) {
  const user = getAuthUser();
  const name = profile.name || profile.fullName || user?.name || user?.fullName || user?.email || "Driver";
  return {
    ...profile,
    name,
    email: profile.email || user?.email || "",
    employeeId: profile.employeeId || user?.employeeId || "Not available",
    role: user?.role || profile.role || "Driver",
    initials: name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "DR",
    assignedVehicle: profile.assignedVehicle || "Not assigned",
  };
}

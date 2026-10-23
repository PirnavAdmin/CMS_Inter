import { getAuthUser } from "../../../features/authStorage.js";

// Use the authenticated driver's API profile, with session identity as fallback.
export function getDriverIdentity(profile = {}) {
  const user = getAuthUser();
  const name = profile.name || profile.fullName || user?.name || user?.fullName || user?.email || "Driver";
  const sources = [profile, profile.transportDetails, profile.professionalDetails, profile.staff, profile.personalDetails].filter((value) => value && typeof value === "object");
  const savedValue = (...keys) => {
    for (const source of sources) {
      for (const key of keys) {
        const value = source[key] ?? source[key[0].toUpperCase() + key.slice(1)];
        if (value != null && String(value).trim()) return value;
      }
    }
    return "";
  };
  return {
    ...profile,
    licenseNumber: savedValue("licenseNumber", "drivingLicenseNumber", "drivingLicenceNumber", "licenceNumber"),
    badgeNumber: savedValue("badgeNumber", "transportBadgeNumber", "driverBadgeNumber"),
    licenseCategory: savedValue("licenseCategory", "licenseType", "drivingLicenseType"),
    licenseExpiry: savedValue("licenseExpiry", "drivingLicenseExpiryDate", "licenseExpiryDate", "drivingLicenceExpiryDate"),
    name,
    email: profile.email || user?.email || "",
    employeeId: profile.employeeId || user?.employeeId || "Not available",
    role: user?.role || profile.role || "Driver",
    initials: name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "DR",
    assignedVehicle: profile.assignedVehicle || "Not assigned",
  };
}

import { getAuthUser } from "../../auth/authStorage.js";

// Use the authenticated driver's API profile, with session identity as fallback.
export function getDriverIdentity(profile = {}) {
  const user = getAuthUser();
  const name = profile.name || profile.fullName || user?.name || user?.fullName || user?.email || "PENETI RAJESH";
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
    licenseNumber: savedValue("licenseNumber", "drivingLicenseNumber", "drivingLicenceNumber", "licenceNumber") || "9237239572035729",
    badgeNumber: savedValue("badgeNumber", "transportBadgeNumber", "driverBadgeNumber") || "TS-TRANS-2023-09",
    licenseCategory: savedValue("licenseCategory", "licenseType", "drivingLicenseType") || "Heavy Transport Vehicle (HTV)",
    licenseExpiry: savedValue("licenseExpiry", "drivingLicenseExpiryDate", "licenseExpiryDate", "drivingLicenceExpiryDate") || "2033-07-12",
    name,
    email: profile.email || user?.email || "penetirajesh123@gmail.com",
    employeeId: profile.employeeId || user?.employeeId || "MNT0030",
    role: user?.role || profile.role || "Bus Driver",
    initials: name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "PR",
    assignedVehicle: profile.assignedVehicle || profile.vehicleNumber || user?.assignedVehicle || "AP39AU2653",
  };
}

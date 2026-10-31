/**
 * Transport Manager Permissions Utility
 * Scopes role abilities for the authenticated Transport Manager
 */

export const TRANSPORT_MANAGER_PERMISSIONS = {
  VIEW_DASHBOARD: "VIEW_DASHBOARD",
  MANAGE_DRIVERS: "MANAGE_DRIVERS",
  MANAGE_VEHICLES: "MANAGE_VEHICLES",
  MANAGE_ASSIGNMENTS: "MANAGE_ASSIGNMENTS",
  MANAGE_MAINTENANCE: "MANAGE_MAINTENANCE",
  VIEW_REPORTS: "VIEW_REPORTS",
  EXPORT_REPORTS: "EXPORT_REPORTS",
  VIEW_PAYSLIPS: "VIEW_PAYSLIPS",
  VIEW_REIMBURSEMENTS: "VIEW_REIMBURSEMENTS",
  APPLY_REIMBURSEMENT: "APPLY_REIMBURSEMENT",
  VIEW_LEAVE: "VIEW_LEAVE",
  APPLY_LEAVE: "APPLY_LEAVE",
  VIEW_HOLIDAYS: "VIEW_HOLIDAYS",
  MANAGE_PROFILE: "MANAGE_PROFILE",
  MANAGE_SETTINGS: "MANAGE_SETTINGS",
};

export const hasTransportPermission = (permission) => {
  // Transport managers have all transport operations and personal self-service permissions
  return Object.values(TRANSPORT_MANAGER_PERMISSIONS).includes(permission);
};

export const isPayslipNotification = (notification) =>
  ["PAYSLIP_GENERATED", "PAYSLIP_PUBLISHED"].includes(String(notification?.type || "").toUpperCase());

// Read-state changes should not trigger another payslip fetch.
export const payslipNotificationKey = (notifications) => notifications
  .filter(isPayslipNotification)
  .map((item) => `${item.id}:${item.payslipId ?? ""}:${item.createdAt ?? item.createdTime ?? ""}`)
  .sort().join("|");

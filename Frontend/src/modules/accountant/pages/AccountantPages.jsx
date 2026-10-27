// Compatibility exports: each screen is implemented in its own primary JSX file.
export { getRows, getNumber, getText, formatMoney, formatDate, normalizePayment, normalizeDue, normalizePayroll } from "../services/accountantService.js";
export { default as AccountantFees } from "./AccountantFeeManagement.jsx";
export { AccountantPayments } from "./AccountantPayments.jsx";
export { AccountantPayroll } from "./AccountantPayroll.jsx";
export { AccountantAttendanceImpact } from "./AccountantAttendanceImpact.jsx";
export { AccountantReports } from "./AccountantReports.jsx";
export { AccountantProfile } from "./AccountantProfile.jsx";

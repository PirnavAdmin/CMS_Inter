import { useCallback, useEffect, useState } from "react";

const KEY = "pirnav-super-admin-subscription-dashboard-v1";
const plans = [
  { id: "PLAN-FREE", name: "Free", monthlyPrice: 0, durationDays: 30, maxUsers: 25, status: "Active" },
  { id: "PLAN-BASIC", name: "Basic", monthlyPrice: 1499, durationDays: 30, maxUsers: 100, status: "Active" },
  { id: "PLAN-STANDARD", name: "Standard", monthlyPrice: 2999, durationDays: 30, maxUsers: 300, status: "Active" },
  { id: "PLAN-PREMIUM", name: "Premium", monthlyPrice: 5999, durationDays: 30, maxUsers: 1000, status: "Active" },
  { id: "PLAN-ENTERPRISE", name: "Enterprise", monthlyPrice: 12999, durationDays: 30, maxUsers: 5000, status: "Active" },
];
const subscriptions = [
  ["SUB-001", "COL-001", "ABC Junior College", "ABCJC01", "Standard", 78, "2026-09-01", "2026-12-01", "Active"],
  ["SUB-002", "COL-002", "Sunrise Degree College", "SDC02", "Premium", 642, "2026-08-15", "2026-11-15", "Expiring Soon"],
  ["SUB-003", "COL-003", "XYZ Engineering College", "XYZENG03", "Enterprise", 1830, "2026-07-01", "2027-07-01", "Active"],
  ["SUB-004", "COL-004", "Green Valley College", "GVC04", "Basic", 84, "2026-06-10", "2026-10-10", "Expired"],
  ["SUB-005", "COL-005", "National B.Pharmacy", "NBP05", "Standard", 212, "2026-09-10", "2026-12-10", "Active"],
  ["SUB-006", "COL-006", "Pirnav Junior College", "PJC", "Enterprise", 4290, "2026-08-01", "2027-08-01", "Active"],
  ["SUB-007", "COL-007", "Narayana College", "NAR07", "Basic", 53, "2026-10-01", "2026-11-15", "Expiring Soon"],
  ["SUB-008", "COL-008", "Global Polytechnic College", "GPC08", "Standard", 161, "2026-05-20", "2026-11-20", "Active"],
  ["SUB-009", "COL-009", "St. Mary's Women's College", "SMWC09", "Standard", 302, "2026-04-01", "2026-10-01", "Over Limit"],
  ["SUB-010", "COL-010", "Heritage Arts & Science", "HAS10", "Premium", 781, "2026-09-20", "2027-09-20", "Active"],
  ["SUB-011", "COL-011", "City Vocational Institute", "CVI11", "Free", 18, "2026-10-15", "", "Free"],
  ["SUB-012", "COL-012", "Apex Technology Campus", "ATC12", "Enterprise", 3050, "2026-09-01", "2027-09-01", "Active"],
].map(([id, collegeId, collegeName, collegeCode, planName, totalUsers, startDate, renewalDate, status]) => ({ id, collegeId, collegeName, collegeCode, planName, totalUsers, startDate, renewalDate, status }));

export const createSubscriptionDashboardData = () => ({ plans: structuredClone(plans), subscriptions: structuredClone(subscriptions), payments: [
  { id: "PAY-001", invoiceNumber: "INV-2026-001", collegeId: "COL-001", collegeName: "ABC Junior College", amount: 2999, paymentDate: "2026-10-01", method: "UPI", status: "Paid" },
  { id: "PAY-002", invoiceNumber: "INV-2026-002", collegeId: "COL-002", collegeName: "Sunrise Degree College", amount: 5999, paymentDate: "2026-10-15", method: "Bank Transfer", status: "Pending" },
  { id: "PAY-003", invoiceNumber: "INV-2026-003", collegeId: "COL-003", collegeName: "XYZ Engineering College", amount: 12999, paymentDate: "2026-10-20", method: "Card", status: "Paid" },
], auditLogs: [], settings: { platformName: "PIRNAV CMS", supportEmail: "support@pirnav.edu.in", renewalDays: 30 }, modules: ["Students", "Staff", "Attendance", "Fees", "Examinations", "Timetable", "Transport", "Hostel", "Library", "Reports"].map((name) => ({ id: name, name, enabled: true })) });

export function readSubscriptionDashboardData() {
  try { const saved = localStorage.getItem(KEY); if (saved) return { ...createSubscriptionDashboardData(), ...JSON.parse(saved) }; } catch { /* Use fixture data if storage is unavailable. */ }
  return createSubscriptionDashboardData();
}
export function writeSubscriptionDashboardData(value) { try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* Browser storage may be unavailable. */ } }
export function useSubscriptionDashboardData() {
  const [value, setValue] = useState(readSubscriptionDashboardData);
  const update = useCallback((updater) => setValue((current) => { const next = typeof updater === "function" ? updater(current) : updater; writeSubscriptionDashboardData(next); return next; }), []);
  useEffect(() => { const sync = (event) => { if (event.key === KEY && event.newValue) { try { setValue({ ...createSubscriptionDashboardData(), ...JSON.parse(event.newValue) }); } catch { /* Ignore invalid cross-tab data. */ } } }; window.addEventListener("storage", sync); return () => window.removeEventListener("storage", sync); }, []);
  return { value, update };
}

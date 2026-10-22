import React from "react";
import PayrollPage from "@/components/pages/PayrollPage.jsx";

export default function NonTeachingPayslip() {
  return <PayrollPage mode="payroll" layout={false} />;
}

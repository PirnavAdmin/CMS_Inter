import React from "react";
import ThemeSettingsCard from "@/shared/components/ThemeSettingsCard.jsx";
import { PaymentSettingsLink, usePaymentSettingsAccess } from "@/modules/admin/AdminSettings/PaymentGatewayConfigPage.jsx";
import "@/modules/faculty/styles/FacultySettings.css";

export default function AccountantSettingsPage() {
  const paymentSettingsAccess = usePaymentSettingsAccess();
  return (
    <div className="faculty-settings-container" style={{ padding: "16px 20px" }}>
      <div className="cms-page-head" style={{ marginBottom: "18px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: "var(--cms-text)" }}>Settings</h1>
          <p style={{ margin: "4px 0 0", color: "var(--cms-muted)", fontSize: "13px" }}>
            Customize your accounting portal theme and color appearance.
          </p>
        </div>
      </div>

      <div className="faculty-settings-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 420px))", gap: "16px" }}>
        <ThemeSettingsCard />
        {paymentSettingsAccess && <section className="cms-card"><div className="cms-card-body"><h2>Payment Gateway & Bank Accounts</h2><p>Configure campus receiving bank accounts, dynamic UPI QR, Razorpay credentials, and payment processing settings.</p><PaymentSettingsLink accountant>Configure Accounts</PaymentSettingsLink></div></section>}
      </div>
    </div>
  );
}

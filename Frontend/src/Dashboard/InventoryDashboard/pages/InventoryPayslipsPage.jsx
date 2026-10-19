import { useState } from "react";
import { Wallet, Calendar, Eye, Download } from "lucide-react";
import { Modal } from "@/components/common/Ui.jsx";
import { money } from "@/components/pages/InventoryManagement/inventoryModel.js";
import { useDialogFocus } from "@/components/pages/InventoryManagement/components/InventoryUi.jsx";
import { useInventory } from "../InventoryDataContext.jsx";
import { payslipPeriod, payslipPdf, payslipDetail } from "../data/inventoryUserApi.js";
import "../styles/InventoryStaffPages.css";
function PayslipDetails({ slip, profile, onClose, download, busy }) {
  useDialogFocus(onClose);
  return (
    <Modal
      title={`Payslip — ${payslipPeriod(slip)}`}
      onClose={onClose}
      className="inventory-dialog"
    >
      <div className="ip-payslip-detail">
        <p>
          {profile.name} · {profile.employeeId} · {profile.department}
        </p>
        <p className="ip-payslip-note">Salary statement</p>
        <div className="ip-pay-breakdown">
          {[
            ["Earnings", slip.earnings, "Gross Salary", slip.gross],
            ["Deductions", slip.deductions, "Total Deductions", slip.totalDeductions],
          ].map(([title, rows, label, total]) => (
            <section key={title}>
              <h3>{title}</h3>
              <table>
                <tbody>
                  {rows.map(([name, value]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>{money(value)}</td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row">{label}</th>
                    <td>
                      <strong>{money(total)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          ))}
        </div>
        <div className="ip-pay-net">
          <strong>Net Salary Payable</strong>
          <strong>{money(slip.net)}</strong>
        </div>
        <div className="ip-actions">
          <button className="cms-btn cms-btn-ghost" onClick={onClose}>
            Close
          </button>
          <button
            className="cms-btn cms-btn-primary"
            disabled={busy}
            onClick={() => download(slip)}
          >
            <Download size={16} />
            {busy ? "Preparing PDF…" : "Download PDF"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
export default function InventoryPayslipsPage() {
  const { state } = useInventory();
  const payslips = state.payslips;
  const [year, setYear] = useState("all"),
    [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const view = async (slip) => {
    setError("");
    try {
      setSelected(await payslipDetail(slip.id));
    } catch (failure) {
      setError(failure.message);
    }
  };
  const filtered = payslips.filter((slip) => year === "all" || String(slip.year) === year);
  const current = filtered[0];
  const download = async (slip) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const blob = await payslipPdf(slip.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Payslip-${slip.year}-${slip.month}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      setError(failure.message || "Unable to download the server payslip PDF.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="ip-page-head">
        <div>
          <h1>
            <Wallet size={26} /> My Payslips
          </h1>
          <p>View your monthly salary statements and download PDFs.</p>
        </div>
        <label className="ip-pay-year">
          <Calendar size={16} /> Year
          <select aria-label="Payslip year" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="all">All Years</option>
            {[...new Set(payslips.map((p) => p.year))].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p className="ip-error" role="alert">
          {error}
        </p>
      )}
      {current ? (
        <>
          <section className="ip-card">
            <div className="ip-page-head">
              <h2>Current Payslip</h2>
              <span>
                {payslipPeriod(current)} · {current.status}
              </span>
            </div>
            <div className="ip-staff-metrics">
              {[
                ["Gross Salary", current.gross],
                ["Deductions", current.totalDeductions],
                ["Net Pay", current.net],
              ].map(([label, value]) => (
                <article className="ip-card" key={label}>
                  <p>{label}</p>
                  <strong>{money(value)}</strong>
                </article>
              ))}
            </div>
            <div className="ip-actions">
              <button className="cms-btn cms-btn-primary" onClick={() => view(current)}>
                <Eye size={16} /> View Payslip
              </button>
              <button
                className="cms-btn cms-btn-ghost"
                disabled={busy}
                onClick={() => download(current)}
              >
                <Download size={16} />
                {busy ? "Preparing PDF…" : "Download PDF"}
              </button>
            </div>
          </section>
          <section className="ip-card">
            <h2>Past Payslips</h2>
            {filtered.slice(1).map((slip) => (
              <div className="ip-list-row" key={slip.id}>
                <div>
                  <strong>{payslipPeriod(slip)}</strong>
                  <p>
                    Net Salary: {money(slip.net)} · {slip.status}
                  </p>
                </div>
                <div className="ip-actions">
                  <button
                    className="cms-btn cms-btn-ghost"
                    aria-label={`View ${payslipPeriod(slip)} payslip`}
                    onClick={() => view(slip)}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    className="cms-btn cms-btn-ghost"
                    disabled={busy}
                    aria-label={`Download ${payslipPeriod(slip)} PDF`}
                    onClick={() => download(slip)}
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
            ))}
          </section>
        </>
      ) : (
        <section className="ip-card">No payslips available for this year.</section>
      )}
      {selected && (
        <PayslipDetails
          slip={selected}
          profile={state.profile}
          onClose={() => setSelected(null)}
          download={download}
          busy={busy}
        />
      )}
    </>
  );
}

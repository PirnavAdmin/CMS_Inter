const documentDetails = (record, kind) => ({
  title: kind === "invoice" ? "Invoice" : "Payment Receipt",
  number: kind === "invoice" ? record.invoiceNo : record.txnId,
  rows: kind === "invoice" ? [
    ["Invoice Number", record.invoiceNo], ["Transaction", record.txnId],
    ["College", record.college], ["Email", record.email], ["Plan", record.plan],
    ["Issue Date", record.issueDate], ["Due Date", record.dueDate],
    ["Status", record.status], ["Amount (INR)", record.amount],
  ] : [
    ["Transaction", record.txnId], ["Invoice Reference", record.invoiceNo],
    ["College", record.college], ["Payment Method", record.method],
    ["Payment Date", record.paymentDate], ["Plan", record.plan],
    ["Status", record.status], ["Amount (INR)", record.amount],
  ],
});

export async function downloadBillingDocument(record, kind) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const details = documentDetails(record, kind);
  const pdf = new jsPDF();
  pdf.setFontSize(19);
  pdf.text(details.title, 14, 22);
  autoTable(pdf, { startY: 32, body: details.rows.map(([label, value]) => [label, String(value ?? "—")]), theme: "grid", styles: { fontSize: 11, cellPadding: 4 } });
  await pdf.save(`${String(details.number || details.title).replace(/[^a-z0-9_-]/gi, "_")}.pdf`, { returnPromise: true });
}

export function printBillingDocument(record, kind) {
  const details = documentDetails(record, kind);
  const escape = (value) => String(value ?? "—").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const frame = document.createElement("iframe");
  frame.title = `${details.title} print preview`;
  frame.style.cssText = "position:fixed;width:1px;height:1px;left:-10000px;border:0";
  frame.onload = () => {
    const target = frame.contentWindow;
    target.addEventListener("afterprint", () => frame.remove(), { once: true });
    target.requestAnimationFrame(() => { target.focus(); target.print(); });
  };
  frame.srcdoc = `<!doctype html><html><head><title>${escape(details.number)}</title><style>body{font:14px Arial;padding:24px;color:#222}table{width:100%;border-collapse:collapse}td{padding:12px;border:1px solid #ddd}td:first-child{font-weight:bold;width:35%}</style></head><body><h1>${escape(details.title)}</h1><table>${details.rows.map(([label, value]) => `<tr><td>${escape(label)}</td><td>${escape(value)}</td></tr>`).join("")}</table></body></html>`;
  document.body.appendChild(frame);
}

import { jsPDF } from "jspdf";

export const downloadFeeReceiptPdf = (receipt) => {
  if (!receipt) return;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const receiptNo = String(receipt.receiptNumber || receipt.receiptNo || "RECEIPT");
  const receiptDate = receipt.receiptDate || receipt.date || new Date().toISOString();
  const formattedDate = new Date(receiptDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Top decorative header
  doc.setFillColor(30, 58, 138); // Navy blue
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("COLLEGE MANAGEMENT SYSTEM", 105, 12, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("OFFICIAL FEE PAYMENT RECEIPT", 105, 20, { align: "center" });

  // Receipt meta card
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 34, 180, 22, 2, 2, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Receipt No:", 20, 42);
  doc.setFont("helvetica", "normal");
  doc.text(receiptNo, 45, 42);

  doc.setFont("helvetica", "bold");
  doc.text("Date:", 120, 42);
  doc.setFont("helvetica", "normal");
  doc.text(formattedDate, 140, 42);

  doc.setFont("helvetica", "bold");
  doc.text("Payment Mode:", 20, 50);
  doc.setFont("helvetica", "normal");
  doc.text(String(receipt.paymentMethod || receipt.paymentMode || "Cash"), 50, 50);

  doc.setFont("helvetica", "bold");
  doc.text("Status:", 120, 50);
  doc.setTextColor(22, 101, 52);
  doc.setFont("helvetica", "bold");
  doc.text("PAID / SUCCESS", 140, 50);

  // Student Details
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 62, 180, 42, 2, 2, "S");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Student Information", 20, 71);
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 73, 190, 73);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Student Name:", 20, 81);
  doc.setFont("helvetica", "normal");
  doc.text(String(receipt.studentName || "—"), 55, 81);

  doc.setFont("helvetica", "bold");
  doc.text("Admission No:", 115, 81);
  doc.setFont("helvetica", "normal");
  doc.text(String(receipt.admissionNumber || receipt.admissionNo || "—"), 145, 81);

  doc.setFont("helvetica", "bold");
  doc.text("Group / Course:", 20, 91);
  doc.setFont("helvetica", "normal");
  doc.text(String(receipt.groupName || receipt.programName || "General"), 55, 91);

  doc.setFont("helvetica", "bold");
  doc.text("Section:", 115, 91);
  doc.setFont("helvetica", "normal");
  doc.text(String(receipt.sectionName || "—"), 145, 91);

  if (receipt.transactionReference) {
    doc.setFont("helvetica", "bold");
    doc.text("Txn Ref:", 20, 99);
    doc.setFont("helvetica", "normal");
    doc.text(String(receipt.transactionReference), 55, 99);
  }

  // Payment Breakdown Table
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 112, 180, 9, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Description", 20, 118);
  doc.text("Amount (INR)", 185, 118, { align: "right" });

  doc.setFont("helvetica", "normal");
  const description = String(receipt.paymentType || receipt.remarks || "Academic Fee Collection");
  doc.text(description, 20, 129);

  const amountVal = Number(receipt.amount || 0);
  doc.text(`₹${amountVal.toLocaleString("en-IN")}`, 185, 129, { align: "right" });

  doc.setDrawColor(203, 213, 225);
  doc.line(15, 137, 195, 137);

  // Total Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total Paid:", 125, 147);
  doc.setTextColor(30, 58, 138);
  doc.text(`₹${amountVal.toLocaleString("en-IN")}`, 185, 147, { align: "right" });

  // Computer generated disclaimer
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("This is an electronically generated receipt issued by the College Management System.", 105, 180, { align: "center" });
  doc.text("No physical signature is required.", 105, 185, { align: "center" });

  doc.save(`${receiptNo}.pdf`);
};

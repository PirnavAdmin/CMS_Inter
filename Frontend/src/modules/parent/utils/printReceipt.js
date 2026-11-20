/**
 * Enterprise print utility for Parent Dashboard Fee Payment Receipts.
 * Uses an isolated hidden iframe to completely eliminate blank-page issues
 * caused by modal backdrop-filters, document.body overflow:hidden, and CSS isolation.
 */

export const printReceiptElement = (elementOrId, title = "Official Fee Payment Receipt") => {
  try {
    const element =
      typeof elementOrId === "string"
        ? document.getElementById(elementOrId)
        : elementOrId;

    if (!element) {
      console.warn("Receipt element not found, falling back to window.print()");
      window.print();
      return;
    }

    // Remove any existing print iframe
    const existingIframe = document.getElementById("parent-receipt-print-frame");
    if (existingIframe) {
      existingIframe.remove();
    }

    // Create an isolated hidden iframe
    const iframe = document.createElement("iframe");
    iframe.id = "parent-receipt-print-frame";
    iframe.title = title;
    iframe.setAttribute("aria-hidden", "true");
    Object.assign(iframe.style, {
      position: "fixed",
      left: "-9999px",
      top: "0px",
      width: "800px",
      height: "1100px",
      border: "0",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "-9999",
    });

    document.body.appendChild(iframe);

    const printWindow = iframe.contentWindow;
    const printDoc = printWindow?.document;

    if (!printWindow || !printDoc) {
      console.warn("Could not access iframe contentWindow, falling back to window.print()");
      window.print();
      return;
    }

    const cleanup = () => {
      try {
        printWindow.removeEventListener("afterprint", cleanup);
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch {
        // Safe cleanup ignore
      }
    };

    // Construct the complete standalone HTML for print
    printDoc.open();
    printDoc.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 15mm 12mm;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #0f172a !important;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 13px;
        line-height: 1.45;
        height: auto !important;
        overflow: visible !important;
      }
      .parent-receipt-sheet {
        width: 100% !important;
        max-width: 720px !important;
        margin: 0 auto !important;
        padding: 24px 28px !important;
        background: #ffffff !important;
        border: 1.5px solid #0f172a !important;
        border-radius: 8px !important;
        page-break-inside: avoid !important;
        display: block !important;
        visibility: visible !important;
      }
      .parent-receipt-header {
        text-align: center !important;
        border-bottom: 2px dashed #cbd5e1 !important;
        padding-bottom: 14px !important;
        margin-bottom: 16px !important;
      }
      .parent-receipt-header h2 {
        margin: 0 !important;
        font-size: 22px !important;
        color: #166534 !important;
        font-weight: 800 !important;
        letter-spacing: -0.2px !important;
      }
      .parent-receipt-header p {
        margin: 4px 0 0 !important;
        font-size: 13px !important;
        color: #64748b !important;
      }
      .receipt-title-badge {
        display: inline-block !important;
        margin-top: 8px !important;
        font-size: 13px !important;
        font-weight: 800 !important;
        color: #166534 !important;
        letter-spacing: 0.6px !important;
        text-transform: uppercase !important;
      }
      .parent-receipt-meta-grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 10px 24px !important;
        padding: 12px 16px !important;
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 8px !important;
        margin-bottom: 16px !important;
        font-size: 13px !important;
      }
      .parent-receipt-meta-grid > div {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        gap: 8px !important;
      }
      .parent-receipt-meta-grid span {
        color: #64748b !important;
        font-size: 12.5px !important;
      }
      .parent-receipt-meta-grid strong {
        color: #0f172a !important;
        font-weight: 700 !important;
      }
      .parent-receipt-table {
        width: 100% !important;
        table-layout: fixed !important;
        border-collapse: collapse !important;
        margin: 16px 0 !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 8px !important;
        overflow: hidden !important;
      }
      .parent-receipt-table th,
      .parent-receipt-table td {
        padding: 10px 14px !important;
        font-size: 13px !important;
        border-bottom: 1px solid #e2e8f0 !important;
        vertical-align: middle !important;
      }
      .parent-receipt-table th {
        background: #f1f5f9 !important;
        color: #334155 !important;
        font-weight: 700 !important;
        font-size: 12px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.3px !important;
      }
      .parent-receipt-table tr:last-child td {
        border-bottom: none !important;
      }
      .cell-desc {
        width: 36% !important;
        word-wrap: break-word !important;
        font-weight: 600 !important;
        color: #1e293b !important;
      }
      .cell-txn {
        width: 28% !important;
        word-break: break-all !important;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        font-size: 12px !important;
        color: #475569 !important;
      }
      .cell-amount {
        width: 18% !important;
        text-align: right !important;
        font-weight: 700 !important;
        color: #166534 !important;
        font-size: 14px !important;
      }
      .cell-status {
        width: 18% !important;
        text-align: center !important;
      }
      .cms-badge {
        display: inline-block !important;
        padding: 3px 8px !important;
        border-radius: 4px !important;
        font-size: 11.5px !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
      }
      .cms-badge-active {
        background: #dcfce7 !important;
        color: #166534 !important;
        border: 1px solid #bbf7d0 !important;
      }
      .cms-badge-warn {
        background: #fef3c7 !important;
        color: #92400e !important;
        border: 1px solid #fde68a !important;
      }
      .cms-badge-danger {
        background: #fee2e2 !important;
        color: #991b1b !important;
        border: 1px solid #fecaca !important;
      }
      .parent-receipt-foot-block {
        display: flex !important;
        justify-content: space-between !important;
        align-items: flex-end !important;
        margin-top: 20px !important;
        padding-top: 14px !important;
        border-top: 1px dashed #cbd5e1 !important;
      }
      .parent-receipt-foot-legal {
        font-size: 12px !important;
        color: #64748b !important;
        line-height: 1.45 !important;
      }
      .parent-receipt-foot-signature {
        text-align: center !important;
      }
      .sig-line {
        border-top: 1px solid #334155 !important;
        padding-top: 6px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        color: #1e293b !important;
        min-width: 170px !important;
      }
    </style>
  </head>
  <body>
    ${element.outerHTML}
  </body>
</html>`);
    printDoc.close();

    printWindow.addEventListener("afterprint", cleanup, { once: true });

    // Allow browser to parse and layout iframe contents before triggering print preview
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (err) {
        console.error("Iframe print error:", err);
        window.print();
      }
    }, 200);

    // Safety fallback cleanup
    setTimeout(cleanup, 60000);
  } catch (error) {
    console.error("Print execution failed, using window.print fallback:", error);
    window.print();
  }
};

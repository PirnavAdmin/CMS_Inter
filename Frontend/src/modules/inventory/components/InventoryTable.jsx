import DataTable from "@/shared/components/DataTable.jsx";
export default function InventoryTable(props) {
  return (
    <DataTable
      {...props}
      enablePdfExport
      enableTablePrint={false}
      excelExportLabel="Print Excel"
      pdfExportLabel="Print PDF"
    />
  );
}

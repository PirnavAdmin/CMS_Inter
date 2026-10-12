export function inventoryCsv(columns, rows) {
  const exportColumns = columns.filter((column) => column.exportable !== false);
  const cell = (value) => {
    let str = String(value ?? "");
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(str)) str = `'${str}`;
    return `"${str.replace(/"/g, '""')}"`;
  };
  return [
    exportColumns.map((column) => cell(column.label)).join(","),
    ...rows.map((row) => exportColumns.map((column) => cell(row[column.key])).join(",")),
  ].join("\r\n");
}

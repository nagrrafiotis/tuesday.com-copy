import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Reusable single-sheet Excel export button.
 * props: records, columns, sheetName, fileName, variant, className, label
 */
export default function ExcelExportButton({
  records = [],
  columns,
  sheetName = "Φύλλο",
  fileName,
  label = "Excel",
  variant = "outline",
  className = "",
  disabled = false,
}) {
  const handle = async () => {
    const { exportSheet } = await import("@/lib/excelExport");
    const name = fileName || `${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    exportSheet(records, columns, sheetName, name);
  };
  return (
    <Button variant={variant} onClick={handle} disabled={disabled || !records.length} className={className} title="Εξαγωγή σε Excel">
      <Download className="w-4 h-4 mr-1" />{label}
    </Button>
  );
}
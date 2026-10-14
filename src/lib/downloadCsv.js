/**
 * Download CSV text with a UTF-8 BOM so Excel displays Greek correctly.
 */
export function downloadCsv(csvText, filename) {
  const text = csvText.startsWith("\uFEFF") ? csvText : "\uFEFF" + csvText;
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default downloadCsv;
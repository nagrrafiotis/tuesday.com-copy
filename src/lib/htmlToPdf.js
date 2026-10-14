import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Renders an HTML string to a multi-page A4 PDF.
 * The HTML is rasterized by the browser (html2canvas), so Greek text renders
 * correctly (jsPDF's built-in fonts have no Greek glyphs).
 */
export async function htmlToPdf({ html, filename, orientation = "portrait" }) {
  const widthPx = orientation === "landscape" ? 1123 : 794;
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-9999px;top:0;background:#ffffff;width:${widthPx}px;box-sizing:border-box;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#1f2937;`;
  host.innerHTML = html;
  document.body.appendChild(host);

  // Page-break aware: measure rows that must not be split
  let canvas;
  try {
    canvas = await html2canvas(host, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: widthPx,
    });
  } finally {
    document.body.removeChild(host);
  }

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 6;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2 - 6;
  const pxPerMm = canvas.width / usableW;
  const pageHeightPx = Math.max(1, Math.floor(usableH * pxPerMm));
  const totalPages = Math.ceil(canvas.height / pageHeightPx);

  let renderedPx = 0;
  let page = 0;
  while (renderedPx < canvas.height) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - renderedPx);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHeight;
    const ctx = slice.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    if (page > 0) doc.addPage();
    doc.addImage(slice.toDataURL("image/png"), "PNG", margin, margin, usableW, sliceHeight / pxPerMm);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${page + 1} / ${totalPages}`, pageW / 2, pageH - 4, { align: "center" });
    renderedPx += sliceHeight;
    page++;
  }

  doc.save(filename);
}

export const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default htmlToPdf;
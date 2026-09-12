import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Export a table to a multi-page A4 PDF with correct Greek text rendering.
 *
 * Greek glyphs render correctly because the table is rasterized from real DOM
 * text via html2canvas (the browser renders Greek with system/web fonts),
 * instead of jsPDF's built-in standard fonts (Helvetica) which lack Greek
 * glyphs and produce garbled/missing text.
 *
 * Cell values may be a plain string or { text, color, align } to override the
 * column defaults (used for colored debit/credit amounts, footer tints, etc.).
 *
 * @param {Object} opts
 * @param {string} opts.title       - Header bar title.
 * @param {string} [opts.subtitle]  - Right-aligned header subtitle.
 * @param {Array<{label:string,align?:string}>} opts.columns
 * @param {Array<Array<string|{text:string,color?:string,align?:string}>>} opts.rows
 * @param {Array<string|{text:string,color?:string,align?:string}>} [opts.totals] - footer cells (length == columns.length)
 * @param {string} opts.filename
 * @param {"landscape"|"portrait"} [opts.orientation]
 */
export async function exportTableToPdf(opts) {
  const { title, subtitle, columns, rows, totals, filename, orientation = "landscape" } = opts;

  const cellText = (c) => (c && typeof c === "object" ? (c.text ?? "") : (c ?? ""));
  const cellAlign = (c, fallback) => (c && typeof c === "object" && c.align) ? c.align : (fallback || "left");
  const cellColor = (c) => (c && typeof c === "object" ? c.color : null);

  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-9999px;top:0;background:#ffffff;width:1123px;padding:24px;box-sizing:border-box;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#333;";

  // Header bar
  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;justify-content:space-between;align-items:center;background:#1e3a5f;color:#fff;padding:10px 16px;border-radius:8px;";
  const hTitle = document.createElement("span");
  hTitle.textContent = title;
  hTitle.style.cssText = "font-size:18px;font-weight:700;";
  header.appendChild(hTitle);
  if (subtitle) {
    const hSub = document.createElement("span");
    hSub.textContent = subtitle;
    hSub.style.cssText = "font-size:11px;opacity:0.9;";
    header.appendChild(hSub);
  }
  host.appendChild(header);

  // Table
  const table = document.createElement("table");
  table.style.cssText = "width:100%;border-collapse:collapse;margin-top:12px;font-size:12px;";

  const thead = document.createElement("thead");
  const trh = document.createElement("tr");
  trh.style.cssText = "background:#f3f4f6;";
  columns.forEach((c) => {
    const th = document.createElement("th");
    th.textContent = c.label;
    th.style.cssText = `text-align:${c.align || "left"};padding:8px 10px;font-weight:600;color:#505050;border-bottom:1px solid #e5e7eb;white-space:nowrap;`;
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((row, i) => {
    const tr = document.createElement("tr");
    if (i % 2 === 0) tr.style.background = "#f9fafb";
    columns.forEach((c, ci) => {
      const td = document.createElement("td");
      td.textContent = cellText(row[ci]);
      const color = cellColor(row[ci]);
      td.style.cssText = `text-align:${cellAlign(row[ci], c.align)};padding:6px 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px;${color ? `color:${color};` : ""}border-bottom:1px solid #f3f4f6;`;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  if (totals && totals.length) {
    const tfoot = document.createElement("tfoot");
    const trf = document.createElement("tr");
    trf.style.cssText = "background:#1e3a5f;color:#fff;";
    columns.forEach((c, ci) => {
      const td = document.createElement("td");
      td.textContent = cellText(totals[ci]);
      const color = cellColor(totals[ci]);
      td.style.cssText = `text-align:${cellAlign(totals[ci], c.align)};padding:8px 10px;font-weight:600;${color ? `color:${color};` : ""}`;
      trf.appendChild(td);
    });
    tfoot.appendChild(trf);
    table.appendChild(tfoot);
  }
  host.appendChild(table);

  document.body.appendChild(host);

  let canvas;
  try {
    canvas = await html2canvas(host, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: host.scrollWidth,
    });
  } finally {
    document.body.removeChild(host);
  }

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 8;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;
  const pxPerMm = canvas.width / usableW;
  const pageHeightPx = Math.max(1, Math.floor(usableH * pxPerMm));

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
    const imgData = slice.toDataURL("image/png");
    const sliceHmm = sliceHeight / pxPerMm;
    if (page > 0) doc.addPage();
    doc.addImage(imgData, "PNG", margin, margin, usableW, sliceHmm);
    renderedPx += sliceHeight;
    page++;
  }

  doc.save(filename);
}

export default exportTableToPdf;
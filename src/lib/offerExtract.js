import * as XLSX from "xlsx";
import { base44 } from "@/api/base44Client";

const ITEMS_SCHEMA = {
  type: "object",
  properties: {
    vendor: { type: "string" },
    offer_date: { type: "string" },
    total_amount: { type: "number" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string" },
          unit_price: { type: "number" },
          total: { type: "number" },
        },
      },
    },
  },
};

const toNum = (v) => {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? (isNaN(Number(v)) ? 0 : Number(v)) : n;
};

const normalizeItems = (out) => {
  let raw = [];
  const meta = {};
  if (Array.isArray(out)) raw = out;
  else if (out && typeof out === "object") {
    raw = out.items || out.line_items || out.rows || [];
    meta.vendor = out.vendor || "";
    meta.offer_date = out.offer_date || out.date || "";
    meta.total_amount = Number(out.total_amount) || 0;
  }
  const items = raw.map((r) => ({
    description: r.description || r.desc || r.item || r.title || "",
    quantity: Number(r.quantity ?? r.qty ?? 1) || 1,
    unit: r.unit || "",
    unit_cost: Number(r.unit_price ?? r.price ?? 0) || 0,
    total: Number(r.total ?? r.amount ?? 0) || 0,
    category: r.category || "materials",
    subcategory: r.subcategory || "",
  })).filter((it) => (it.description && it.description.trim()) || it.total);
  items.forEach((it) => {
    if (!it.total && it.unit_cost && it.quantity) it.total = it.unit_cost * it.quantity;
  });
  return { items, meta };
};

const mapExcelRows = (rows) => {
  const headers = (rows[0] || []).map((h) => String(h || "").toLowerCase().trim());
  const findIdx = (keys) => headers.findIndex((h) => keys.some((k) => h.includes(k)));
  const descIdx = findIdx(["περιγραφή", "description", "item", "ονομασία", "εργασία", "αγαθό", "υλικό"]);
  const qtyIdx = findIdx(["ποσότητα", "quantity", "qty", "ποσ"]);
  const unitIdx = findIdx(["μονάδα", "unit", "μον"]);
  const priceIdx = findIdx(["τιμή", "τιμη", "unit_price", "price", "αξία", "κόστος"]);
  const totalIdx = findIdx(["σύνολο", "total", "amount", "συνολική"]);
  const items = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || [];
    if (!r.length || r.every((c) => c === "" || c == null)) continue;
    const description = descIdx >= 0 ? String(r[descIdx] ?? "") : String(r[0] ?? "");
    if (!description.trim()) continue;
    const quantity = qtyIdx >= 0 ? toNum(r[qtyIdx]) || 1 : 1;
    const unit = unitIdx >= 0 ? String(r[unitIdx] ?? "") : "";
    const unit_cost = priceIdx >= 0 ? toNum(r[priceIdx]) : 0;
    let total = totalIdx >= 0 ? toNum(r[totalIdx]) : 0;
    if (!total && unit_cost && quantity) total = unit_cost * quantity;
    items.push({ description, quantity, unit, unit_cost, total, category: "materials", subcategory: "" });
  }
  return { items, meta: {} };
};

export async function extractOfferFromFile(file, file_url) {
  const name = (file?.name || file_url || "").toLowerCase();

  // Excel / CSV → local parse (no AI credits)
  if (/\.(xlsx|xls|csv)$/.test(name)) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    return mapExcelRows(rows);
  }

  // PDF / images / Word → InvokeLLM (vision-capable model reads the file and returns structured JSON)
  if (/\.(pdf|png|jpg|jpeg|doc|docx)$/.test(name)) {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt:
        "Διάβασε αυτό το έγγραφο προσφοράς/quote και εξήγαγε τις γραμμές της. Επέστρεψε JSON με: vendor (όνομα προμηθευτή, string), offer_date (σε μορφή YYYY-MM-DD αν υπάρχει), total_amount (αριθμός), και items (πίνακας από αντικείμενα με πεδία description, quantity (αριθμός), unit (string), unit_price (αριθμός), total (αριθμός)). Συμπεριέλαβε ΜΟΝΟ πραγματικές γραμμές είδους, όχι επικεφαλίδες ή γραμμές συνόλων. Ελληνικά όπου απαιτείται.",
      file_urls: [file_url],
      response_json_schema: ITEMS_SCHEMA,
    });
    return normalizeItems(res);
  }

  throw new Error("Μη υποστηριζόμενος τύπος αρχείου (PDF, Excel, Word, εικόνα)");
}

export default extractOfferFromFile;
import * as XLSX from "xlsx";

const normHeader = (s) =>
  String(s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const parseGreekDate = (raw) => {
  if (raw === null || raw === undefined || raw === "") return "";
  if (typeof raw === "number") {
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{5}$/.test(s)) {
    const d = new Date(Math.round((parseInt(s, 10) - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  return "";
};

export const parseAmount = (raw) => {
  if (raw === null || raw === undefined || raw === "") return 0;
  if (typeof raw === "number") return raw;
  return (
    parseFloat(String(raw).replace(/\./g, "").replace(",", ".").replace(/[^\d\-\.]/g, "")) || 0
  );
};

// Read first sheet into { sheetNames, sheetName, headers, sampleRows, allRows }.
// Auto-detects the header row as the first row with >= 3 non-empty cells.
export const parseWorkbook = async (file) => {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: "array", raw: false, cellDates: false });
  const sheetNames = wb.SheetNames || [];
  if (sheetNames.length === 0) {
    return { sheetNames: [], sheetName: "", headers: [], sampleRows: [], allRows: [] };
  }
  const sheetName = sheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });

  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const nonEmpty = (rows[i] || []).filter((c) => String(c || "").trim() !== "").length;
    if (nonEmpty >= 3) { headerIdx = i; break; }
  }
  if (headerIdx < 0) headerIdx = 0;

  const headerRow = rows[headerIdx] || [];
  const maxLen = Math.max(
    headerRow.length,
    ...rows.slice(headerIdx + 1, headerIdx + 50).map((r) => (r || []).length)
  );
  const headers = [];
  for (let i = 0; i < maxLen; i++) {
    const h = String(headerRow[i] || "").trim();
    headers[i] = h || `Στήλη ${i + 1}`;
  }

  const sampleRows = rows.slice(headerIdx + 1, headerIdx + 8).map((r) => {
    const padded = new Array(headers.length).fill("");
    for (let i = 0; i < headers.length; i++) padded[i] = r[i] !== undefined ? r[i] : "";
    return padded;
  });
  const allRows = rows.slice(headerIdx + 1);

  return { sheetNames, sheetName, headers, sampleRows, allRows };
};

// Auto-suggest mappings based on header text (Greek + English).
export const guessMappings = (headers) => {
  const m = {
    date: -1, description: -1, counterparty: -1,
    amount: -1, debit: -1, credit: -1,
    reference: -1, payment_source: -1,
  };
  headers.forEach((h, i) => {
    const n = normHeader(h);
    if (!n) return;
    if (m.date < 0 && (n.includes("ημερομ") || n === "date" || n.includes("ημ/ν") || n.includes("valor"))) m.date = i;
    else if (m.debit < 0 && (n.includes("χρεωσ") || n === "debit" || n === "χρέωση" || n.includes("χρέωσ"))) m.debit = i;
    else if (m.credit < 0 && (n.includes("πιστωσ") || n === "credit" || n === "πίστωση" || n.includes("πιστωσ"))) m.credit = i;
    else if (m.amount < 0 && (n.includes("ποσο") || n === "amount" || n === "ποσό" || n.includes("ξένο") || n.includes("eur") || n === "αξία" || n.includes(" αξία"))) m.amount = i;
    else if (m.description < 0 && (n.includes("περιγρ") || n.includes("αιτιολ") || n.includes("descr") || n.includes("αναλυτ") || n.includes("κινησ") || n.includes("σχολιο"))) m.description = i;
    else if (m.reference < 0 && (n.includes("αναφορ") || n.includes("reference") || n.includes("αρίθμιση") || n.includes("ref") || n.includes("voucher") || n.includes("αρ."))) m.reference = i;
    else if (m.counterparty < 0 && (n.includes("αντισυμβ") || n.includes("benefici") || n.includes("counterpart") || n.includes("επων") || n.includes("ονομ") || n.includes("δικαιουχ") || n.includes("δικαιούχο"))) m.counterparty = i;
    else if (m.payment_source < 0 && (n.includes("πηγ") || n.includes("λογαριασ") || n.includes("account") || n.includes("iban") || n.includes("wallet"))) m.payment_source = i;
  });
  return m;
};

export const TARGET_FIELDS = [
  { key: "date", label: "Ημερομηνία", required: true, group: "core" },
  { key: "description", label: "Περιγραφή / Αιτιολογία", required: false, group: "core" },
  { key: "counterparty", label: "Αντισυμβαλλόμενος", required: false, group: "core" },
  { key: "reference", label: "Αριθμός αναφοράς", required: false, group: "core" },
  { key: "payment_source", label: "Πηγή πληρωμής / Λογαριασμός", required: false, group: "core" },
  { key: "amount", label: "Ποσό (μονή στήλη, με πρόσημο)", required: false, group: "amount", note: "Χρησιμοποιείται όταν υπάρχει μία στήλη με θετικό/αρνητικό ποσό" },
  { key: "debit", label: "Χρέωση (ξεχωριστή στήλη)", required: false, group: "amount", note: "Αν χρησιμοποιείς αυτό, δεν precisa στήλη Ποσού" },
  { key: "credit", label: "Πίστωση (ξεχωριστή στήλη)", required: false, group: "amount", note: "Αν χρησιμοποιείς αυτό, δεν precisa στήλη Ποσού" },
];

// Convert rows → transaction objects using the chosen mapping.
export const applyMapping = (parsed, mapping) => {
  const out = [];
  for (const row of parsed.allRows) {
    if (!row) continue;
    const rawDate = mapping.date >= 0 ? row[mapping.date] : null;
    if (rawDate === null || rawDate === undefined || String(rawDate).trim() === "") continue;
    const date = parseGreekDate(rawDate);
    if (!date) continue;
    const description = mapping.description >= 0 ? String(row[mapping.description] || "").trim() : "";
    const counterparty = mapping.counterparty >= 0 ? String(row[mapping.counterparty] || "").trim() : "";
    const reference = mapping.reference >= 0 ? String(row[mapping.reference] || "").trim() : "";
    const payment_source = mapping.payment_source >= 0 ? String(row[mapping.payment_source] || "").trim() : "";
    let amount = 0, transaction_type = "debit";
    if (mapping.debit >= 0 && mapping.credit >= 0) {
      const debit = parseAmount(row[mapping.debit]);
      const credit = parseAmount(row[mapping.credit]);
      if (credit > 0) { amount = credit; transaction_type = "credit"; }
      else if (debit > 0) { amount = debit; transaction_type = "debit"; }
      else continue;
    } else if (mapping.amount >= 0) {
      const raw = parseAmount(row[mapping.amount]);
      if (!raw) continue;
      amount = Math.abs(raw);
      transaction_type = raw < 0 ? "debit" : "credit";
    } else {
      continue;
    }
    out.push({
      date, description, counterparty, amount, transaction_type,
      reference, payment_source, reconciled: false,
    });
  }
  return out;
};
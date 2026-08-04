// Δεντέψης διπλότυπων πληρωμών.
// Match: ίδιο ποσό AND (ίδια ημερομηνία OR ίδιος κωδικός περιγραφής).

const normalize = (s) =>
  (s ?? "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getAmount = (rec, config) => Math.abs(Number(rec?.[config.amountField]) || 0);
const amountEqual = (a, config, rec) => Math.abs(getAmount(a, config) - getAmount(rec, config)) < 0.005;
const dateEqual = (a, b) => {
  if (!a || !b) return false;
  return String(a).slice(0, 10) === String(b).slice(0, 10);
};

function getRecordKey(rec, config) {
  return config.keyFields
    .map((f) => normalize(rec?.[f]))
    .filter(Boolean)
    .join("|");
}

/**
 * Βρίσκει υπάρχουσες εγγραφές που είναι duplicates της `newRecord`.
 * Αγνοεί την ίδια την εγγραφή όταν δίνεται `newRecord.id` (για edit).
 */
export function findDuplicateMatches(newRecord, existingRecords, config) {
  const newKey = getRecordKey(newRecord, config);
  return (existingRecords || []).filter((r) => {
    if (newRecord.id && r.id === newRecord.id) return false;
    if (!amountEqual(newRecord, config, r)) return false;
    const dateM = dateEqual(newRecord[config.dateField], r[config.dateField]);
    const keyM = newKey && newKey === getRecordKey(r, config);
    return dateM || keyM;
  });
}

/**
 * Βρίσκει όλες τις ομάδες duplicates σε μια συλλογή.
 * Επιστρέφει array από arrays εγγραφών.
 */
export function findAllDuplicateGroups(records, config) {
  const list = records || [];
  const groups = [];
  const used = new Set();

  list.forEach((a, i) => {
    if (used.has(a.id)) return;
    const group = [a];
    list.slice(i + 1).forEach((b) => {
      if (used.has(b.id)) return;
      if (!amountEqual(a, config, b)) return;
      const dateM = dateEqual(a[config.dateField], b[config.dateField]);
      const aKey = getRecordKey(a, config);
      const keyM = aKey && aKey === getRecordKey(b, config);
      if (dateM || keyM) {
        group.push(b);
        used.add(b.id);
      }
    });
    if (group.length > 1) {
      group.forEach((g) => used.add(g.id));
      groups.push(group);
    }
  });
  return groups;
}

export const duplicateConfigs = {
  BankTransaction: {
    amountField: "amount",
    dateField: "date",
    keyFields: ["description", "reference", "counterparty"],
    entityLabel: "Κίνηση",
  },
  Payroll: {
    amountField: "net_salary",
    dateField: "payment_date",
    keyFields: ["employee_name", "period"],
    entityLabel: "Μισθοδοσία",
  },
  GeneralExpense: {
    amountField: "amount",
    dateField: "date",
    keyFields: ["description", "payee"],
    entityLabel: "Έξοδο",
  },
  GeneralIncome: {
    amountField: "total_amount",
    dateField: "date",
    keyFields: ["description", "invoice_number", "payer"],
    entityLabel: "Έσοδο",
  },
};
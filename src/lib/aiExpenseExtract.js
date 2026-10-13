import { base44 } from "@/api/base44Client";

const CHUNK_SIZE = 40;

const SCHEMA = {
  type: "object",
  properties: {
    expenses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD" },
          project: { type: "string" },
          payee: { type: "string" },
          description: { type: "string" },
          amount: { type: "number" },
          category: { type: "string", enum: ["labor", "subcontractor", "materials", "equipment", "general_expenses"] },
          subcategory: { type: "string" },
          payment_source: { type: "string" },
        },
      },
    },
  },
};

/**
 * Uses AI to understand arbitrary spreadsheet rows (any column names/layout)
 * and convert them into expense records. Rows are processed in chunks.
 * onProgress(done, total) is called after each chunk.
 */
export async function extractExpensesWithAI(rows, projectNames, onProgress) {
  const clean = rows.filter((r) => Object.values(r).some((v) => v !== "" && v !== null && v !== undefined));
  const out = [];

  for (let i = 0; i < clean.length; i += CHUNK_SIZE) {
    const chunk = clean.slice(i, i + CHUNK_SIZE).map((r) => {
      const o = {};
      Object.entries(r).forEach(([k, v]) => {
        o[k] = v instanceof Date ? v.toISOString().split("T")[0] : v;
      });
      return o;
    });

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Είσαι βοηθός λογιστικής. Παρακάτω είναι γραμμές από αρχείο Excel/CSV με έξοδα έργων (οι στήλες μπορεί να έχουν οποιαδήποτε ονομασία, ελληνικά ή αγγλικά).
Μετάτρεψε ΚΑΘΕ γραμμή που είναι έξοδο σε εγγραφή. Αγνόησε κενές γραμμές, επικεφαλίδες, υποσύνολα και γενικά σύνολα.

Κανόνες:
- date: μορφή YYYY-MM-DD (οι ημερομηνίες είναι ελληνικές dd/mm/yyyy). Αν λείπει, άφησέ το κενό.
- amount: θετικός αριθμός (απόλυτη τιμή, χωρίς σύμβολα νομίσματος).
- payee: δικαιούχος/προμηθευτής.
- project: ταίριαξε με ένα από τα υπάρχοντα έργα αν είναι εμφανές: ${JSON.stringify(projectNames)}. Αλλιώς κενό.
- category: ένα από labor (εργατικά), subcontractor (υπεργολάβοι), materials (υλικά), equipment (εξοπλισμός), general_expenses (γενικά έξοδα). Επέλεξε την πιο λογική με βάση την περιγραφή και τον δικαιούχο.
- subcategory, payment_source, description: αν υπάρχουν στο αρχείο.

Γραμμές:
${JSON.stringify(chunk)}`,
      response_json_schema: SCHEMA,
    });

    out.push(...(res?.expenses || []));
    onProgress?.(Math.min(i + CHUNK_SIZE, clean.length), clean.length);
  }

  return out;
}
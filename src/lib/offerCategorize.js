import { base44 } from "@/api/base44Client";

const catLabel = (c) => c.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export async function categorizeOffer(items, categories, subcategories) {
  if (!items?.length) return { items, offer_type: "" };
  const labeledCats = categories.map(catLabel);

  const res = await base44.integrations.Core.InvokeLLM({
    prompt:
      "Είσαι βοηθός κατηγοριοποίησης προσφορών κατασκευαστικού/τεχνικού έργου. Για ΚΑΘΕ γραμμή της προσφοράς (με βάση την περιγραφή της) ανάθεσε:\n" +
      "1) μία κατηγορία από τη Λίστα Κατηγοριών (χρησιμοποίησε ακριβώς την τιμή-κλειδί, π.χ. labor, subcontractor, materials, equipment, general_expenses)\n" +
      "2) αν υπάρχει ταιριαστή, μία υποκατηγορία από τη Λίστα Υποκατηγοριών (ακριβές όνομα), αλλιώς κενό.\n" +
      "Επίσης όρισε το Είδος/τύπος ΟΛΗΣ της προσφοράς (μικρή φράση, π.χ. «Υλικά», «Εργασίες Αλουμινίου», «Εξοπλισμός», «Μεταφορικά»).\n\n" +
      `Λίστα Κατηγοριών (τιμή-κλειδί | ετικέτα): ${categories.map((c) => `${c} | ${catLabel(c)}`).join(", ")}\n` +
      `Λίστα Υποκατηγοριών: ${subcategories.join(", ")}\n\n` +
      `Γραμμές προσφοράς (JSON): ${JSON.stringify(items.map((it, i) => ({ index: i, description: it.description || "" })))}\n\n` +
      "Επέστρεψε JSON με πεδία: offer_type (string) και items (πίνακας από {index:number, category:string, subcategory:string}). Η category πρέπει να είναι ακριβώς μία από τις τιμές-κλειδιά της λίστας.",
    response_json_schema: {
      type: "object",
      properties: {
        offer_type: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              index: { type: "number" },
              category: { type: "string" },
              subcategory: { type: "string" },
            },
          },
        },
      },
    },
  });

  const result = res || {};
  const map = {};
  (result.items || []).forEach((a) => {
    if (a && typeof a.index === "number" && categories.includes(a.category)) map[a.index] = a;
  });
  const categorized = items.map((it, i) => ({
    ...it,
    category: map[i]?.category || it.category || "materials",
    subcategory: map[i]?.subcategory || it.subcategory || "",
  }));
  return { items: categorized, offer_type: result.offer_type || "" };
}

export default categorizeOffer;
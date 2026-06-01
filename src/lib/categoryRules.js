/**
 * Applies category rules to a description/payee text.
 * Rules are sorted by priority (desc). First match wins.
 * Returns { category, subcategory } or null if no match.
 */
export function applyRules(text, rules) {
  if (!text || !rules?.length) return null;
  const lower = text.toLowerCase();
  const sorted = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  for (const rule of sorted) {
    if (!rule.keyword) continue;
    if (lower.includes(rule.keyword.toLowerCase())) {
      return {
        category: rule.category,
        subcategory: rule.subcategory || "",
      };
    }
  }
  return null;
}
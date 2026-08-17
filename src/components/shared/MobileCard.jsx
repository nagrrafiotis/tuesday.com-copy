import React from "react";

/**
 * Reusable mobile card used to display a single record on small screens,
 * as a responsive alternative to wide data tables.
 *
 * Props:
 * - title: main record title (string/element)
 * - badge: small badge(s) shown under title (element)
 * - titleRight: right-aligned element (e.g. amount)
 * - meta: secondary single-line text under title
 * - rows: array of { label, value, className, fullWidth, align }
 * - actions: element (buttons) rendered in a right-aligned footer
 */
export function MobileCard({ title, badge, titleRight, meta, rows, actions }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[#1e3a5f] break-words leading-snug">{title}</p>
          {badge && <div className="mt-1 flex flex-wrap gap-1">{badge}</div>}
        </div>
        {titleRight && <div className="shrink-0 text-right">{titleRight}</div>}
      </div>
      {meta && <div className="text-xs text-gray-500 break-words">{meta}</div>}
      {rows?.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
          {rows.map((r, i) => (
            <div key={i} className={r.fullWidth ? "col-span-2" : ""}>
              <dt className="text-[10px] uppercase tracking-wide text-gray-400">{r.label}</dt>
              <dd className={`text-sm ${r.align === "right" ? "text-right" : ""} ${r.className || "text-gray-700"}`}>{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions && (
        <div className="flex justify-end gap-1 pt-2 border-t border-gray-50">{actions}</div>
      )}
    </div>
  );
}

export default MobileCard;
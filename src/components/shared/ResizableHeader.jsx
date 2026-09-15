import React, { useRef } from "react";

/**
 * Resizable table header with drag-to-resize and double-click auto-fit.
 * @param {number} width - current column width in px
 * @param {(w:number)=>void} onResize - called with new width during drag
 * @param {()=>void} onAutoFit - called on double-click of the resize handle
 */
export default function ResizableHeader({ width, onResize, onAutoFit, children, className = "", align = "left" }) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width || 120;

    const onMove = (ev) => {
      if (!dragging.current) return;
      const delta = ev.clientX - startX.current;
      onResize(Math.max(60, startW.current + delta));
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return (
    <th
      className={`relative select-none px-3 py-3 font-medium text-gray-500 whitespace-nowrap ${alignClass} ${className}`}
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <div className="pr-3">{children}</div>
      <div
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-center hover:bg-blue-200/40 group z-10"
        onMouseDown={onMouseDown}
        onDoubleClick={onAutoFit}
        title="Σύρε για προσαρμογή πλάτους | Διπλό κλικ για auto-fit"
      >
        <div className="w-px h-4 bg-gray-300 group-hover:bg-blue-400" />
      </div>
    </th>
  );
}
import { useState, useCallback, useEffect } from 'react';

const MIN_WIDTH = 60;

/**
 * useColumnWidths — manage resizable column widths with optional localStorage persistence.
 * @param {string} storageKey - if provided, widths persist across sessions under this key
 * @param {object} initialWidths - { columnName: px }
 */
export function useColumnWidths(storageKey, initialWidths = {}) {
  const [widths, setWidths] = useState(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`colw:${storageKey}`);
        if (saved) return { ...initialWidths, ...JSON.parse(saved) };
      } catch {}
    }
    return initialWidths;
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(`colw:${storageKey}`, JSON.stringify(widths));
    } catch {}
  }, [storageKey, widths]);

  const setColumnWidth = useCallback((columnName, width) => {
    setWidths(prev => ({ ...prev, [columnName]: Math.max(MIN_WIDTH, width) }));
  }, []);

  const autoFitColumn = useCallback((columnName, content) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '500 14px Inter, system-ui, sans-serif';
    const text = typeof content === 'string' ? content : String(content || '');
    const metrics = context.measureText(text);
    const width = Math.max(MIN_WIDTH, Math.ceil(metrics.width) + 40);
    setWidths(prev => ({ ...prev, [columnName]: width }));
  }, []);

  const autoFitByHeader = useCallback((columnName) => {
    const el = document.querySelector(`[data-column="${columnName}"]`);
    if (el) {
      autoFitColumn(columnName, el.textContent || '');
    }
  }, [autoFitColumn]);

  const autoFitAll = useCallback((columns) => {
    const next = {};
    columns.forEach(({ key, label, getContent }) => {
      let text = label || '';
      if (getContent) {
        // sample a few visible rows for width
        const rows = document.querySelectorAll(`[data-row="${key}"]`);
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
          const t = rows[i]?.textContent || '';
          if (t.length > text.length) text = t;
        }
      }
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.font = '500 14px Inter, system-ui, sans-serif';
      const metrics = ctx.measureText(text);
      next[key] = Math.max(MIN_WIDTH, Math.ceil(metrics.width) + 40);
    });
    setWidths(prev => ({ ...prev, ...next }));
  }, []);

  const resetWidth = useCallback((columnName) => {
    setWidths(prev => {
      const next = { ...prev };
      delete next[columnName];
      return next;
    });
  }, []);

  const resetAll = useCallback(() => setWidths(initialWidths), []);

  return {
    widths,
    setColumnWidth,
    autoFitColumn,
    autoFitByHeader,
    autoFitAll,
    resetWidth,
    resetAll,
  };
}
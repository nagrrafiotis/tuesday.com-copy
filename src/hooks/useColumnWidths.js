import { useState, useCallback } from 'react';

export function useColumnWidths(initialWidths = {}) {
  const [widths, setWidths] = useState(initialWidths);

  const autoAdjustWidth = useCallback((columnName, content) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = 'inherit';
    
    const text = typeof content === 'string' ? content : String(content || '');
    const metrics = context.measureText(text);
    
    // Add padding and minimum width
    const width = Math.max(100, Math.ceil(metrics.width) + 32);
    
    setWidths(prev => ({
      ...prev,
      [columnName]: width
    }));
  }, []);

  const autoAdjustColumnByHeader = useCallback((columnName) => {
    const headerElement = document.querySelector(`[data-column="${columnName}"]`);
    if (headerElement) {
      const textContent = headerElement.textContent || '';
      autoAdjustWidth(columnName, textContent);
    }
  }, [autoAdjustWidth]);

  const resetWidth = useCallback((columnName) => {
    setWidths(prev => {
      const newWidths = { ...prev };
      delete newWidths[columnName];
      return newWidths;
    });
  }, []);

  return {
    widths,
    autoAdjustWidth,
    autoAdjustColumnByHeader,
    resetWidth
  };
}
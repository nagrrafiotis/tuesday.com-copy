import React, { useState } from "react";

/**
 * BudgetDebugLog — shows a live log of every save operation with before/after diff.
 * Helps identify exactly which fields are being lost and when.
 */
export default function BudgetDebugLog({ log, visible, onToggle }) {
  const [expandedEntry, setExpandedEntry] = useState(null);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onToggle}
          className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2"
        >
          {visible ? "▼ Κρύψε" : "▶ Δες"} Debug Log ({log.length} ενέργειες)
        </button>
        {visible && log.length > 0 && (
          <span className="text-xs text-gray-400">Κλίκ σε γραμμή για λεπτομέρειες</span>
        )}
      </div>

      {visible && (
        <div className="mt-2 bg-gray-950 text-gray-100 rounded-xl text-xs font-mono max-h-64 overflow-y-auto border border-gray-800">
          {log.length === 0 ? (
            <p className="p-4 text-gray-500">Καμία ενέργεια ακόμα.</p>
          ) : (
            log.map((entry) => (
              <div key={entry.id}>
                <div
                  className={`flex gap-2 px-3 py-1.5 cursor-pointer border-b border-gray-800 hover:bg-gray-900 ${
                    expandedEntry === entry.id ? "bg-gray-900" : ""
                  }`}
                  onClick={() =>
                    setExpandedEntry(expandedEntry === entry.id ? null : entry.id)
                  }
                >
                  <span className="text-gray-500 shrink-0">{entry.time}</span>
                  <span
                    className={`shrink-0 font-bold ${
                      entry.action === "ERROR"
                        ? "text-red-400"
                        : entry.action === "SAVE"
                        ? "text-yellow-400"
                        : entry.action === "DONE"
                        ? "text-green-400"
                        : "text-blue-400"
                    }`}
                  >
                    [{entry.action}]
                  </span>
                  <span className="text-gray-200 truncate">{entry.summary}</span>
                  {entry.diff && <span className="ml-auto text-gray-500 shrink-0">↕ diff</span>}
                </div>

                {expandedEntry === entry.id && (
                  <div className="bg-gray-900 px-4 py-3 border-b border-gray-800 space-y-2">
                    {entry.diff ? (
                      <>
                        <p className="text-gray-400 font-bold">Αλλαγές (field → πριν → μετά):</p>
                        {entry.diff.map((d, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-purple-400 shrink-0 w-32 truncate">{d.field}</span>
                            <span className="text-red-400 line-through truncate w-40">{JSON.stringify(d.before)}</span>
                            <span className="text-green-400 truncate w-40">{JSON.stringify(d.after)}</span>
                          </div>
                        ))}
                        {entry.diff.length === 0 && (
                          <p className="text-gray-500">Δεν βρέθηκαν διαφορές.</p>
                        )}
                      </>
                    ) : (
                      <pre className="text-gray-300 whitespace-pre-wrap break-all">
                        {entry.details}
                      </pre>
                    )}
                    {entry.itemSnapshot && (
                      <>
                        <p className="text-gray-400 font-bold mt-2">Snapshot item που αποθηκεύτηκε:</p>
                        <pre className="text-gray-300 whitespace-pre-wrap break-all text-[10px]">
                          {JSON.stringify(entry.itemSnapshot, null, 2)}
                        </pre>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
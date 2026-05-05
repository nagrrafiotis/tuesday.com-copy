import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Cloud } from "lucide-react";

export default function SaveIndicator({ isSaving }) {
  const [phase, setPhase] = useState("idle"); // idle | saving | saved
  const savedTimerRef = useRef(null);

  useEffect(() => {
    if (isSaving) {
      // Clear any pending "hide saved" timer
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      setPhase("saving");
    } else if (phase === "saving") {
      // Just finished saving → show "saved" for 2.5s
      setPhase("saved");
      savedTimerRef.current = setTimeout(() => setPhase("idle"), 2500);
    }
    return () => {};
  }, [isSaving]);

  const visible = phase !== "idle";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="save-indicator"
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-white border border-gray-200 shadow-xl rounded-full px-5 py-2.5 text-sm font-medium"
        >
          {phase === "saving" ? (
            <>
              <Loader2 className="w-4 h-4 text-[#1e3a5f] animate-spin shrink-0" />
              <span className="text-gray-700">Αποθήκευση…</span>
            </>
          ) : (
            <>
              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </div>
              <span className="text-gray-700">Αποθηκεύτηκε</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
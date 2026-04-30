import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

/**
 * SaveIndicator - shows saving/saved status in the bottom-left corner.
 * Props:
 *   isSaving: boolean - true while any mutation is pending
 */
export default function SaveIndicator({ isSaving }) {
  const [showSaved, setShowSaved] = useState(false);
  const [prevSaving, setPrevSaving] = useState(false);

  useEffect(() => {
    if (prevSaving && !isSaving) {
      // Just finished saving → show "Saved" for 2.5s
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2500);
      return () => clearTimeout(timer);
    }
    setPrevSaving(isSaving);
  }, [isSaving]);

  const visible = isSaving || showSaved;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-5 left-5 z-50 flex items-center gap-2 bg-white border border-gray-200 shadow-lg rounded-full px-4 py-2 text-sm"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 text-[#1e3a5f] animate-spin" />
              <span className="text-gray-600 font-medium">Saving…</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-gray-600 font-medium">Saved</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
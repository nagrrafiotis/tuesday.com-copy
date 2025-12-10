import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react";
import { motion } from "framer-motion";

export default function GroupByMenu({ groupBy, columns, onChange, onClose }) {
  const groupOptions = [
    { id: 'group', label: 'Default Groups', type: 'default' },
    { id: 'status', label: 'Status', type: 'status' },
    { id: 'owner', label: 'Person', type: 'people' },
    { id: 'priority', label: 'Priority', type: 'priority' },
    ...columns.filter(col => col.type === 'dropdown' || col.type === 'tags')
      .map(col => ({ id: col.id, label: col.title, type: col.type }))
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-full left-0 mt-2 z-50"
    >
      <Card className="w-64 shadow-lg border-[#E1E5F3]">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-bold text-[#323338]">Group By</CardTitle>
          <button onClick={onClose} className="text-[#676879] hover:text-[#323338]">
            <X className="w-4 h-4" />
          </button>
        </CardHeader>
        <CardContent className="space-y-1">
          {groupOptions.map((option) => (
            <Button
              key={option.id}
              variant="ghost"
              className={`w-full justify-between h-auto p-3 ${
                groupBy === option.id ? 'bg-[#E1E5F3] text-[#0073EA]' : 'hover:bg-[#F5F6F8]'
              }`}
              onClick={() => {
                onChange(option.id);
                onClose();
              }}
            >
              <span>{option.label}</span>
              {groupBy === option.id && <Check className="w-4 h-4" />}
            </Button>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function SearchableSelect({ 
  value, 
  onValueChange, 
  placeholder, 
  items, 
  className,
  triggerClassName 
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = items.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={className}>
        <div className="px-2 pb-2 sticky top-0 bg-white z-10">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        {filteredItems.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            <div>
              <div>{item.label}</div>
              {item.subtitle && (
                <div className="text-xs text-gray-500">{item.subtitle}</div>
              )}
            </div>
          </SelectItem>
        ))}
        {filteredItems.length === 0 && (
          <div className="py-6 text-center text-sm text-gray-500">
            No results found
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Settings as SettingsIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEFAULT_LISTS = {
  units: ["m", "m²", "m³", "kg", "piece", "day"],
  expense_categories: ["labor", "subcontractor", "materials", "equipment", "general_expenses"],
  property_types: ["residential", "commercial", "mixed_use", "industrial", "land"],
  project_status: ["planning", "in_progress", "on_hold", "completed"],
  task_status: ["todo", "in_progress", "review", "completed"],
  task_phases: ["pre_construction", "permits", "foundation", "construction", "finishing", "inspection", "handover"],
  priority_levels: ["low", "medium", "high", "urgent", "critical"],
  contact_categories: ["client", "supplier", "contractor", "partner", "other"],
};

const LIST_LABELS = {
  units: "Units",
  expense_categories: "Expense Categories",
  property_types: "Property Types",
  project_status: "Project Status",
  task_status: "Task Status",
  task_phases: "Task Phases",
  priority_levels: "Priority Levels",
  contact_categories: "Contact Categories",
};

export default function Settings() {
  const queryClient = useQueryClient();
  const [newItems, setNewItems] = useState({});
  const [newSubcategory, setNewSubcategory] = useState({ name: "", category: "labor" });

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["dropdown-lists"],
    queryFn: () => base44.entities.DropdownList.list(),
  });

  const { data: payees = [] } = useQuery({
    queryKey: ["payees"],
    queryFn: () => base44.entities.Payee.list("name"),
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => base44.entities.Subcategory.list("name"),
  });

  const { data: paymentSources = [] } = useQuery({
    queryKey: ["paymentSources"],
    queryFn: () => base44.entities.PaymentSource.list("name"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DropdownList.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dropdown-lists"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DropdownList.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dropdown-lists"] });
    },
  });

  const createPayeeMutation = useMutation({
    mutationFn: (data) => base44.entities.Payee.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payees"] }),
  });

  const deletePayeeMutation = useMutation({
    mutationFn: (id) => base44.entities.Payee.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payees"] }),
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.Subcategory.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subcategories"] }),
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.Subcategory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subcategories"] }),
  });

  const createPaymentSourceMutation = useMutation({
    mutationFn: (data) => base44.entities.PaymentSource.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["paymentSources"] }),
  });

  const deletePaymentSourceMutation = useMutation({
    mutationFn: (id) => base44.entities.PaymentSource.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["paymentSources"] }),
  });

  const getListOptions = (listName) => {
    const existingList = lists.find((l) => l.list_name === listName);
    if (existingList) return existingList;
    return { list_name: listName, options: DEFAULT_LISTS[listName] || [] };
  };

  const addOption = async (listName) => {
    const newValue = newItems[listName]?.trim();
    if (!newValue) return;

    const existingList = lists.find((l) => l.list_name === listName);
    const currentOptions = existingList?.options || DEFAULT_LISTS[listName] || [];
    const updatedOptions = [...currentOptions, newValue];

    if (existingList) {
      await updateMutation.mutateAsync({
        id: existingList.id,
        data: { options: updatedOptions },
      });
    } else {
      await createMutation.mutateAsync({
        list_name: listName,
        options: updatedOptions,
      });
    }

    setNewItems({ ...newItems, [listName]: "" });
  };

  const removeOption = async (listName, optionToRemove) => {
    const existingList = lists.find((l) => l.list_name === listName);
    const currentOptions = existingList?.options || DEFAULT_LISTS[listName] || [];
    const updatedOptions = currentOptions.filter((opt) => opt !== optionToRemove);

    if (existingList) {
      await updateMutation.mutateAsync({
        id: existingList.id,
        data: { options: updatedOptions },
      });
    } else {
      await createMutation.mutateAsync({
        list_name: listName,
        options: updatedOptions,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-8 h-8 text-[#1e3a5f]" />
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>

        {/* Expense & Income Lists */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Expense & Income Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Payees */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-lg text-[#1e3a5f]">Payees / Vendors</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {payees.map((payee) => (
                    <div
                      key={payee.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                    >
                      <span className="text-sm text-gray-700">{payee.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePayeeMutation.mutate(payee.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add new payee..."
                    value={newItems.payees || ""}
                    onChange={(e) => setNewItems({ ...newItems, payees: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newItems.payees?.trim()) {
                        createPayeeMutation.mutate({ name: newItems.payees, category: "materials" });
                        setNewItems({ ...newItems, payees: "" });
                      }
                    }}
                    className="text-sm"
                  />
                  <Button
                    onClick={() => {
                      if (newItems.payees?.trim()) {
                        createPayeeMutation.mutate({ name: newItems.payees, category: "materials" });
                        setNewItems({ ...newItems, payees: "" });
                      }
                    }}
                    size="icon"
                    className="bg-[#1e3a5f] hover:bg-[#152a45] shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Subcategories */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-lg text-[#1e3a5f]">Expense Subcategories</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {subcategories.map((subcat) => (
                    <div
                      key={subcat.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                    >
                      <div>
                        <span className="text-sm text-gray-700">{subcat.name}</span>
                        <span className="text-xs text-gray-400 ml-2">({subcat.parent_category})</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSubcategoryMutation.mutate(subcat.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Select
                    value={newSubcategory.category}
                    onValueChange={(v) => setNewSubcategory({ ...newSubcategory, category: v })}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="labor">Labor</SelectItem>
                      <SelectItem value="subcontractor">Subcontractor</SelectItem>
                      <SelectItem value="materials">Materials</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="general_expenses">General Expenses</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add subcategory..."
                      value={newSubcategory.name}
                      onChange={(e) => setNewSubcategory({ ...newSubcategory, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSubcategory.name.trim()) {
                          createSubcategoryMutation.mutate({ name: newSubcategory.name, parent_category: newSubcategory.category });
                          setNewSubcategory({ ...newSubcategory, name: "" });
                        }
                      }}
                      className="text-sm"
                    />
                    <Button
                      onClick={() => {
                        if (newSubcategory.name.trim()) {
                          createSubcategoryMutation.mutate({ name: newSubcategory.name, parent_category: newSubcategory.category });
                          setNewSubcategory({ ...newSubcategory, name: "" });
                        }
                      }}
                      size="icon"
                      className="bg-[#1e3a5f] hover:bg-[#152a45] shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Sources */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-lg text-[#1e3a5f]">Payment Sources</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {paymentSources.map((ps) => (
                    <div
                      key={ps.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                    >
                      <span className="text-sm text-gray-700">{ps.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePaymentSourceMutation.mutate(ps.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add payment source..."
                    value={newItems.paymentSources || ""}
                    onChange={(e) => setNewItems({ ...newItems, paymentSources: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newItems.paymentSources?.trim()) {
                        createPaymentSourceMutation.mutate({ name: newItems.paymentSources });
                        setNewItems({ ...newItems, paymentSources: "" });
                      }
                    }}
                    className="text-sm"
                  />
                  <Button
                    onClick={() => {
                      if (newItems.paymentSources?.trim()) {
                        createPaymentSourceMutation.mutate({ name: newItems.paymentSources });
                        setNewItems({ ...newItems, paymentSources: "" });
                      }
                    }}
                    size="icon"
                    className="bg-[#1e3a5f] hover:bg-[#152a45] shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* General Dropdown Lists */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">General Dropdown Lists</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.keys(DEFAULT_LISTS).map((listName) => {
            const listData = getListOptions(listName);
            return (
              <Card key={listName} className="bg-white shadow-sm">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="text-lg text-[#1e3a5f]">
                    {LIST_LABELS[listName]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2 mb-4">
                    {listData.options.map((option, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                      >
                        <span className="text-sm text-gray-700">{option}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(listName, option)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add new option..."
                      value={newItems[listName] || ""}
                      onChange={(e) =>
                        setNewItems({ ...newItems, [listName]: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addOption(listName);
                        }
                      }}
                      className="text-sm"
                    />
                    <Button
                      onClick={() => addOption(listName)}
                      size="icon"
                      className="bg-[#1e3a5f] hover:bg-[#152a45] shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
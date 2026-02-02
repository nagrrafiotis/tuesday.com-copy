import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Settings as SettingsIcon, Download, Upload, Database, Pencil, Check, X, Palette } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const COLOR_OPTIONS = [
  { value: "bg-emerald-100 text-emerald-700", label: "Emerald" },
  { value: "bg-blue-100 text-blue-700", label: "Blue" },
  { value: "bg-purple-100 text-purple-700", label: "Purple" },
  { value: "bg-amber-100 text-amber-700", label: "Amber" },
  { value: "bg-pink-100 text-pink-700", label: "Pink" },
  { value: "bg-indigo-100 text-indigo-700", label: "Indigo" },
  { value: "bg-rose-100 text-rose-700", label: "Rose" },
  { value: "bg-cyan-100 text-cyan-700", label: "Cyan" },
  { value: "bg-orange-100 text-orange-700", label: "Orange" },
  { value: "bg-teal-100 text-teal-700", label: "Teal" },
  { value: "bg-violet-100 text-violet-700", label: "Violet" },
  { value: "bg-lime-100 text-lime-700", label: "Lime" },
  { value: "bg-gray-100 text-gray-700", label: "Gray" },
];

const DEFAULT_LISTS = {
  units: ["m", "m²", "m³", "kg", "piece", "day"],
  expense_categories: ["labor", "subcontractor", "materials", "equipment", "general_expenses"],
  income_categories: ["sales", "investment", "rental", "other"],
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
  income_categories: "Income Categories",
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
  const [newSubcategory, setNewSubcategory] = useState({ name: "" });
  const [editingItem, setEditingItem] = useState({ listName: null, index: null, value: "" });
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [editingPaymentSource, setEditingPaymentSource] = useState(null);
  const [colorPopover, setColorPopover] = useState({ listName: null, option: null });

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["dropdown-lists"],
    queryFn: () => base44.entities.DropdownList.list(),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("name"),
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

  const createContactMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
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

  const editOption = async (listName, oldValue, newValue) => {
    if (!newValue.trim()) return;
    const existingList = lists.find((l) => l.list_name === listName);
    const currentOptions = existingList?.options || DEFAULT_LISTS[listName] || [];
    const updatedOptions = currentOptions.map((opt) => opt === oldValue ? newValue : opt);

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
    setEditingItem({ listName: null, index: null, value: "" });
  };

  const updateColor = async (listName, option, color) => {
    const existingList = lists.find((l) => l.list_name === listName);
    const currentColors = existingList?.colors || {};
    const updatedColors = { ...currentColors, [option]: color };

    if (existingList) {
      await updateMutation.mutateAsync({
        id: existingList.id,
        data: { colors: updatedColors },
      });
    } else {
      const currentOptions = DEFAULT_LISTS[listName] || [];
      await createMutation.mutateAsync({
        list_name: listName,
        options: currentOptions,
        colors: updatedColors,
      });
    }
    setColorPopover({ listName: null, option: null });
  };

  const getOptionColor = (listName, option) => {
    const existingList = lists.find((l) => l.list_name === listName);
    return existingList?.colors?.[option] || "bg-gray-100 text-gray-700";
  };

  const exportBackup = async () => {
    const projects = await base44.entities.Project.list();
    const tasks = await base44.entities.Task.list();
    const expenses = await base44.entities.Expense.list();
    const incomes = await base44.entities.Income.list();
    const contacts = await base44.entities.Contact.list();
    const notes = await base44.entities.ConstructionNote.list();

    const backup = {
      exported_at: new Date().toISOString(),
      projects,
      tasks,
      expenses,
      incomes,
      contacts,
      notes,
      subcategories,
      payment_sources: paymentSources,
      dropdown_lists: lists,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `backup_${new Date().toISOString().split("T")[0]}.json`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        
        if (window.confirm("This will restore data from the backup. Existing data will remain. Continue?")) {
          const promises = [];
          if (backup.projects) promises.push(...backup.projects.map(p => base44.entities.Project.create(p).catch(() => {})));
          if (backup.tasks) promises.push(...backup.tasks.map(t => base44.entities.Task.create(t).catch(() => {})));
          if (backup.expenses) promises.push(...backup.expenses.map(e => base44.entities.Expense.create(e).catch(() => {})));
          if (backup.incomes) promises.push(...backup.incomes.map(i => base44.entities.Income.create(i).catch(() => {})));
          if (backup.contacts) promises.push(...backup.contacts.map(c => base44.entities.Contact.create(c).catch(() => {})));
          if (backup.notes) promises.push(...backup.notes.map(n => base44.entities.ConstructionNote.create(n).catch(() => {})));
          if (backup.subcategories) promises.push(...backup.subcategories.map(s => base44.entities.Subcategory.create(s).catch(() => {})));
          if (backup.payment_sources) promises.push(...backup.payment_sources.map(ps => base44.entities.PaymentSource.create(ps).catch(() => {})));
          
          await Promise.all(promises);
          queryClient.invalidateQueries();
          alert("Backup restored successfully!");
        }
      } catch (error) {
        alert("Failed to restore backup. Please check the file format.");
      }
    };
    reader.readAsText(file);
  };



  const importSubcategories = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" }
            }
          }
        }
      });

      if (result.status === "success" && result.output) {
        await Promise.all(result.output.map(row => 
          createSubcategoryMutation.mutateAsync({ 
            name: row.name
          }).catch(() => {})
        ));
        alert(`Successfully imported ${result.output.length} subcategories`);
      } else {
        alert("Failed to extract data from file");
      }
    } catch (error) {
      alert("Error importing file. Please check the format.");
    }
  };

  const importPaymentSources = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" }
            }
          }
        }
      });

      if (result.status === "success" && result.output) {
        await Promise.all(result.output.map(row => 
          createPaymentSourceMutation.mutateAsync({ name: row.name }).catch(() => {})
        ));
        alert(`Successfully imported ${result.output.length} payment sources`);
      } else {
        alert("Failed to extract data from file");
      }
    } catch (error) {
      alert("Error importing file. Please check the format.");
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

        {/* Backup & Restore */}
        <Card className="bg-white shadow-sm mb-8">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-[#1e3a5f]" />
              <div>
                <CardTitle className="text-xl text-[#1e3a5f]">Backup & Restore</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Export your data for safekeeping or import from a backup</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Button
                onClick={exportBackup}
                className="bg-[#1e3a5f] hover:bg-[#152a45]"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Full Backup
              </Button>
              
              <label htmlFor="backup-upload">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white cursor-pointer"
                  onClick={() => document.getElementById('backup-upload').click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Restore from Backup
                </Button>
              </label>
              <input
                id="backup-upload"
                type="file"
                accept=".json"
                className="hidden"
                onChange={importBackup}
              />
            </div>
          </CardContent>
        </Card>

        {/* Expense & Income Lists */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Expense & Income Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Subcategories */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-[#1e3a5f]">Expense Subcategories</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
                      onClick={() => {
                        const csvData = [["name"], ...subcategories.map(s => [s.name])];
                        const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
                        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                        const link = document.createElement("a");
                        const url = URL.createObjectURL(blob);
                        link.setAttribute("href", url);
                        link.setAttribute("download", `subcategories_${new Date().toISOString().split("T")[0]}.csv`);
                        link.style.visibility = "hidden";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                    <label htmlFor="subcategories-import">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white cursor-pointer"
                        onClick={() => document.getElementById('subcategories-import').click()}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Import
                      </Button>
                    </label>
                    <input
                      id="subcategories-import"
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={importSubcategories}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {subcategories.map((subcat) => (
                  <div
                    key={subcat.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                  >
                    {editingSubcategory?.id === subcat.id ? (
                      <>
                        <Input
                          value={editingSubcategory.name}
                          onChange={(e) => setEditingSubcategory({ ...editingSubcategory, name: e.target.value })}
                          className="text-sm h-7 flex-1"
                          autoFocus
                        />
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              await createSubcategoryMutation.mutateAsync({ 
                                name: editingSubcategory.name
                              });
                              await deleteSubcategoryMutation.mutateAsync(subcat.id);
                              setEditingSubcategory(null);
                            }}
                            className="h-6 w-6"
                          >
                            <Check className="w-3 h-3 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingSubcategory(null)}
                            className="h-6 w-6"
                          >
                            <X className="w-3 h-3 text-gray-500" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-700">{subcat.name}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingSubcategory(subcat)}
                            className="h-6 w-6"
                          >
                            <Pencil className="w-3 h-3 text-[#1e3a5f]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteSubcategoryMutation.mutate(subcat.id)}
                            className="h-6 w-6"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                </div>
                <div className="flex gap-2">
                    <Input
                      placeholder="Add subcategory..."
                      value={newSubcategory.name}
                      onChange={(e) => setNewSubcategory({ ...newSubcategory, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSubcategory.name.trim()) {
                          createSubcategoryMutation.mutate({ name: newSubcategory.name });
                          setNewSubcategory({ name: "" });
                        }
                      }}
                      className="text-sm"
                    />
                    <Button
                      onClick={() => {
                        if (newSubcategory.name.trim()) {
                          createSubcategoryMutation.mutate({ name: newSubcategory.name });
                          setNewSubcategory({ name: "" });
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

            {/* Payment Sources */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-[#1e3a5f]">Payment Sources</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
                      onClick={() => {
                        const csvData = [["name"], ...paymentSources.map(ps => [ps.name])];
                        const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
                        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                        const link = document.createElement("a");
                        const url = URL.createObjectURL(blob);
                        link.setAttribute("href", url);
                        link.setAttribute("download", `payment_sources_${new Date().toISOString().split("T")[0]}.csv`);
                        link.style.visibility = "hidden";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                    <label htmlFor="payment-sources-import">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white cursor-pointer"
                        onClick={() => document.getElementById('payment-sources-import').click()}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Import
                      </Button>
                    </label>
                    <input
                      id="payment-sources-import"
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={importPaymentSources}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {paymentSources.map((ps) => (
                    <div
                      key={ps.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group"
                    >
                      {editingPaymentSource?.id === ps.id ? (
                        <>
                          <Input
                            value={editingPaymentSource.name}
                            onChange={(e) => setEditingPaymentSource({ ...editingPaymentSource, name: e.target.value })}
                            className="text-sm h-7 flex-1"
                            autoFocus
                          />
                          <div className="flex gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                await createPaymentSourceMutation.mutateAsync({ name: editingPaymentSource.name });
                                await deletePaymentSourceMutation.mutateAsync(ps.id);
                                setEditingPaymentSource(null);
                              }}
                              className="h-6 w-6"
                            >
                              <Check className="w-3 h-3 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingPaymentSource(null)}
                              className="h-6 w-6"
                            >
                              <X className="w-3 h-3 text-gray-500" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-sm text-gray-700">{ps.name}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingPaymentSource(ps)}
                              className="h-6 w-6"
                            >
                              <Pencil className="w-3 h-3 text-[#1e3a5f]" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePaymentSourceMutation.mutate(ps.id)}
                              className="h-6 w-6"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        </>
                      )}
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
                        {editingItem.listName === listName && editingItem.index === idx ? (
                          <>
                            <Input
                              value={editingItem.value}
                              onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                              className="text-sm h-7 flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  editOption(listName, option, editingItem.value);
                                } else if (e.key === "Escape") {
                                  setEditingItem({ listName: null, index: null, value: "" });
                                }
                              }}
                            />
                            <div className="flex gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => editOption(listName, option, editingItem.value)}
                                className="h-6 w-6"
                              >
                                <Check className="w-3 h-3 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingItem({ listName: null, index: null, value: "" })}
                                className="h-6 w-6"
                              >
                                <X className="w-3 h-3 text-gray-500" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 flex-1">
                              {listName === "income_categories" && (
                                <div className={`w-4 h-4 rounded ${getOptionColor(listName, option)} border`} />
                              )}
                              <span className="text-sm text-gray-700">{option}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {listName === "income_categories" && (
                                <Popover 
                                  open={colorPopover.listName === listName && colorPopover.option === option}
                                  onOpenChange={(open) => setColorPopover(open ? { listName, option } : { listName: null, option: null })}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                    >
                                      <Palette className="w-3 h-3 text-[#1e3a5f]" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-48 p-2">
                                    <div className="grid grid-cols-3 gap-2">
                                      {COLOR_OPTIONS.map((color) => (
                                        <button
                                          key={color.value}
                                          onClick={() => updateColor(listName, option, color.value)}
                                          className={`w-full h-8 rounded ${color.value} hover:opacity-80 transition-opacity border`}
                                          title={color.label}
                                        />
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingItem({ listName, index: idx, value: option })}
                                className="h-6 w-6"
                              >
                                <Pencil className="w-3 h-3 text-[#1e3a5f]" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeOption(listName, option)}
                                className="h-6 w-6"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </Button>
                            </div>
                          </>
                        )}
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
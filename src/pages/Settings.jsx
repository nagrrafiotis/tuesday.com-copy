import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Settings as SettingsIcon, Download, Upload, Database, Pencil, Check, X, Palette, RefreshCw, Clock, Settings as SettingsGear, CheckSquare, Square, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [newPhase, setNewPhase] = useState({ name: "", order: 1 });
  const [editingPhase, setEditingPhase] = useState(null);
  const [phaseColorPopover, setPhaseColorPopover] = useState(null);
  const [assigningPhase, setAssigningPhase] = useState(null);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [selectedPaymentSources, setSelectedPaymentSources] = useState([]);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [selectedListItems, setSelectedListItems] = useState({});
  const [lastSaved, setLastSaved] = useState(null);
  const [nuking, setNuking] = useState(false);
  const [fullBackupLoading, setFullBackupLoading] = useState(false);

  const markSaved = async () => {
    const now = new Date();
    setLastSaved(now);
    await base44.auth.updateMe({ last_settings_saved_date: now.toISOString() });
    refetchUser();
  };

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ["dropdown-lists"],
    queryFn: () => base44.entities.DropdownList.list(),
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("name"),
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => base44.entities.Subcategory.list("name"),
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: paymentSources = [] } = useQuery({
    queryKey: ["paymentSources"],
    queryFn: () => base44.entities.PaymentSource.list("name"),
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: phases = [] } = useQuery({
    queryKey: ["phases"],
    queryFn: () => base44.entities.ProjectPhase.list("order"),
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: googleAccount, refetch: refetchGoogleAccount } = useQuery({
    queryKey: ["google-account"],
    queryFn: async () => {
      const response = await base44.functions.invoke('getGoogleAccountInfo', {});
      return response.data;
    },
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: currentUser, refetch: refetchUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DropdownList.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dropdown-lists"] });
      markSaved();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DropdownList.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dropdown-lists"] });
      markSaved();
    },
  });

  const createContactMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.Subcategory.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["subcategories"] }); markSaved(); },
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: async (id) => {
      try {
        await base44.entities.Subcategory.delete(id);
      } catch (error) {
        if (!error.message?.includes('not found')) {
          throw error;
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["subcategories"] }); markSaved(); },
  });

  const createPaymentSourceMutation = useMutation({
    mutationFn: (data) => base44.entities.PaymentSource.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["paymentSources"] }); markSaved(); },
  });

  const deletePaymentSourceMutation = useMutation({
    mutationFn: async (id) => {
      try {
        await base44.entities.PaymentSource.delete(id);
      } catch (error) {
        if (!error.message?.includes('not found')) {
          throw error;
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["paymentSources"] }); markSaved(); },
  });

  const createPhaseMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectPhase.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["phases"] }); markSaved(); },
  });

  const updatePhaseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectPhase.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["phases"] }); markSaved(); },
  });

  const deletePhaseMutation = useMutation({
    mutationFn: async (id) => {
      try {
        await base44.entities.ProjectPhase.delete(id);
      } catch (error) {
        if (!error.message?.includes('not found')) {
          throw error;
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["phases"] }); markSaved(); },
  });

  const updateSubcategoryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Subcategory.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["subcategories"] }); markSaved(); },
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

  const { data: exportData, refetch: refetchExportData } = useQuery({
    queryKey: ["export-data"],
    queryFn: async () => {
      const [projects, tasks, expenses, incomes, contacts, notes] = await Promise.all([
        base44.entities.Project.list(),
        base44.entities.Task.list(),
        base44.entities.Expense.list(),
        base44.entities.Income.list(),
        base44.entities.Contact.list(),
        base44.entities.ConstructionNote.list()
      ]);
      return { projects, tasks, expenses, incomes, contacts, notes };
    },
    staleTime: 300000,
    refetchOnWindowFocus: false,
    enabled: false
  });

  const exportBackup = async () => {
    const data = await refetchExportData();
    const backupData = data.data || exportData;
    
    if (!backupData) return;

    const backup = {
      exported_at: new Date().toISOString(),
      projects: backupData.projects,
      tasks: backupData.tasks,
      expenses: backupData.expenses,
      incomes: backupData.incomes,
      contacts: backupData.contacts,
      notes: backupData.notes,
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

  const downloadFullBackup = async () => {
    setFullBackupLoading(true);
    const [projects, tasks, expenses, incomes, contacts, notes, payrolls, generalExpenses, generalIncomes, invoices, allPhases, allSubcategories, allPaymentSources, allDropdownLists] = await Promise.all([
      base44.entities.Project.list(),
      base44.entities.Task.list(),
      base44.entities.Expense.list(),
      base44.entities.Income.list(),
      base44.entities.Contact.list(),
      base44.entities.ConstructionNote.list(),
      base44.entities.Payroll.list(),
      base44.entities.GeneralExpense.list(),
      base44.entities.GeneralIncome.list(),
      base44.entities.Invoice.list(),
      base44.entities.ProjectPhase.list(),
      base44.entities.Subcategory.list(),
      base44.entities.PaymentSource.list(),
      base44.entities.DropdownList.list(),
    ]);

    const backup = {
      exported_at: new Date().toISOString(),
      projects, tasks, expenses, incomes, contacts, notes,
      payrolls, generalExpenses, generalIncomes, invoices,
      phases: allPhases,
      subcategories: allSubcategories,
      payment_sources: allPaymentSources,
      dropdown_lists: allDropdownLists,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `FULL_BACKUP_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    await base44.auth.updateMe({ last_backup_download_date: new Date().toISOString() });
    refetchUser();
    setFullBackupLoading(false);
  };

  const nukeAllData = async () => {
    const confirm1 = window.confirm("⚠️ ΠΡΟΣΟΧΗ: Πρόκειται να διαγραφούν ΟΛΑ τα δεδομένα (έργα, έξοδα, εισοδήματα, μισθοδοσία, επαφές, φάσεις, υποκατηγορίες κ.λπ.).\n\nΒεβαιωθείτε ότι έχετε ήδη κατεβάσει backup!\n\nΠατήστε OK για να συνεχίσετε.");
    if (!confirm1) return;
    const confirm2 = window.confirm("Τελευταία ευκαιρία! Η ολική διαγραφή είναι ΜΗ ΑΝΑΣΤΡΕΨΙΜΗ χωρίς backup.\n\nΕίστε σίγουροι;");
    if (!confirm2) return;

    setNuking(true);
    const [projects, tasks, expenses, incomes, contacts, notes, payrolls, generalExpenses, generalIncomes, invoices, allPhases, allSubcategories, allPaymentSources, allDropdownLists] = await Promise.all([
      base44.entities.Project.list(),
      base44.entities.Task.list(),
      base44.entities.Expense.list(),
      base44.entities.Income.list(),
      base44.entities.Contact.list(),
      base44.entities.ConstructionNote.list(),
      base44.entities.Payroll.list(),
      base44.entities.GeneralExpense.list(),
      base44.entities.GeneralIncome.list(),
      base44.entities.Invoice.list(),
      base44.entities.ProjectPhase.list(),
      base44.entities.Subcategory.list(),
      base44.entities.PaymentSource.list(),
      base44.entities.DropdownList.list(),
    ]);

    await Promise.all([
      ...projects.map(r => base44.entities.Project.delete(r.id).catch(() => {})),
      ...tasks.map(r => base44.entities.Task.delete(r.id).catch(() => {})),
      ...expenses.map(r => base44.entities.Expense.delete(r.id).catch(() => {})),
      ...incomes.map(r => base44.entities.Income.delete(r.id).catch(() => {})),
      ...contacts.map(r => base44.entities.Contact.delete(r.id).catch(() => {})),
      ...notes.map(r => base44.entities.ConstructionNote.delete(r.id).catch(() => {})),
      ...payrolls.map(r => base44.entities.Payroll.delete(r.id).catch(() => {})),
      ...generalExpenses.map(r => base44.entities.GeneralExpense.delete(r.id).catch(() => {})),
      ...generalIncomes.map(r => base44.entities.GeneralIncome.delete(r.id).catch(() => {})),
      ...invoices.map(r => base44.entities.Invoice.delete(r.id).catch(() => {})),
      ...allPhases.map(r => base44.entities.ProjectPhase.delete(r.id).catch(() => {})),
      ...allSubcategories.map(r => base44.entities.Subcategory.delete(r.id).catch(() => {})),
      ...allPaymentSources.map(r => base44.entities.PaymentSource.delete(r.id).catch(() => {})),
      ...allDropdownLists.map(r => base44.entities.DropdownList.delete(r.id).catch(() => {})),
    ]);

    queryClient.invalidateQueries();
    setNuking(false);
    alert("Η ολική διαγραφή ολοκληρώθηκε.");
  };

  const restoreFullBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const backup = JSON.parse(e.target.result);
      if (!window.confirm("Αυτό θα προσθέσει τα δεδομένα από το backup. Συνέχεια;")) return;
      const promises = [];
      if (backup.projects) promises.push(...backup.projects.map(r => base44.entities.Project.create(r).catch(() => {})));
      if (backup.tasks) promises.push(...backup.tasks.map(r => base44.entities.Task.create(r).catch(() => {})));
      if (backup.expenses) promises.push(...backup.expenses.map(r => base44.entities.Expense.create(r).catch(() => {})));
      if (backup.incomes) promises.push(...backup.incomes.map(r => base44.entities.Income.create(r).catch(() => {})));
      if (backup.contacts) promises.push(...backup.contacts.map(r => base44.entities.Contact.create(r).catch(() => {})));
      if (backup.notes) promises.push(...backup.notes.map(r => base44.entities.ConstructionNote.create(r).catch(() => {})));
      if (backup.payrolls) promises.push(...backup.payrolls.map(r => base44.entities.Payroll.create(r).catch(() => {})));
      if (backup.generalExpenses) promises.push(...backup.generalExpenses.map(r => base44.entities.GeneralExpense.create(r).catch(() => {})));
      if (backup.generalIncomes) promises.push(...backup.generalIncomes.map(r => base44.entities.GeneralIncome.create(r).catch(() => {})));
      if (backup.invoices) promises.push(...backup.invoices.map(r => base44.entities.Invoice.create(r).catch(() => {})));
      if (backup.phases) promises.push(...backup.phases.map(r => base44.entities.ProjectPhase.create(r).catch(() => {})));
      if (backup.subcategories) promises.push(...backup.subcategories.map(r => base44.entities.Subcategory.create(r).catch(() => {})));
      if (backup.payment_sources) promises.push(...backup.payment_sources.map(r => base44.entities.PaymentSource.create(r).catch(() => {})));
      if (backup.dropdown_lists) promises.push(...backup.dropdown_lists.map(r => base44.entities.DropdownList.create(r).catch(() => {})));
      await Promise.all(promises);
      queryClient.invalidateQueries();
      alert("Η επαναφορά ολοκληρώθηκε!");
    };
    reader.readAsText(file);
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-[#1e3a5f]" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          {lastSaved && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              Last saved: {format(lastSaved, 'dd/MM/yyyy HH:mm:ss')}
            </div>
          )}
        </div>

        {/* Google Account Connection */}
        <Card className="bg-white shadow-sm mb-8">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <div>
                <CardTitle className="text-xl text-[#1e3a5f]">Google Account</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Manage your connected Google account for Sheets sync</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {googleAccount?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={googleAccount.picture} />
                      <AvatarFallback className="bg-[#4285F4] text-white">
                        {googleAccount.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{googleAccount.name}</p>
                      <p className="text-sm text-gray-500">{googleAccount.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (confirm('Clear spreadsheet data? You can sync again after this. Continue?')) {
                        try {
                          await base44.auth.updateMe({
                            google_sheets_backup_id: null
                          });
                          alert('Spreadsheet data cleared. Next sync will create a new spreadsheet.');
                          refetchUser();
                        } catch (error) {
                          alert('Failed to clear data. Please try again.');
                        }
                      }
                    }}
                    className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset Sync
                  </Button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> To change which Google account is connected, go to your Base44 Dashboard → Code → Integrations → Google Sheets and reconnect.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-4">No Google account connected</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>To connect Google Sheets:</strong> Go to your Base44 Dashboard → Code → Integrations → Google Sheets and authorize the connection.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col gap-1">
                <Button
                  onClick={async () => {
                    exportBackup();
                    await base44.auth.updateMe({ last_backup_download_date: new Date().toISOString() });
                    refetchUser();
                  }}
                  className="bg-[#1e3a5f] hover:bg-[#152a45]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Full Backup
                </Button>
                {currentUser?.last_backup_download_date && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Clock className="w-3 h-3" />
                    Last used: {format(new Date(currentUser.last_backup_download_date), 'MMM d, yyyy HH:mm')}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-1">
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
                  onChange={async (e) => {
                    await importBackup(e);
                    await base44.auth.updateMe({ last_backup_restore_date: new Date().toISOString() });
                    refetchUser();
                  }}
                />
                {currentUser?.last_backup_restore_date && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Clock className="w-3 h-3" />
                    Last used: {format(new Date(currentUser.last_backup_restore_date), 'MMM d, yyyy HH:mm')}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <Button
                  onClick={async () => {
                    try {
                      const response = await base44.functions.invoke('syncToGoogleSheets', {});
                      if (response.data.success) {
                        alert('Data synced successfully! You can now edit the spreadsheet and import changes back.');
                        window.open(response.data.url, '_blank');
                        await base44.auth.updateMe({ last_google_sync_date: new Date().toISOString() });
                        refetchUser();
                      }
                    } catch (error) {
                      alert('Sync failed. Please make sure your Google account is connected.');
                    }
                  }}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  1. Sync to Google Sheets
                </Button>
                {currentUser?.last_google_sync_date && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Clock className="w-3 h-3" />
                    Last used: {format(new Date(currentUser.last_google_sync_date), 'MMM d, yyyy HH:mm')}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <Button
                  onClick={async () => {
                    if (!currentUser?.last_google_sync_date) {
                      alert('Please sync to Google Sheets first (click "1. Sync to Google Sheets" button above).');
                      return;
                    }
                    if (confirm('Import data from Google Sheets? New records will be added to your app.')) {
                      try {
                        const response = await base44.functions.invoke('importFromGoogleSheets', {});
                        if (response.data.success) {
                          alert(`Imported: ${response.data.imported.expenses} expenses, ${response.data.imported.income} income, ${response.data.imported.subcategories} subcategories, ${response.data.imported.paymentSources} payment sources`);
                          queryClient.invalidateQueries();
                          await base44.auth.updateMe({ last_google_import_date: new Date().toISOString() });
                          refetchUser();
                        } else if (response.data.error) {
                          alert(`Import failed: ${response.data.error}`);
                        }
                      } catch (error) {
                        alert('Import failed. Please sync to Google Sheets first, then try importing again.');
                      }
                    }
                  }}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  2. Import from Google Sheets
                </Button>
                {currentUser?.last_google_import_date && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Clock className="w-3 h-3" />
                    Last used: {format(new Date(currentUser.last_google_import_date), 'MMM d, yyyy HH:mm')}
                  </div>
                )}
              </div>
              </div>
              </CardContent>
        </Card>

        {/* Expense & Income Lists */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Expense & Income Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Project Phases */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-[#1e3a5f]">Project Phases</CardTitle>
                  {phases.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedPhases.length === phases.length) {
                            setSelectedPhases([]);
                          } else {
                            setSelectedPhases(phases.map(p => p.id));
                          }
                        }}
                        className="text-xs"
                      >
                        {selectedPhases.length === phases.length ? 'Deselect All' : 'Select All'}
                      </Button>
                      {selectedPhases.length > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            if (confirm(`Delete ${selectedPhases.length} selected phases?`)) {
                              await Promise.all(selectedPhases.map(id => deletePhaseMutation.mutateAsync(id)));
                              setSelectedPhases([]);
                            }
                          }}
                          className="text-xs"
                        >
                          Delete ({selectedPhases.length})
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                  {phases.map((phase) => (
                    <div
                      key={phase.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group"
                    >
                      <Checkbox
                        checked={selectedPhases.includes(phase.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPhases([...selectedPhases, phase.id]);
                          } else {
                            setSelectedPhases(selectedPhases.filter(id => id !== phase.id));
                          }
                        }}
                      />
                      {editingPhase?.id === phase.id ? (
                        <>
                          <div className="flex gap-2 flex-1">
                            <Input
                              value={editingPhase.name}
                              onChange={(e) => setEditingPhase({ ...editingPhase, name: e.target.value })}
                              className="text-sm h-7 flex-1"
                              autoFocus
                            />
                            <Input
                              type="number"
                              value={editingPhase.order}
                              onChange={(e) => setEditingPhase({ ...editingPhase, order: parseInt(e.target.value) })}
                              className="text-sm h-7 w-16"
                              placeholder="Order"
                            />
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                await updatePhaseMutation.mutateAsync({ 
                                  id: phase.id, 
                                  data: { name: editingPhase.name, order: editingPhase.order, color: editingPhase.color }
                                });
                                setEditingPhase(null);
                              }}
                              className="h-6 w-6"
                            >
                              <Check className="w-3 h-3 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingPhase(null)}
                              className="h-6 w-6"
                            >
                              <X className="w-3 h-3 text-gray-500" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-1">
                            <div className={`w-4 h-4 rounded ${phase.color} border`} />
                            <span className="text-sm text-gray-700">{phase.name}</span>
                            <span className="text-xs text-gray-400">#{phase.order}</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Popover 
                              open={phaseColorPopover === phase.id}
                              onOpenChange={(open) => setPhaseColorPopover(open ? phase.id : null)}
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
                                      onClick={() => {
                                        updatePhaseMutation.mutate({
                                          id: phase.id,
                                          data: { name: phase.name, order: phase.order, color: color.value }
                                        });
                                        setPhaseColorPopover(null);
                                      }}
                                      className={`w-full h-8 rounded ${color.value} hover:opacity-80 transition-opacity border`}
                                      title={color.label}
                                    />
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingPhase(phase)}
                              className="h-6 w-6"
                            >
                              <Pencil className="w-3 h-3 text-[#1e3a5f]" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePhaseMutation.mutate(phase.id)}
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
                    placeholder="Phase name..."
                    value={newPhase.name}
                    onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
                    className="text-sm flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Order"
                    value={newPhase.order}
                    onChange={(e) => setNewPhase({ ...newPhase, order: parseInt(e.target.value) || 1 })}
                    className="text-sm w-20"
                  />
                  <Button
                    onClick={() => {
                      if (newPhase.name.trim()) {
                        createPhaseMutation.mutate(newPhase);
                        setNewPhase({ name: "", order: (phases.length || 0) + 1 });
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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-[#1e3a5f]">Expense Subcategories</CardTitle>
                  <div className="flex gap-2">
                    {subcategories.length > 0 && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (selectedSubcategories.length === subcategories.length) {
                              setSelectedSubcategories([]);
                            } else {
                              setSelectedSubcategories(subcategories.map(s => s.id));
                            }
                          }}
                          className="text-xs"
                        >
                          {selectedSubcategories.length === subcategories.length ? 'Deselect' : 'Select All'}
                        </Button>
                        {selectedSubcategories.length > 0 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              if (confirm(`Delete ${selectedSubcategories.length} selected subcategories?`)) {
                                await Promise.all(selectedSubcategories.map(id => deleteSubcategoryMutation.mutateAsync(id)));
                                setSelectedSubcategories([]);
                              }
                            }}
                            className="text-xs"
                          >
                            Delete ({selectedSubcategories.length})
                          </Button>
                        )}
                      </>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
                      onClick={async () => {
                        // Auto-assign subcategories to phases based on first word matching
                        const updates = subcategories.map((subcat) => {
                          const firstWord = subcat.name.split(' ')[0].toLowerCase();

                          // Find matching phase by name
                          const matchingPhase = phases.find(phase => 
                            phase.name.toLowerCase().includes(firstWord) || 
                            firstWord.includes(phase.name.toLowerCase())
                          );

                          return updateSubcategoryMutation.mutateAsync({
                            id: subcat.id,
                            data: { name: subcat.name, phase_id: matchingPhase?.id || null }
                          });
                        });

                        await Promise.all(updates);
                      }}
                      title="Auto-assign subcategories to phases based on name matching"
                    >
                      Auto-assign
                    </Button>
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
                 {[...subcategories].sort((a, b) => a.name.localeCompare(b.name)).map((subcat) => {
                  const phase = phases.find(p => p.id === subcat.phase_id);
                  return (
                  <div
                    key={subcat.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group"
                  >
                    <Checkbox
                      checked={selectedSubcategories.includes(subcat.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSubcategories([...selectedSubcategories, subcat.id]);
                        } else {
                          setSelectedSubcategories(selectedSubcategories.filter(id => id !== subcat.id));
                        }
                      }}
                    />
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
                              await updateSubcategoryMutation.mutateAsync({
                                id: subcat.id,
                                data: { name: editingSubcategory.name, phase_id: editingSubcategory.phase_id ?? subcat.phase_id }
                              });
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
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm text-gray-700">{subcat.name}</span>
                          {phase && (
                            <span className={`text-xs px-2 py-0.5 rounded ${phase.color}`}>
                              {phase.name}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Select
                            value={subcat.phase_id || "none"}
                            onValueChange={(value) => {
                              updateSubcategoryMutation.mutate({
                                id: subcat.id,
                                data: { name: subcat.name, phase_id: value === "none" ? null : value }
                              });
                            }}
                          >
                            <SelectTrigger className="h-6 w-24 text-xs">
                              <SelectValue placeholder="Phase" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {phases.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                );})}
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
                    {paymentSources.length > 0 && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (selectedPaymentSources.length === paymentSources.length) {
                              setSelectedPaymentSources([]);
                            } else {
                              setSelectedPaymentSources(paymentSources.map(ps => ps.id));
                            }
                          }}
                          className="text-xs"
                        >
                          {selectedPaymentSources.length === paymentSources.length ? 'Deselect' : 'Select All'}
                        </Button>
                        {selectedPaymentSources.length > 0 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              if (confirm(`Delete ${selectedPaymentSources.length} selected payment sources?`)) {
                                await Promise.all(selectedPaymentSources.map(id => deletePaymentSourceMutation.mutateAsync(id)));
                                setSelectedPaymentSources([]);
                              }
                            }}
                            className="text-xs"
                          >
                            Delete ({selectedPaymentSources.length})
                          </Button>
                        )}
                      </>
                    )}
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
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group"
                    >
                      <Checkbox
                        checked={selectedPaymentSources.includes(ps.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPaymentSources([...selectedPaymentSources, ps.id]);
                          } else {
                            setSelectedPaymentSources(selectedPaymentSources.filter(id => id !== ps.id));
                          }
                        }}
                      />
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

        {/* Danger Zone */}
        <Card className="bg-white shadow-sm border-red-200 mb-8">
          <CardHeader className="border-b border-red-100">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <CardTitle className="text-xl text-red-600">Danger Zone</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Ολικό backup και ολική διαγραφή δεδομένων</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-start">
              {/* Full Backup */}
              <div className="flex flex-col gap-1">
                <Button
                  onClick={downloadFullBackup}
                  disabled={fullBackupLoading}
                  className="bg-[#1e3a5f] hover:bg-[#152a45]"
                >
                  {fullBackupLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {fullBackupLoading ? "Αποθήκευση..." : "Αποθήκευση Όλων (Full Backup)"}
                </Button>
                <p className="text-xs text-gray-400">Κατεβάζει backup με ΟΛΑ τα δεδομένα</p>
              </div>

              {/* Restore Full Backup */}
              <div className="flex flex-col gap-1">
                <Button
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                  onClick={() => document.getElementById('full-backup-restore').click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Ολική Επαναφορά από Backup
                </Button>
                <input id="full-backup-restore" type="file" accept=".json" className="hidden" onChange={restoreFullBackup} />
                <p className="text-xs text-gray-400">Επαναφέρει δεδομένα από full backup αρχείο</p>
              </div>

              {/* Nuke */}
              <div className="flex flex-col gap-1 ml-auto">
                <Button
                  variant="destructive"
                  onClick={nukeAllData}
                  disabled={nuking}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {nuking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  {nuking ? "Διαγραφή..." : "Ολική Διαγραφή Δεδομένων"}
                </Button>
                <p className="text-xs text-red-400 text-right">Μη αναστρέψιμη! Κατεβάστε backup πρώτα.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* General Dropdown Lists */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">General Dropdown Lists</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.keys(DEFAULT_LISTS).map((listName) => {
            const listData = getListOptions(listName);
            const selectedItems = selectedListItems[listName] || [];
            return (
              <Card key={listName} className="bg-white shadow-sm">
                <CardHeader className="border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-[#1e3a5f]">
                      {LIST_LABELS[listName]}
                    </CardTitle>
                    {listData.options.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (selectedItems.length === listData.options.length) {
                              setSelectedListItems({ ...selectedListItems, [listName]: [] });
                            } else {
                              setSelectedListItems({ ...selectedListItems, [listName]: [...listData.options] });
                            }
                          }}
                          className="text-xs"
                        >
                          {selectedItems.length === listData.options.length ? 'Deselect' : 'Select All'}
                        </Button>
                        {selectedItems.length > 0 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              if (confirm(`Delete ${selectedItems.length} selected items?`)) {
                                const remainingOptions = listData.options.filter(opt => !selectedItems.includes(opt));
                                const existingList = lists.find((l) => l.list_name === listName);
                                if (existingList) {
                                  await updateMutation.mutateAsync({
                                    id: existingList.id,
                                    data: { options: remainingOptions },
                                  });
                                }
                                setSelectedListItems({ ...selectedListItems, [listName]: [] });
                              }
                            }}
                            className="text-xs"
                          >
                            Delete ({selectedItems.length})
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2 mb-4">
                    {listData.options.map((option, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group"
                      >
                        <Checkbox
                          checked={selectedItems.includes(option)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedListItems({ ...selectedListItems, [listName]: [...selectedItems, option] });
                            } else {
                              setSelectedListItems({ ...selectedListItems, [listName]: selectedItems.filter(item => item !== option) });
                            }
                          }}
                        />
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
import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import ExpenseTable from "@/components/expenses/ExpenseTable";
import ExpenseSummary from "@/components/expenses/ExpenseSummary";
import IncomeForm from "@/components/income/IncomeForm";
import IncomeTable from "@/components/income/IncomeTable";
import IncomeSummary from "@/components/income/IncomeSummary";
import ContactCard from "@/components/contacts/ContactCard.jsx";
import ContactForm from "@/components/contacts/ContactForm.jsx";
import ScanInvoiceDialog from "@/components/invoices/ScanInvoiceDialog";
import EditInvoiceDialog from "@/components/invoices/EditInvoiceDialog";
import TransferInvoiceDialog from "@/components/invoices/TransferInvoiceDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Plus, Search, Download, Receipt, Upload, Trash2, RefreshCw, FileSpreadsheet, RotateCcw,
  ScanLine, ChevronDown, ChevronUp, ArrowRight, TrendingUp, FileText, Calendar, Building2,
  Hash, Loader2, CheckCircle2, Pencil, X
} from "lucide-react";

const formatCurrency = (v) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v || 0);

const safeFormatDate = (dateStr, fmt) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return format(d, fmt);
};

export default function Expenses() {
  const [activeTab, setActiveTab] = useState("expenses");
  const [showInvoicesSection, setShowInvoicesSection] = useState(true);

  // --- Invoice state ---
  const [scanOpen, setScanOpen] = useState(false);
  const [transferInvoice, setTransferInvoice] = useState(null);
  const [editInvoice, setEditInvoice] = useState(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [searchVendor, setSearchVendor] = useState("");
  const [filterInvoiceType, setFilterInvoiceType] = useState("all");
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState("all");
  const [sortInvoiceOrder, setSortInvoiceOrder] = useState("newest");
  const [filterInvoiceProject, setFilterInvoiceProject] = useState("all");
  const [filterInvoicePaymentSource, setFilterInvoicePaymentSource] = useState("all");
  const [filterInvoiceCategory, setFilterInvoiceCategory] = useState("all");
  const [filterInvoiceSubcategory, setFilterInvoiceSubcategory] = useState("all");

  // --- Expense state ---
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [payeeFilter, setPayeeFilter] = useState("all");
  const [paymentSourceFilter, setPaymentSourceFilter] = useState("all");
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [undoItem, setUndoItem] = useState(null);
  const undoTimerRef = useRef(null);
  const [syncing, setSyncing] = useState(false);
  const [showSheetImport, setShowSheetImport] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [importing, setImporting] = useState(false);

  // --- Income state ---
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [incomeSearch, setIncomeSearch] = useState("");
  const [incomeProjectFilter, setIncomeProjectFilter] = useState("all");
  const [incomeCategoryFilter, setIncomeCategoryFilter] = useState("all");
  const [selectedIncomes, setSelectedIncomes] = useState([]);
  const [incomeUndoItem, setIncomeUndoItem] = useState(null);
  const incomeUndoTimerRef = useRef(null);

  // --- Shared state ---
  const [viewingContact, setViewingContact] = useState(null);
  const [editingContact, setEditingContact] = useState(null);

  const queryClient = useQueryClient();

  // --- Income queries & mutations ---
  const { data: incomes = [] } = useQuery({
    queryKey: ["incomes"],
    queryFn: () => base44.entities.Income.list("-date"),
  });

  const { data: dropdownListsIncome = [] } = useQuery({
    queryKey: ["dropdown-lists"],
    queryFn: () => base44.entities.DropdownList.list(),
  });

  const incomeCategories = dropdownListsIncome.find(l => l.list_name === "income_categories")?.options || ["sales", "investment", "rental", "other"];

  const createIncomeMutation = useMutation({
    mutationFn: (data) => base44.entities.Income.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["incomes"] }); setShowIncomeForm(false); },
  });
  const updateIncomeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Income.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["incomes"] }); setShowIncomeForm(false); setEditingIncome(null); },
  });
  const deleteIncomeMutation = useMutation({
    mutationFn: (id) => base44.entities.Income.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incomes"] }),
  });

  const handleIncomeSubmit = async (data) => {
    if (editingIncome) await updateIncomeMutation.mutateAsync({ id: editingIncome.id, data });
    else await createIncomeMutation.mutateAsync(data);
  };

  const handleIncomeDelete = async (income) => {
    if (window.confirm(`Delete this income from ${income.source}?`)) {
      setIncomeUndoItem({ ...income });
      await deleteIncomeMutation.mutateAsync(income.id);
      if (incomeUndoTimerRef.current) clearTimeout(incomeUndoTimerRef.current);
      incomeUndoTimerRef.current = setTimeout(() => setIncomeUndoItem(null), 10000);
    }
  };

  const handleIncomeUndo = async () => {
    if (!incomeUndoItem) return;
    const { id, created_date, updated_date, created_by, ...data } = incomeUndoItem;
    await createIncomeMutation.mutateAsync(data);
    setIncomeUndoItem(null);
    if (incomeUndoTimerRef.current) clearTimeout(incomeUndoTimerRef.current);
  };

  const handleIncomeBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIncomes.length} selected income records?`)) {
      await Promise.all(selectedIncomes.map(id => deleteIncomeMutation.mutateAsync(id)));
      setSelectedIncomes([]);
    }
  };

  const handleIncomeInlineUpdate = async (id, field, value) => {
    const income = incomes.find(i => i.id === id);
    if (!income) return;
    await base44.entities.Income.update(id, { ...income, [field]: value });
    queryClient.invalidateQueries({ queryKey: ["incomes"] });
  };

  const filteredIncomes = incomes.filter((i) => {
    const matchesSearch = i.source?.toLowerCase().includes(incomeSearch.toLowerCase()) || i.description?.toLowerCase().includes(incomeSearch.toLowerCase());
    const matchesProject = incomeProjectFilter === "all" || i.project_id === incomeProjectFilter;
    const matchesCategory = incomeCategoryFilter === "all" || i.category === incomeCategoryFilter;
    return matchesSearch && matchesProject && matchesCategory;
  });

  const exportIncomeToCSV = () => {
    const csvData = [
      ["Date", "Project", "Category", "Source", "Description", "Amount (€)", "Payment Source"],
      ...filteredIncomes.map((i) => [
        new Date(i.date).toLocaleDateString("de-DE"),
        projects.find(p => p.id === i.project_id)?.name || "",
        i.category || "", i.source || "", i.description || "", i.amount || 0, i.payment_source || "",
      ]),
    ];
    const csvContent = csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `income_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // --- Expense queries & mutations ---
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("name"),
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setEditingContact(null);
    },
  });

  const { data: paymentSources = [] } = useQuery({
    queryKey: ["paymentSources"],
    queryFn: () => base44.entities.PaymentSource.list("name"),
  });

  const { data: dropdownLists = [] } = useQuery({
    queryKey: ["dropdown-lists"],
    queryFn: () => base44.entities.DropdownList.list(),
  });

  // --- Invoice queries ---
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date"),
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id) => base44.entities.Invoice.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });

  const filteredInvoices = invoices
    .filter(inv => {
      const q = searchVendor.trim().toLowerCase();
      const projectName = projects.find(p => p.id === inv.project_id)?.name || "";
      const matchSearch = !q || [
        inv.vendor_client,
        inv.invoice_number,
        inv.description,
        inv.category,
        inv.subcategory,
        inv.payment_source,
        inv.notes,
        inv.date,
        projectName,
        ...(inv.items || []).map(it => it.description),
      ].some(v => v?.toLowerCase().includes(q));
      const matchType = filterInvoiceType === "all" || inv.type === filterInvoiceType;
      const matchStatus = filterInvoiceStatus === "all" || inv.status === filterInvoiceStatus || (filterInvoiceStatus === "pending" && !inv.status);
      const matchProject = filterInvoiceProject === "all" || inv.project_id === filterInvoiceProject;
      const matchPaymentSource = filterInvoicePaymentSource === "all" || inv.payment_source === filterInvoicePaymentSource;
      const matchCategory = filterInvoiceCategory === "all" || inv.category === filterInvoiceCategory;
      const matchSubcategory = filterInvoiceSubcategory === "all" || inv.subcategory === filterInvoiceSubcategory;
      return matchSearch && matchType && matchStatus && matchProject && matchPaymentSource && matchCategory && matchSubcategory;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date || a.created_date || 0);
      const dateB = new Date(b.date || b.created_date || 0);
      return sortInvoiceOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setShowForm(false);
      setEditingExpense(null);
    },
  });

  const handleInlineUpdate = async (id, field, value) => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;
    await base44.entities.Expense.update(id, { ...expense, [field]: value });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const handleSubmit = async (data) => {
    if (editingExpense) {
      await updateMutation.mutateAsync({ id: editingExpense.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleDelete = async (expense) => {
    if (window.confirm(`Delete this expense from ${expense.payee}?`)) {
      setUndoItem({ ...expense });
      await deleteMutation.mutateAsync(expense.id);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoItem(null), 10000);
    }
  };

  const handleUndo = async () => {
    if (!undoItem) return;
    const { id, created_date, updated_date, created_by, ...data } = undoItem;
    await createMutation.mutateAsync(data);
    setUndoItem(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedExpenses.length} selected expenses?`)) {
      await Promise.all(selectedExpenses.map(id => deleteMutation.mutateAsync(id)));
      setSelectedExpenses([]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedExpenses.length === filteredExpenses.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(filteredExpenses.map(e => e.id));
    }
  };

  const toggleSelectExpense = (id) => {
    setSelectedExpenses(prev => 
      prev.includes(id) ? prev.filter(expId => expId !== id) : [...prev, id]
    );
  };

  const filteredExpenses = expenses.filter((e) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || [
      e.payee, e.description, e.category, e.subcategory,
      e.payment_source, e.date, e.amount?.toString(),
      projects.find(p => p.id === e.project_id)?.name,
    ].some(v => v?.toLowerCase().includes(q));
    const matchesProject = projectFilter === "all" || e.project_id === projectFilter;
    const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
    const matchesPayee = payeeFilter === "all" || e.payee === payeeFilter;
    const matchesPaymentSource = paymentSourceFilter === "all" || e.payment_source === paymentSourceFilter;
    return matchesSearch && matchesProject && matchesCategory && matchesPayee && matchesPaymentSource;
  });

  const exportToExcel = () => {
    const getProjectName = (projectId) => {
      return projects.find((p) => p.id === projectId)?.name || "Unknown";
    };

    const csvData = [
      ["Date", "Project", "Category", "Subcategory", "Payee", "Description", "Amount (€)", "Payment Source"],
      ...filteredExpenses.map((e) => [
        e.date,
        getProjectName(e.project_id),
        e.category || "",
        e.subcategory || "",
        e.payee || "",
        e.description || "",
        e.amount || 0,
        e.payment_source || "",
      ]),
    ];

    const csvContent = csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importFromExcel = async (event) => {
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
              date: { type: "string" },
              project: { type: "string" },
              category: { type: "string" },
              subcategory: { type: "string" },
              payee: { type: "string" },
              description: { type: "string" },
              amount: { type: "number" },
              payment_source: { type: "string" }
            }
          }
        }
      });

      if (result.status === "success" && result.output) {
        const categoryMap = {
          'labor': 'labor',
          'subcontractor': 'subcontractor',
          'materials': 'materials',
          'equipment': 'equipment',
          'general_expenses': 'general_expenses',
          'general expenses': 'general_expenses',
          'general': 'general_expenses'
        };

        const expensesToCreate = result.output.map(row => {
          const project = projects.find(p => p.name === row.project);
          const categoryLower = row.category?.toLowerCase().trim();
          const category = categoryMap[categoryLower] || 'general_expenses';
          
          return {
            date: row.date,
            project_id: project?.id || projects[0]?.id,
            category: category,
            subcategory: row.subcategory,
            payee: row.payee,
            description: row.description,
            amount: row.amount,
            payment_source: row.payment_source
          };
        });

        await Promise.all(expensesToCreate.map(exp => createMutation.mutateAsync(exp)));
        alert(`Successfully imported ${expensesToCreate.length} expenses`);
      } else {
        alert("Failed to extract data from file");
      }
    } catch (error) {
      alert("Error importing file. Please check the format.");
    }
  };

  const syncFromGoogleSheets = async () => {
    setSyncing(true);
    try {
      const result = await base44.functions.invoke('importFromGoogleSheets', {});
      
      if (result.data.success) {
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        
        const imported = result.data.imported;
        const messages = [];
        if (imported.expenses > 0) messages.push(`${imported.expenses} expenses`);
        if (imported.income > 0) messages.push(`${imported.income} income`);
        if (imported.projects > 0) messages.push(`${imported.projects} projects`);
        if (imported.tasks > 0) messages.push(`${imported.tasks} tasks`);
        if (imported.contacts > 0) messages.push(`${imported.contacts} contacts`);
        
        alert(`Successfully synced from Google Sheets:\n${messages.join(', ')}`);
      } else {
        alert("Failed to sync from Google Sheets");
      }
    } catch (error) {
      alert(error.response?.data?.error || "Error syncing from Google Sheets");
    }
    setSyncing(false);
  };

  const extractSheetId = (url) => {
    // Extract sheet ID from various Google Sheets URL formats
    const patterns = [
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      /^([a-zA-Z0-9-_]+)$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const importFromSheet = async () => {
    const spreadsheetId = extractSheetId(sheetUrl);
    
    if (!spreadsheetId) {
      alert("Please enter a valid Google Sheets URL or ID");
      return;
    }

    setImporting(true);
    try {
      const result = await base44.functions.invoke('importExpensesFromSheet', { spreadsheetId });
      
      if (result.data.success) {
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        alert(`Successfully imported ${result.data.imported} expenses from Google Sheets`);
        setShowSheetImport(false);
        setSheetUrl("");
      }
    } catch (error) {
      alert(error.response?.data?.error || "Error importing from Google Sheets");
    }
    setImporting(false);
  };

  if (expensesLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1e3a5f]/20"></div>
          <p className="text-gray-500">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="w-full py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#1e3a5f]">Project Expenses</h1>
            <p className="text-gray-500 mt-1">Track and manage project costs and revenue</p>
          </div>
          {activeTab === "expenses" && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={syncFromGoogleSheets} variant="outline" disabled={syncing} className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white">
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Backup'}
              </Button>
              <Button onClick={() => setShowSheetImport(true)} variant="outline" className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Import from Google Sheets
              </Button>
              <Button type="button" variant="outline" className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white cursor-pointer"
                onClick={() => document.getElementById('expense-import').click()}>
                <Upload className="w-4 h-4 mr-2" />Import CSV
              </Button>
              <input id="expense-import" type="file" accept=".csv" className="hidden" onChange={importFromExcel} />
              <Button onClick={exportToExcel} variant="outline" disabled={filteredExpenses.length === 0} className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white">
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
              <Button onClick={() => setScanOpen(true)} variant="outline" className="border-[#c9a962] text-[#c9a962] hover:bg-[#c9a962] hover:text-white">
                <ScanLine className="w-4 h-4 mr-2" />Scan Invoice
              </Button>
              <Button onClick={() => { setEditingExpense(null); setShowForm(true); }} className="bg-[#1e3a5f] hover:bg-[#152a45]" disabled={projects.length === 0}>
                <Plus className="w-4 h-4 mr-2" />Add Expense
              </Button>
            </div>
          )}
          {activeTab === "income" && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={exportIncomeToCSV} variant="outline" disabled={filteredIncomes.length === 0} className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white">
                <Download className="w-4 h-4 mr-2" />Export
              </Button>
              <Button onClick={() => { setEditingIncome(null); setShowIncomeForm(true); }} className="bg-[#1e3a5f] hover:bg-[#152a45]" disabled={projects.length === 0}>
                <Plus className="w-4 h-4 mr-2" />Add Income
              </Button>
            </div>
          )}

        </motion.div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {[
            { key: "expenses", label: "Expenses" },
            { key: "income", label: "Income" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-[#1e3a5f] text-[#1e3a5f]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Expenses Tab */}
        {activeTab === "expenses" && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            <div className="xl:col-span-3 space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Search by payee, description, category, project, amount..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
                  </div>
                  <SearchableSelect value={projectFilter} onValueChange={setProjectFilter} placeholder="Project" triggerClassName="w-[180px]"
                    items={[{ value: "all", label: "All Projects" }, ...projects.map(p => ({ value: p.id, label: p.name }))]} />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {(dropdownLists.find(l => l.list_name === "expense_categories")?.options || ["labor", "subcontractor", "materials", "equipment", "general_expenses"]).map(cat => (
                        <SelectItem key={cat} value={cat}>{cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <SearchableSelect value={payeeFilter} onValueChange={setPayeeFilter} placeholder="Payee" triggerClassName="w-[160px]"
                    items={[{ value: "all", label: "All Payees" }, ...contacts.map(c => ({ value: c.name, label: c.name }))]} />
                  <SearchableSelect value={paymentSourceFilter} onValueChange={setPaymentSourceFilter} placeholder="Payment Source" triggerClassName="w-[160px]"
                    items={[{ value: "all", label: "All Payment Sources" }, ...paymentSources.map(ps => ({ value: ps.name, label: ps.name }))]} />
                </div>
              </motion.div>

              {selectedExpenses.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1e3a5f] text-white rounded-xl p-4 flex items-center justify-between">
                  <span className="font-medium">{selectedExpenses.length} selected</span>
                  <Button onClick={handleBulkDelete} variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700">
                    <Trash2 className="w-4 h-4 mr-2" />Delete Selected
                  </Button>
                </motion.div>
              )}

              <ExpenseTable expenses={filteredExpenses} projects={projects} contacts={contacts}
                showProject={projectFilter === "all"} selectedExpenses={selectedExpenses}
                onSelectAll={toggleSelectAll} onSelectExpense={toggleSelectExpense}
                onEdit={(expense) => { setEditingExpense(expense); setShowForm(true); }}
                onUpdate={handleInlineUpdate} onDelete={handleDelete}
                onViewContact={(contact) => setViewingContact(contact)} />

              {/* Invoices Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <button
                  onClick={() => setShowInvoicesSection(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#1e3a5f]" />
                    <span className="font-semibold text-[#1e3a5f]">Invoices</span>
                    {invoices.length > 0 && <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{invoices.length}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); setScanOpen(true); }} className="bg-[#1e3a5f] hover:bg-[#152a45] gap-1 h-7 text-xs">
                      <ScanLine className="w-3 h-3" /> Scan Invoice
                    </Button>
                    {showInvoicesSection ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                <AnimatePresence>
                  {showInvoicesSection && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
                        {/* Filters */}
                        <div className="flex flex-wrap gap-3 items-center">
                          <div className="relative flex-1 min-w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input value={searchVendor} onChange={(e) => setSearchVendor(e.target.value)} placeholder="Αναζήτηση σε vendor, αρ. τιμολογίου, περιγραφή, έργο..." className="pl-9 pr-8" />
                            {searchVendor && (
                              <button onClick={() => setSearchVendor("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                              </button>
                            )}
                          </div>
                          <Select value={filterInvoiceType} onValueChange={setFilterInvoiceType}>
                            <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                              <SelectItem value="income">Income</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={filterInvoiceStatus} onValueChange={setFilterInvoiceStatus}>
                            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="transferred">Transferred</SelectItem>
                            </SelectContent>
                          </Select>
                          <SearchableSelect value={filterInvoiceProject} onValueChange={setFilterInvoiceProject} placeholder="Project" triggerClassName="w-[160px]"
                            items={[{ value: "all", label: "All Projects" }, ...projects.map(p => ({ value: p.id, label: p.name }))]} />
                          <SearchableSelect value={filterInvoicePaymentSource} onValueChange={setFilterInvoicePaymentSource} placeholder="Payment Source" triggerClassName="w-[160px]"
                            items={[{ value: "all", label: "All Sources" }, ...paymentSources.map(ps => ({ value: ps.name, label: ps.name }))]} />
                          <Select value={filterInvoiceCategory} onValueChange={v => { setFilterInvoiceCategory(v); setFilterInvoiceSubcategory("all"); }}>
                            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Categories</SelectItem>
                              {[...new Set(invoices.map(i => i.category).filter(Boolean))].map(cat => (
                                <SelectItem key={cat} value={cat}>{cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <SearchableSelect value={filterInvoiceSubcategory} onValueChange={setFilterInvoiceSubcategory} placeholder="Subcategory (Phase)" triggerClassName="w-[180px]"
                            items={[{ value: "all", label: "All Subcategories" }, ...[...new Set(invoices.filter(i => filterInvoiceCategory === "all" || i.category === filterInvoiceCategory).map(i => i.subcategory).filter(Boolean))].map(s => ({ value: s, label: s }))]} />
                          <Select value={sortInvoiceOrder} onValueChange={setSortInvoiceOrder}>
                            <SelectTrigger className="w-40"><SelectValue placeholder="Sort" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="newest">Newest First</SelectItem>
                              <SelectItem value="oldest">Oldest First</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {invoicesLoading ? (
                          <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
                          </div>
                        ) : invoices.length === 0 ? (
                          <div className="text-center py-10 text-gray-400">
                            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p>No invoices yet. Scan your first invoice.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                            {filteredInvoices.length === 0 && (
                              <div className="text-center py-8 text-gray-400">No invoices found</div>
                            )}
                            {filteredInvoices.map((invoice) => (
                              <div key={invoice.id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                <div className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-100/60 transition-colors" onClick={() => setExpandedInvoiceId(prev => prev === invoice.id ? null : invoice.id)}>
                                  <div className="flex-shrink-0">
                                    {invoice.type === "expense" ? (
                                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><Receipt className="w-3.5 h-3.5 text-red-500" /></div>
                                    ) : (
                                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center"><TrendingUp className="w-3.5 h-3.5 text-green-500" /></div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-gray-900 text-sm">{invoice.vendor_client}</span>
                                      {invoice.invoice_number && <span className="text-xs text-gray-400 flex items-center gap-1"><Hash className="w-3 h-3" />{invoice.invoice_number}</span>}
                                      <Badge className={invoice.type === "expense" ? "bg-red-100 text-red-700 border-0 text-xs" : "bg-green-100 text-green-700 border-0 text-xs"}>
                                        {invoice.type === "expense" ? "Expense" : "Income"}
                                      </Badge>
                                      {invoice.status === "transferred" && (
                                        <Badge className="bg-blue-100 text-blue-700 border-0 gap-1 text-xs"><CheckCircle2 className="w-3 h-3" /> Transferred</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                                      {invoice.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{safeFormatDate(invoice.date, "dd/MM/yyyy")}</span>}
                                      {invoice.project_id && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{projects.find(p => p.id === invoice.project_id)?.name || "—"}</span>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="font-bold text-[#1e3a5f]">{formatCurrency(invoice.total_amount)}</span>
                                    {invoice.status !== "transferred" && (
                                      <Button size="sm" onClick={(e) => { e.stopPropagation(); setTransferInvoice(invoice); }} className="bg-[#c9a962] hover:bg-[#b8954f] text-white gap-1 h-7 text-xs">
                                        <ArrowRight className="w-3 h-3" /> Transfer
                                      </Button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); setEditInvoice(invoice); }} className="p-1 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors">
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); deleteInvoiceMutation.mutate(invoice.id); }} className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-xs text-gray-400 hidden sm:inline">{expandedInvoiceId === invoice.id ? "Κλείσιμο" : "Λεπτομέρειες"}</span>
                                    {expandedInvoiceId === invoice.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                  </div>
                                </div>
                                <AnimatePresence>
                                  {expandedInvoiceId === invoice.id && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                      <div className="border-t border-gray-200 px-4 py-4 bg-white">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          <div className="space-y-3">
                                            {invoice.image_url && (
                                              <img src={invoice.image_url} alt="Invoice" className="w-full max-h-52 object-contain rounded-lg border border-gray-200 bg-white" />
                                            )}
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                              {invoice.invoice_number && <div><span className="text-gray-400 text-xs">Invoice #</span><p className="font-medium">{invoice.invoice_number}</p></div>}
                                              {invoice.due_date && <div><span className="text-gray-400 text-xs">Due Date</span><p className="font-medium">{safeFormatDate(invoice.due_date, "dd/MM/yyyy")}</p></div>}
                                              {invoice.payment_source && <div><span className="text-gray-400 text-xs">Payment Source</span><p className="font-medium">{invoice.payment_source}</p></div>}
                                              {invoice.subcategory && <div><span className="text-gray-400 text-xs">Subcategory</span><p className="font-medium">{invoice.subcategory}</p></div>}
                                            </div>
                                            {invoice.notes && <div><span className="text-gray-400 text-xs">Notes</span><p className="text-sm text-gray-700 mt-1">{invoice.notes}</p></div>}
                                          </div>
                                          <div>
                                            {invoice.items && invoice.items.length > 0 ? (
                                              <div>
                                                <h4 className="text-sm font-semibold text-gray-700 mb-2">Line Items</h4>
                                                <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                                                  <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 text-gray-500 text-xs">
                                                      <tr>
                                                        <th className="text-left px-3 py-2">Description</th>
                                                        <th className="text-right px-3 py-2">Qty</th>
                                                        <th className="text-right px-3 py-2">Unit Price</th>
                                                        <th className="text-right px-3 py-2">Total</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {invoice.items.map((item, i) => (
                                                        <tr key={i} className="border-t border-gray-100">
                                                          <td className="px-3 py-2">{item.description}</td>
                                                          <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                                                          <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                                                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                                <div className="mt-2 space-y-1 text-sm">
                                                  {invoice.subtotal != null && <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>}
                                                  {invoice.tax_amount != null && invoice.tax_amount > 0 && <div className="flex justify-between text-gray-500"><span>Tax</span><span>{formatCurrency(invoice.tax_amount)}</span></div>}
                                                  <div className="flex justify-between font-bold text-[#1e3a5f] border-t border-gray-200 pt-1"><span>Total</span><span>{formatCurrency(invoice.total_amount)}</span></div>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="text-sm text-gray-400 italic">No line items extracted</div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Summary Bar */}
                        {filteredInvoices.length > 0 && (
                          <div className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-3 flex flex-wrap gap-6 items-center justify-end">
                            <span className="text-sm text-gray-500">{filteredInvoices.length} invoices</span>
                            {(filterInvoiceType === "all" || filterInvoiceType === "expense") && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Invoices Expenses:</span>
                                <span className="font-bold text-red-600">{formatCurrency(filteredInvoices.filter(i => i.type === "expense").reduce((s, i) => s + (i.total_amount || 0), 0))}</span>
                              </div>
                            )}
                            {(filterInvoiceType === "all" || filterInvoiceType === "income") && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Invoices Income:</span>
                                <span className="font-bold text-green-600">{formatCurrency(filteredInvoices.filter(i => i.type === "income").reduce((s, i) => s + (i.total_amount || 0), 0))}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 border-l border-gray-200 pl-6">
                              <span className="text-sm text-gray-500">Invoices Total:</span>
                              <span className="font-bold text-[#1e3a5f]">{formatCurrency(filteredInvoices.reduce((s, i) => s + (i.total_amount || 0), 0))}</span>
                            </div>
                            <div className="flex items-center gap-2 border-l border-gray-200 pl-6">
                              <span className="text-sm font-semibold text-gray-700">+ Expenses:</span>
                              <span className="font-bold text-[#1e3a5f]">{formatCurrency(filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0))}</span>
                            </div>
                            <div className="flex items-center gap-2 border-l border-gray-200 pl-6 bg-[#1e3a5f] text-white rounded-lg px-4 py-1">
                              <span className="text-sm font-semibold">Σύνολο:</span>
                              <span className="font-bold text-lg">
                                {formatCurrency(
                                  filteredInvoices.filter(i => i.type === "expense").reduce((s, i) => s + (i.total_amount || 0), 0) +
                                  filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0)
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="xl:col-span-1">
              <ExpenseSummary expenses={filteredExpenses}
                budget={projectFilter !== "all" ? projects.find(p => p.id === projectFilter)?.budget : projects.reduce((sum, p) => sum + (p.budget || 0), 0)} />
            </div>
          </div>
        )}

        {/* Income Tab */}
        {activeTab === "income" && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            <div className="xl:col-span-3 space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Search by source or description..." value={incomeSearch} onChange={(e) => setIncomeSearch(e.target.value)} className="pl-10" />
                  </div>
                  <SearchableSelect value={incomeProjectFilter} onValueChange={setIncomeProjectFilter} placeholder="Project" triggerClassName="w-[180px]"
                    items={[{ value: "all", label: "All Projects" }, ...projects.map(p => ({ value: p.id, label: p.name }))]} />
                  <Select value={incomeCategoryFilter} onValueChange={setIncomeCategoryFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {incomeCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>

              {selectedIncomes.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1e3a5f] text-white rounded-xl p-4 flex items-center justify-between">
                  <span className="font-medium">{selectedIncomes.length} selected</span>
                  <Button onClick={handleIncomeBulkDelete} variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700">
                    <Trash2 className="w-4 h-4 mr-2" />Delete Selected
                  </Button>
                </motion.div>
              )}

              <IncomeTable incomes={filteredIncomes} projects={projects} contacts={contacts}
                showProject={incomeProjectFilter === "all"}
                selectedIncomes={selectedIncomes}
                onSelectAll={() => setSelectedIncomes(selectedIncomes.length === filteredIncomes.length ? [] : filteredIncomes.map(i => i.id))}
                onSelectIncome={(id) => setSelectedIncomes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                onEdit={(income) => { setEditingIncome(income); setShowIncomeForm(true); }}
                onUpdate={handleIncomeInlineUpdate} onDelete={handleIncomeDelete}
                onViewContact={(contact) => setViewingContact(contact)} />
            </div>
            <div className="xl:col-span-1">
              <IncomeSummary incomes={incomeProjectFilter !== "all" ? filteredIncomes : incomes} />
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      <ExpenseForm
        expense={editingExpense}
        projects={projects}
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingExpense(null);
        }}
        onSubmit={handleSubmit}
      />

      {/* Contact Card */}
      <ContactCard
        contact={viewingContact}
        open={!!viewingContact}
        onClose={() => setViewingContact(null)}
        onEdit={(contact) => setEditingContact(contact)}
      />

      {/* Contact Form */}
      <ContactForm
        contact={editingContact}
        open={!!editingContact}
        onClose={() => setEditingContact(null)}
        onSubmit={(data) => updateContactMutation.mutate({ id: editingContact.id, data })}
      />

      {/* Expense Undo Bar */}
      {undoItem && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl">
          <span className="text-sm">Expense from <strong>{undoItem.payee}</strong> deleted</span>
          <button onClick={handleUndo} className="flex items-center gap-1.5 bg-white text-gray-900 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Undo
          </button>
          <button onClick={() => setUndoItem(null)} className="text-gray-400 hover:text-white text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Income Undo Bar */}
      {incomeUndoItem && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl">
          <span className="text-sm">Income from <strong>{incomeUndoItem.source}</strong> deleted</span>
          <button onClick={handleIncomeUndo} className="flex items-center gap-1.5 bg-white text-gray-900 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Undo
          </button>
          <button onClick={() => setIncomeUndoItem(null)} className="text-gray-400 hover:text-white text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Invoice Dialogs */}
      <ScanInvoiceDialog open={scanOpen} onClose={() => setScanOpen(false)} projects={projects}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["invoices"] })} />
      <EditInvoiceDialog open={!!editInvoice} onClose={() => setEditInvoice(null)} invoice={editInvoice} projects={projects}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["invoices"] })} />
      {transferInvoice && (
        <TransferInvoiceDialog invoice={transferInvoice} projects={projects} onClose={() => setTransferInvoice(null)}
          onTransferred={() => {
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["incomes"] });
            setTransferInvoice(null);
          }} />
      )}

      {/* Income Form */}
      <IncomeForm
        income={editingIncome}
        projects={projects}
        open={showIncomeForm}
        onClose={() => { setShowIncomeForm(false); setEditingIncome(null); }}
        onSubmit={handleIncomeSubmit}
      />

      {/* Import from Sheet Dialog */}
      <Dialog open={showSheetImport} onOpenChange={setShowSheetImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Expenses from Google Sheets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Google Sheets URL or ID</Label>
              <Input
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <p className="text-xs text-gray-500 mt-2">
                Sheet must have an "Expenses" tab with columns: Date, Project, Category, Subcategory, Payee, Description, Amount, Payment Source
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSheetImport(false)}>
                Cancel
              </Button>
              <Button 
                onClick={importFromSheet} 
                disabled={importing || !sheetUrl}
                className="bg-[#1e3a5f] hover:bg-[#152a45]"
              >
                {importing ? "Importing..." : "Import"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
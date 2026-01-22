import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import ExpenseTable from "@/components/expenses/ExpenseTable";
import ExpenseSummary from "@/components/expenses/ExpenseSummary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Download, Receipt, Upload, Trash2 } from "lucide-react";

export default function Expenses() {
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [payeeFilter, setPayeeFilter] = useState("all");
  const [paymentSourceFilter, setPaymentSourceFilter] = useState("all");
  const [selectedExpenses, setSelectedExpenses] = useState([]);

  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });

  const { data: payees = [] } = useQuery({
    queryKey: ["payees"],
    queryFn: () => base44.entities.Payee.list("name"),
  });

  const { data: paymentSources = [] } = useQuery({
    queryKey: ["paymentSources"],
    queryFn: () => base44.entities.PaymentSource.list("name"),
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
      await deleteMutation.mutateAsync(expense.id);
    }
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
    const matchesSearch =
      e.payee?.toLowerCase().includes(search.toLowerCase()) ||
      e.description?.toLowerCase().includes(search.toLowerCase());
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
        new Date(e.date).toLocaleDateString("de-DE"),
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
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-[#1e3a5f]">Expenses</h1>
            <p className="text-gray-500 mt-1">Track and manage project costs</p>
          </div>
          <div className="flex gap-2">
            <label htmlFor="expense-import">
              <Button
                type="button"
                variant="outline"
                className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white cursor-pointer"
                onClick={() => document.getElementById('expense-import').click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </label>
            <input
              id="expense-import"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={importFromExcel}
            />
            <Button
              onClick={exportToExcel}
              variant="outline"
              disabled={filteredExpenses.length === 0}
              className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={() => {
                setEditingExpense(null);
                setShowForm(true);
              }}
              className="bg-[#1e3a5f] hover:bg-[#152a45]"
              disabled={projects.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
            >
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by payee or description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="labor">Labor</SelectItem>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                    <SelectItem value="materials">Materials</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="general_expenses">General Expenses</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={payeeFilter} onValueChange={setPayeeFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Payee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payees</SelectItem>
                    {payees.map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={paymentSourceFilter} onValueChange={setPaymentSourceFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Payment Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment Sources</SelectItem>
                    {paymentSources.map((ps) => (
                      <SelectItem key={ps.id} value={ps.name}>
                        {ps.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Bulk Actions */}
            {selectedExpenses.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1e3a5f] text-white rounded-xl p-4 flex items-center justify-between"
              >
                <span className="font-medium">{selectedExpenses.length} selected</span>
                <Button
                  onClick={handleBulkDelete}
                  variant="destructive"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </motion.div>
            )}

            {/* Expense Table */}
            <ExpenseTable
              expenses={filteredExpenses}
              projects={projects}
              showProject={projectFilter === "all"}
              selectedExpenses={selectedExpenses}
              onSelectAll={toggleSelectAll}
              onSelectExpense={toggleSelectExpense}
              onEdit={(expense) => {
                setEditingExpense(expense);
                setShowForm(true);
              }}
              onDelete={handleDelete}
            />
          </div>

          {/* Sidebar Summary */}
          <div className="xl:col-span-1">
            <ExpenseSummary
              expenses={projectFilter !== "all" ? filteredExpenses : expenses}
              budget={
                projectFilter !== "all"
                  ? projects.find((p) => p.id === projectFilter)?.budget
                  : projects.reduce((sum, p) => sum + (p.budget || 0), 0)
              }
            />
          </div>
        </div>
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
    </div>
  );
}
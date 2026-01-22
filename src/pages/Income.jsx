import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import IncomeForm from "@/components/income/IncomeForm";
import IncomeTable from "@/components/income/IncomeTable";
import IncomeSummary from "@/components/income/IncomeSummary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Download, Upload, Trash2 } from "lucide-react";

export default function Income() {
  const [showForm, setShowForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedIncomes, setSelectedIncomes] = useState([]);

  const queryClient = useQueryClient();

  const { data: incomes = [], isLoading: incomesLoading } = useQuery({
    queryKey: ["incomes"],
    queryFn: () => base44.entities.Income.list("-date"),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Income.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Income.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incomes"] });
      setShowForm(false);
      setEditingIncome(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Income.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incomes"] }),
  });

  const handleSubmit = async (data) => {
    if (editingIncome) {
      await updateMutation.mutateAsync({ id: editingIncome.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleDelete = async (income) => {
    if (window.confirm(`Delete this income from ${income.source}?`)) {
      await deleteMutation.mutateAsync(income.id);
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIncomes.length} selected income records?`)) {
      await Promise.all(selectedIncomes.map(id => deleteMutation.mutateAsync(id)));
      setSelectedIncomes([]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIncomes.length === filteredIncomes.length) {
      setSelectedIncomes([]);
    } else {
      setSelectedIncomes(filteredIncomes.map(i => i.id));
    }
  };

  const toggleSelectIncome = (id) => {
    setSelectedIncomes(prev => 
      prev.includes(id) ? prev.filter(incId => incId !== id) : [...prev, id]
    );
  };

  const filteredIncomes = incomes.filter((i) => {
    const matchesSearch =
      i.source?.toLowerCase().includes(search.toLowerCase()) ||
      i.description?.toLowerCase().includes(search.toLowerCase());
    const matchesProject = projectFilter === "all" || i.project_id === projectFilter;
    const matchesCategory = categoryFilter === "all" || i.category === categoryFilter;
    return matchesSearch && matchesProject && matchesCategory;
  });

  const exportToExcel = () => {
    const getProjectName = (projectId) => {
      return projects.find((p) => p.id === projectId)?.name || "Unknown";
    };

    const csvData = [
      ["Date", "Project", "Category", "Source", "Description", "Amount (€)", "Payment Source"],
      ...filteredIncomes.map((i) => [
        new Date(i.date).toLocaleDateString("de-DE"),
        getProjectName(i.project_id),
        i.category || "",
        i.source || "",
        i.description || "",
        i.amount || 0,
        i.payment_source || "",
      ]),
    ];

    const csvContent = csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `income_${new Date().toISOString().split("T")[0]}.csv`);
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
              source: { type: "string" },
              description: { type: "string" },
              amount: { type: "number" },
              payment_source: { type: "string" }
            }
          }
        }
      });

      if (result.status === "success" && result.output) {
        const categoryMap = {
          'sales': 'sales',
          'investment': 'investment',
          'rental': 'rental',
          'other': 'other'
        };

        const incomesToCreate = result.output.map(row => {
          const project = projects.find(p => p.name === row.project);
          const categoryLower = row.category?.toLowerCase().trim();
          const category = categoryMap[categoryLower] || 'other';
          
          return {
            date: row.date,
            project_id: project?.id || projects[0]?.id,
            category: category,
            source: row.source,
            description: row.description,
            amount: row.amount,
            payment_source: row.payment_source
          };
        });

        await Promise.all(incomesToCreate.map(inc => createMutation.mutateAsync(inc)));
        alert(`Successfully imported ${incomesToCreate.length} income records`);
      } else {
        alert("Failed to extract data from file");
      }
    } catch (error) {
      alert("Error importing file. Please check the format.");
    }
  };

  if (incomesLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1e3a5f]/20"></div>
          <p className="text-gray-500">Loading income...</p>
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
            <h1 className="text-3xl font-bold text-[#1e3a5f]">Income</h1>
            <p className="text-gray-500 mt-1">Track and manage project revenue</p>
          </div>
          <div className="flex gap-2">
            <label htmlFor="income-import">
              <Button
                type="button"
                variant="outline"
                className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white cursor-pointer"
                onClick={() => document.getElementById('income-import').click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </label>
            <input
              id="income-import"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={importFromExcel}
            />
            <Button
              onClick={exportToExcel}
              variant="outline"
              disabled={filteredIncomes.length === 0}
              className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={() => {
                setEditingIncome(null);
                setShowForm(true);
              }}
              className="bg-[#1e3a5f] hover:bg-[#152a45]"
              disabled={projects.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Income
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
                    placeholder="Search by source or description..."
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
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="rental">Rental</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Bulk Actions */}
            {selectedIncomes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1e3a5f] text-white rounded-xl p-4 flex items-center justify-between"
              >
                <span className="font-medium">{selectedIncomes.length} selected</span>
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

            {/* Income Table */}
            <IncomeTable
              incomes={filteredIncomes}
              projects={projects}
              showProject={projectFilter === "all"}
              selectedIncomes={selectedIncomes}
              onSelectAll={toggleSelectAll}
              onSelectIncome={toggleSelectIncome}
              onEdit={(income) => {
                setEditingIncome(income);
                setShowForm(true);
              }}
              onDelete={handleDelete}
            />
          </div>

          {/* Sidebar Summary */}
          <div className="xl:col-span-1">
            <IncomeSummary incomes={projectFilter !== "all" ? filteredIncomes : incomes} />
          </div>
        </div>
      </div>

      {/* Form */}
      <IncomeForm
        income={editingIncome}
        projects={projects}
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingIncome(null);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PayrollForm from "@/components/payroll/PayrollForm";
import PayrollScanDialog from "@/components/payroll/PayrollScanDialog";
import APDScanDialog from "@/components/payroll/APDScanDialog";
import GeneralExpensesTable from "@/components/company-expenses/GeneralExpensesTable";
import GeneralIncomeTable from "@/components/company-expenses/GeneralIncomeTable";
import CashRegisterCard from "@/components/company-expenses/CashRegisterCard";
import BankTransactionsTable from "@/components/bank/BankTransactionsTable";
import ReconciliationPanel from "@/components/bank/ReconciliationPanel";
import SortableHeader, { applySort } from "@/components/ui/sort-select";
import DuplicateWarningDialog from "@/components/shared/DuplicateWarningDialog";
import DuplicateScanPanel from "@/components/shared/DuplicateScanPanel";
import { findDuplicateMatches, duplicateConfigs } from "@/lib/duplicateDetector";
import { MobileCard } from "@/components/shared/MobileCard";
import {
  Plus, Search, Trash2, Pencil, FileText, ScanLine, Copy,
  Users, DollarSign, TrendingDown, Building2, ExternalLink, FileSpreadsheet
} from "lucide-react";
import { format } from "date-fns";
import ExcelExportButton from "@/components/shared/ExcelExportButton";
import { exportColumns, exportWorkbook } from "@/lib/excelExport";
import ResizableHeader from "@/components/shared/ResizableHeader";
import { useColumnWidths } from "@/hooks/useColumnWidths";

const periodTypeLabels = {
  regular: "Κανονικές Αποδοχές",
  christmas_bonus: "Δώρο Χριστουγέννων",
  easter_bonus: "Δώρο Πάσχα",
  vacation_allowance: "Επίδομα Αδείας",
  other: "Άλλο",
};

const periodTypeColors = {
  regular: "bg-blue-100 text-blue-700",
  christmas_bonus: "bg-red-100 text-red-700",
  easter_bonus: "bg-yellow-100 text-yellow-700",
  vacation_allowance: "bg-green-100 text-green-700",
  other: "bg-gray-100 text-gray-700",
};

export default function Payroll() {
  const [showForm, setShowForm] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [showAPDScan, setShowAPDScan] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [prefillData, setPrefillData] = useState(null);
  const [dupWarning, setDupWarning] = useState(null);
  const [showDupScan, setShowDupScan] = useState(false);
  const [sortField, setSortField] = useState("payment_date");
  const [sortDirection, setSortDirection] = useState("desc");
  const { widths: colW, setColumnWidth, autoFitByHeader } = useColumnWidths("payroll", { employee_name: 180, period: 130, period_type: 160, gross_salary: 130, total_insurance_deductions: 150, employer_insurance_amount: 140, net_salary: 120, payment_source: 130, payment_date: 110, files: 80 });
  const handleSort = (field, direction) => { setSortField(field); setSortDirection(direction); };

  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["payroll"],
    queryFn: () => base44.entities.Payroll.list("-payment_date"),
  });

  const { data: paymentSources = [] } = useQuery({
    queryKey: ["payment-sources"],
    queryFn: () => base44.entities.PaymentSource.list("name"),
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Payroll.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payroll"] }); setShowForm(false); setPrefillData(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Payroll.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payroll"] }); setShowForm(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Payroll.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payroll"] }),
  });

  const handleSubmit = async data => {
    const action = async () => {
      if (editing) await updateMutation.mutateAsync({ id: editing.id, data });
      else await createMutation.mutateAsync(data);
      setDupWarning(null);
    };
    const matches = findDuplicateMatches({ ...data, id: editing?.id }, records, duplicateConfigs.Payroll);
    if (matches.length > 0) { setDupWarning({ matches, action }); return; }
    await action();
  };

  const handleScanExtracted = data => {
    setPrefillData(data);
    setEditing(null);
    setShowForm(true);
  };

  const handleDelete = async record => {
    if (window.confirm(`Διαγραφή μισθοδοσίας "${record.employee_name} - ${record.period}";`)) {
      await deleteMutation.mutateAsync(record.id);
    }
  };

  const employees = [...new Set(records.map(r => r.employee_name))].sort();

  const filtered = records.filter(r => {
    const matchSearch = !search || r.employee_name?.toLowerCase().includes(search.toLowerCase()) || r.period?.toLowerCase().includes(search.toLowerCase());
    const matchEmployee = filterEmployee === "all" || r.employee_name === filterEmployee;
    const matchType = filterType === "all" || r.period_type === filterType;
    return matchSearch && matchEmployee && matchType;
  });

  const totalNet = filtered.reduce((s, r) => s + (r.net_salary || 0), 0);
  const totalEmployerInsurance = filtered.reduce((s, r) => s + (r.employer_insurance_amount || 0), 0);
  const totalEmployeeInsurance = filtered.reduce((s, r) => s + (r.total_insurance_deductions || 0), 0);
  const totalGross = filtered.reduce((s, r) => s + (r.gross_salary || 0), 0);

  const fmt = n => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n || 0);

  const sortedFiltered = applySort(filtered, sortField, sortDirection);

  const [exportingAll, setExportingAll] = useState(false);
  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const [payrollAll, expensesAll, incomeAll, bankAll] = await Promise.all([
        base44.entities.Payroll.list("-payment_date"),
        base44.entities.GeneralExpense.list("-date"),
        base44.entities.GeneralIncome.list("-date"),
        base44.entities.BankTransaction.list("-date"),
      ]);
      exportWorkbook([
        { name: "Μισθοδοσία", records: payrollAll, columns: exportColumns.payroll },
        { name: "Γενικά Έξοδα", records: expensesAll, columns: exportColumns.generalExpenses },
        { name: "Γενικά Έσοδα", records: incomeAll, columns: exportColumns.generalIncome },
        { name: "Κινήσεις Τράπεζας", records: bankAll, columns: exportColumns.bankTransactions },
      ], `company_finances_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExportingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-6">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1e3a5f]">Company Expenses</h1>
            <p className="text-gray-500 text-sm mt-1">Διαχείριση εξόδων εταιρείας</p>
          </div>
          <Button variant="outline" onClick={handleExportAll} disabled={exportingAll} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
            <FileSpreadsheet className="w-4 h-4 mr-2" />{exportingAll ? "Εξαγωγή..." : "Συνολική Εξαγωγή Excel"}
          </Button>
        </div>

        <Tabs defaultValue="payroll">
          <div className="sticky top-16 lg:top-0 z-30 bg-[#fafafa] pb-4 pt-1 mb-2 overflow-x-auto">
            <TabsList className="w-max min-w-full">
              <TabsTrigger value="payroll" className="whitespace-nowrap">Payroll Expenses</TabsTrigger>
              <TabsTrigger value="general" className="whitespace-nowrap">General Expenses</TabsTrigger>
              <TabsTrigger value="income" className="whitespace-nowrap">Income</TabsTrigger>
              <TabsTrigger value="bank" className="whitespace-nowrap">Κινήσεις Τράπεζας</TabsTrigger>
              <TabsTrigger value="reconciliation" className="whitespace-nowrap">Αντιστοίχιση</TabsTrigger>
            </TabsList>
          </div>

          {/* ── PAYROLL TAB ── */}
          <TabsContent value="payroll">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Καθαρές Αποδοχές", value: fmt(totalNet), icon: DollarSign, color: "bg-emerald-100 text-emerald-700" },
                { label: "Σύνολο Αποδοχών", value: fmt(totalGross), icon: TrendingDown, color: "bg-blue-100 text-blue-700" },
                { label: "Κρατήσεις Εργαζομένου", value: fmt(totalEmployeeInsurance), icon: Users, color: "bg-amber-100 text-amber-700" },
                { label: "Εισφορές Εργοδότη", value: fmt(totalEmployerInsurance), icon: Building2, color: "bg-purple-100 text-purple-700" },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                      <p className="text-lg font-bold text-[#1e3a5f]">{stat.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Payroll Toolbar */}
            <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
              <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center flex-1">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Αναζήτηση εργαζομένου ή περιόδου..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Εργαζόμενος" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Όλοι οι εργαζόμενοι</SelectItem>
                    {employees.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Τύπος" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Όλοι οι τύποι</SelectItem>
                    {Object.entries(periodTypeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setShowScan(true)}>
                  <ScanLine className="w-4 h-4 mr-2" />Σάρωση Μισθοδοσίας
                </Button>
                <Button variant="outline" onClick={() => setShowAPDScan(true)} className="border-blue-200 text-blue-700 hover:bg-blue-50">
                  <ScanLine className="w-4 h-4 mr-2" />Σάρωση ΑΠΔ
                </Button>
                <Button variant="outline" onClick={() => setShowDupScan(true)} title="Έλεγχος διπλοτύπων">
                  <Copy className="w-4 h-4 mr-2" />Διπλότυπα
                </Button>
                <ExcelExportButton records={sortedFiltered} columns={exportColumns.payroll} sheetName="Μισθοδοσία" fileName={`μισθοδοσία_${new Date().toISOString().slice(0, 10)}.xlsx`} />
                <Button className="bg-[#1e3a5f] hover:bg-[#152a45]"
                  onClick={() => { setEditing(null); setPrefillData(null); setShowForm(true); }}>
                  <Plus className="w-4 h-4 mr-2" />Νέα Εγγραφή
                </Button>
              </div>
            </div>

            {/* Payroll Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {isLoading ? (
                <div className="text-center py-16 text-gray-400">Φόρτωση...</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400">Δεν βρέθηκαν εγγραφές μισθοδοσίας</p>
                  <Button className="mt-4 bg-[#1e3a5f] hover:bg-[#152a45]" onClick={() => { setEditing(null); setShowForm(true); }}>
                    <Plus className="w-4 h-4 mr-2" />Νέα Εγγραφή
                  </Button>
                </div>
              ) : (
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm table-fixed">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <ResizableHeader width={colW.employee_name} onResize={w => setColumnWidth("employee_name", w)} onAutoFit={() => autoFitByHeader("employee_name")}><SortableHeader label="Εργαζόμενος" field="employee_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} /></ResizableHeader>
                        <ResizableHeader width={colW.period} onResize={w => setColumnWidth("period", w)} onAutoFit={() => autoFitByHeader("period")}><SortableHeader label="Περίοδος" field="period" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} /></ResizableHeader>
                        <ResizableHeader width={colW.period_type} onResize={w => setColumnWidth("period_type", w)} onAutoFit={() => autoFitByHeader("period_type")}><SortableHeader label="Τύπος" field="period_type" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} /></ResizableHeader>
                        <ResizableHeader width={colW.gross_salary} onResize={w => setColumnWidth("gross_salary", w)} onAutoFit={() => autoFitByHeader("gross_salary")} align="right"><SortableHeader label="Σύν. Αποδ." field="gross_salary" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} align="right" /></ResizableHeader>
                        <ResizableHeader width={colW.total_insurance_deductions} onResize={w => setColumnWidth("total_insurance_deductions", w)} onAutoFit={() => autoFitByHeader("total_insurance_deductions")} align="right"><SortableHeader label="Κρατ. Εργ/νου" field="total_insurance_deductions" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} align="right" /></ResizableHeader>
                        <ResizableHeader width={colW.employer_insurance_amount} onResize={w => setColumnWidth("employer_insurance_amount", w)} onAutoFit={() => autoFitByHeader("employer_insurance_amount")} align="right"><SortableHeader label="Εισφ. Εργοδ." field="employer_insurance_amount" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} align="right" /></ResizableHeader>
                        <ResizableHeader width={colW.net_salary} onResize={w => setColumnWidth("net_salary", w)} onAutoFit={() => autoFitByHeader("net_salary")} align="right"><SortableHeader label="Καθαρές" field="net_salary" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} align="right" /></ResizableHeader>
                        <ResizableHeader width={colW.payment_source} onResize={w => setColumnWidth("payment_source", w)} onAutoFit={() => autoFitByHeader("payment_source")}><SortableHeader label="Πηγή" field="payment_source" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} /></ResizableHeader>
                        <ResizableHeader width={colW.payment_date} onResize={w => setColumnWidth("payment_date", w)} onAutoFit={() => autoFitByHeader("payment_date")}><SortableHeader label="Ημ/νία" field="payment_date" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} /></ResizableHeader>
                        <ResizableHeader width={colW.files} onResize={w => setColumnWidth("files", w)} onAutoFit={() => autoFitByHeader("files")} align="center">Αρχεία</ResizableHeader>
                        <th className="px-3 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {sortedFiltered.map(r => (
                          <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-3 font-medium text-[#1e3a5f] truncate">{r.employee_name}</td>
                            <td className="px-3 py-3 text-gray-600 truncate">{r.period}</td>
                            <td className="px-3 py-3">
                              <Badge className={`${periodTypeColors[r.period_type] || "bg-gray-100 text-gray-700"} border-0 text-xs whitespace-nowrap`}>
                                {periodTypeLabels[r.period_type] || r.period_type}
                              </Badge>
                            </td>
                            <td className="px-3 py-3 text-right text-gray-700 tabular-nums">{fmt(r.gross_salary)}</td>
                            <td className="px-3 py-3 text-right text-amber-700 tabular-nums">{fmt(r.total_insurance_deductions)}</td>
                            <td className="px-3 py-3 text-right text-purple-700 tabular-nums">{fmt(r.employer_insurance_amount)}</td>
                            <td className="px-3 py-3 text-right font-semibold text-emerald-700 tabular-nums">{fmt(r.net_salary)}</td>
                            <td className="px-3 py-3 text-gray-500 text-xs truncate">{r.payment_source || "—"}</td>
                            <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                              {r.payment_date ? format(new Date(r.payment_date), "dd/MM/yyyy") : "—"}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {r.apd_file_url && (
                                  <a href={r.apd_file_url} target="_blank" rel="noopener noreferrer" title="ΑΠΔ">
                                    <Button variant="ghost" size="icon" className="w-7 h-7 text-blue-600">
                                      <FileText className="w-3.5 h-3.5" />
                                    </Button>
                                  </a>
                                )}
                                {r.payslip_file_url && (
                                  <a href={r.payslip_file_url} target="_blank" rel="noopener noreferrer" title="Απόδειξη">
                                    <Button variant="ghost" size="icon" className="w-7 h-7 text-[#1e3a5f]">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </Button>
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1 justify-end">
                                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { setEditing(r); setShowForm(true); }}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="w-7 h-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(r)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td colSpan={3} className="px-3 py-3 font-semibold text-gray-600">Σύνολο ({filtered.length} εγγραφές)</td>
                        <td className="px-3 py-3 text-right font-semibold text-gray-700 tabular-nums">{fmt(totalGross)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-amber-700 tabular-nums">{fmt(totalEmployeeInsurance)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-purple-700 tabular-nums">{fmt(totalEmployerInsurance)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-emerald-700 tabular-nums">{fmt(totalNet)}</td>
                        <td colSpan={4}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
            {/* Mobile payroll cards */}
            {!isLoading && filtered.length > 0 && (
              <div className="md:hidden grid grid-cols-1 gap-3">
                {sortedFiltered.map(r => (
                  <MobileCard
                    key={r.id}
                    title={r.employee_name}
                    titleRight={<span className="font-semibold text-emerald-700 tabular-nums">{fmt(r.net_salary)}</span>}
                    badge={<Badge className={`${periodTypeColors[r.period_type] || "bg-gray-100 text-gray-700"} border-0 text-xs whitespace-nowrap`}>{periodTypeLabels[r.period_type] || r.period_type}</Badge>}
                    meta={`${r.period || "—"} · ${r.payment_date ? format(new Date(r.payment_date), "dd/MM/yyyy") : "—"}`}
                    rows={[
                      { label: "Σύν. Αποδ.", value: fmt(r.gross_salary), align: "right" },
                      { label: "Κρατ. Εργ/νου", value: fmt(r.total_insurance_deductions), align: "right", className: "text-amber-700" },
                      { label: "Εισφ. Εργοδ.", value: fmt(r.employer_insurance_amount), align: "right", className: "text-purple-700" },
                      { label: "Πηγή", value: r.payment_source || "—" },
                    ]}
                    actions={(
                      <>
                        {r.apd_file_url && (
                          <a href={r.apd_file_url} target="_blank" rel="noopener noreferrer" title="ΑΠΔ">
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-blue-600"><FileText className="w-3.5 h-3.5" /></Button>
                          </a>
                        )}
                        {r.payslip_file_url && (
                          <a href={r.payslip_file_url} target="_blank" rel="noopener noreferrer" title="Απόδειξη">
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-[#1e3a5f]"><ExternalLink className="w-3.5 h-3.5" /></Button>
                          </a>
                        )}
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { setEditing(r); setShowForm(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(r)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </>
                    )}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── GENERAL EXPENSES TAB ── */}
          <TabsContent value="general">
            <GeneralExpensesTable />
            <CashRegisterCard />
          </TabsContent>

          {/* ── GENERAL INCOME TAB ── */}
          <TabsContent value="income">
            <GeneralIncomeTable />
          </TabsContent>

          {/* ── BANK TRANSACTIONS TAB ── */}
          <TabsContent value="bank">
            <BankTransactionsTable paymentSources={paymentSources} />
          </TabsContent>

          {/* ── RECONCILIATION TAB ── */}
          <TabsContent value="reconciliation">
            <ReconciliationPanel />
          </TabsContent>
        </Tabs>
      </div>

      <PayrollForm
        record={editing || prefillData}
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); setPrefillData(null); }}
        onSubmit={handleSubmit}
      />

      <PayrollScanDialog
        open={showScan}
        onClose={() => setShowScan(false)}
        onExtracted={handleScanExtracted}
      />

      <APDScanDialog
        open={showAPDScan}
        onClose={() => setShowAPDScan(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["payroll"] })}
      />

      <DuplicateWarningDialog
        open={!!dupWarning}
        matches={dupWarning?.matches || []}
        config={duplicateConfigs.Payroll}
        onConfirm={async () => { if (dupWarning?.action) await dupWarning.action(); setDupWarning(null); }}
        onCancel={() => setDupWarning(null)}
      />
      <DuplicateScanPanel
        open={showDupScan}
        onClose={() => setShowDupScan(false)}
        records={records}
        config={duplicateConfigs.Payroll}
        onDelete={async id => { await deleteMutation.mutateAsync(id); }}
      />
    </div>
  );
}
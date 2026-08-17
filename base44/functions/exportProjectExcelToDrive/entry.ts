import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import * as XLSX from 'npm:xlsx@0.18.5';
import { getProjectFolderId, uploadFileToFolder } from '../../shared/driveFolders.ts';

function sheet(headers: string[], rows: any[][]) {
  return [headers, ...rows];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { projectId } = await req.json();
    if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });

    // Load project
    const projects = await base44.entities.Project.filter({ id: projectId });
    const project = projects && projects[0];
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    // Gather all data related to this project
    const [
      expenses,
      incomes,
      tasks,
      budgetItems,
      payroll,
      generalExpenses,
      generalIncomes,
      notes,
      invoices,
    ] = await Promise.all([
      base44.entities.Expense.filter({ project_id: projectId }, '-date'),
      base44.entities.Income.filter({ project_id: projectId }, '-date'),
      base44.entities.Task.filter({ project_id: projectId }, '-created_date'),
      base44.entities.BudgetItem.filter({ project_id: projectId }),
      base44.entities.Payroll.filter({ project_id: projectId }, '-payment_date'),
      base44.entities.GeneralExpense.filter({ project_id: projectId }, '-date'),
      base44.entities.GeneralIncome.filter({ project_id: projectId }, '-date'),
      base44.entities.ConstructionNote.filter({ project_id: projectId }, '-date'),
      base44.entities.Invoice.filter({ project_id: projectId }, '-date'),
    ]);

    const projectInfoRows = [
      ['Name', project.name || ''],
      ['Status', project.status || ''],
      ['Property Type', project.property_type || ''],
      ['Address', project.address || ''],
      ['Land Size (m²)', project.land_size || ''],
      ['Building Coefficient', project.building_coefficient || ''],
      ['Built Area (m²)', project.built_area || ''],
      ['Budget (€)', project.budget || 0],
      ['Progress (%)', project.progress || 0],
      ['Priority', project.priority || ''],
      ['Start Date', project.start_date || ''],
      ['Target Completion', project.target_completion || ''],
      ['Description', project.description || ''],
    ];

    const budgetRows = (budgetItems || []).map((b: any) => [
      b.category || '', b.subcategory || '', b.description || '',
      b.quantity ?? 0, b.unit || '', b.unit_cost ?? 0, b.total_cost ?? 0, b.notes || '',
    ]);

    const expenseRows = (expenses || []).map((e: any) => [
      e.date?.slice(0, 10) || '', e.category || '', e.subcategory || '',
      e.payee || '', e.description || '', e.amount ?? 0, e.payment_source || '',
    ]);

    const incomeRows = (incomes || []).map((i: any) => [
      i.date?.slice(0, 10) || '', i.source || '', i.category || '',
      i.description || '', i.amount ?? 0, i.payment_source || '',
    ]);

    const taskRows = (tasks || []).map((t: any) => [
      t.title || '', t.phase || '', t.status || '', t.priority || '',
      t.assignee || '', t.due_date || '', t.estimated_hours ?? 0,
    ]);

    const payrollRows = (payroll || []).map((p: any) => [
      p.employee_name || '', p.period || '', p.period_type || '',
      p.payment_date?.slice(0, 10) || '', p.specialty || '', p.contract_type || '',
      p.gross_salary ?? 0, p.total_insurance_deductions ?? 0, p.income_tax ?? 0,
      p.net_salary ?? 0, p.final_payment ?? 0, p.payment_source || '',
    ]);

    const generalExpenseRows = (generalExpenses || []).map((e: any) => [
      e.date?.slice(0, 10) || '', e.category || '', e.description || '',
      e.amount ?? 0, e.payee || '', e.payment_source || '', e.notes || '',
    ]);

    const generalIncomeRows = (generalIncomes || []).map((i: any) => [
      i.date?.slice(0, 10) || '', i.category || '', i.description || '',
      i.net_amount ?? 0, i.vat_amount ?? 0, i.total_amount ?? 0,
      i.payer || '', i.payment_source || '', i.invoice_number || '',
    ]);

    const noteRows = (notes || []).map((n: any) => [
      n.date?.slice(0, 10) || '',
      n.weather?.description || n.weather?.condition || '',
      (n.technicians || []).join(', '),
      (n.engineers || []).join(', '),
      (n.subcontractors || []).join(', '),
      n.work_performed || '', n.issues || '', n.notes || '',
    ]);

    const invoiceRows = (invoices || []).map((inv: any) => [
      inv.invoice_number || '', inv.vendor_client || '', inv.vendor_eponymia || '',
      inv.vendor_afm || '', inv.date?.slice(0, 10) || '', inv.type || '',
      inv.category || '', inv.subcategory || '', inv.payment_source || '',
      inv.subtotal ?? 0, inv.tax_amount ?? 0, inv.total_amount ?? 0,
      inv.status || '',
    ]);

    // Build workbook
    const wb = XLSX.utils.book_new();
    const sheets: [string, string[], any[][]][] = [
      ['Project Info', ['Field', 'Value'], projectInfoRows],
      ['Budget Items', ['Category', 'Subcategory', 'Description', 'Quantity', 'Unit', 'Unit Cost', 'Total Cost', 'Notes'], budgetRows],
      ['Expenses', ['Date', 'Category', 'Subcategory', 'Payee', 'Description', 'Amount', 'Payment Source'], expenseRows],
      ['Income', ['Date', 'Source', 'Category', 'Description', 'Amount', 'Payment Source'], incomeRows],
      ['Tasks', ['Title', 'Phase', 'Status', 'Priority', 'Assignee', 'Due Date', 'Est. Hours'], taskRows],
      ['Payroll', ['Employee', 'Period', 'Period Type', 'Payment Date', 'Specialty', 'Contract', 'Gross', 'Insurance', 'Tax', 'Net', 'Final', 'Payment Source'], payrollRows],
      ['General Expenses', ['Date', 'Category', 'Description', 'Amount', 'Payee', 'Payment Source', 'Notes'], generalExpenseRows],
      ['General Income', ['Date', 'Category', 'Description', 'Net', 'VAT', 'Total', 'Payer', 'Payment Source', 'Invoice #'], generalIncomeRows],
      ['Construction Notes', ['Date', 'Weather', 'Technicians', 'Engineers', 'Subcontractors', 'Work Performed', 'Issues', 'Notes'], noteRows],
      ['Invoices', ['Invoice #', 'Vendor', 'Επωνυμία', 'ΑΦΜ', 'Date', 'Type', 'Category', 'Subcategory', 'Payment Source', 'Subtotal', 'Tax', 'Total', 'Status'], invoiceRows],
    ];

    for (const [name, headers, rows] of sheets) {
      const ws = XLSX.utils.aoa_to_sheet(sheet(headers, rows as any[][]) as any);
      XLSX.utils.book_append_sheet(wb, ws, name);
    }

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const fileBlob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const projectFolderId = await getProjectFolderId(project.name, accessToken);

    const safeName = (project.name || 'project').replace(/[^a-zA-Z0-9Α-Ωα-ωίϊΐόάέύϋΰήώ \-_]/g, '').trim() || 'project';
    const fileName = `${safeName}_data.xlsx`;
    const { driveFileId, driveViewLink } = await uploadFileToFolder(fileName, projectFolderId, fileBlob, accessToken);

    return Response.json({
      success: true,
      driveFileId,
      driveViewLink,
      counts: {
        expenses: expenses?.length || 0,
        incomes: incomes?.length || 0,
        tasks: tasks?.length || 0,
        budgetItems: budgetItems?.length || 0,
        payroll: payroll?.length || 0,
        generalExpenses: generalExpenses?.length || 0,
        generalIncomes: generalIncomes?.length || 0,
        notes: notes?.length || 0,
        invoices: invoices?.length || 0,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
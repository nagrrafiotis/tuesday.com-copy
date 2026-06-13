import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = await base44.asServiceRole.connectors.getConnection('googlesheets').then(c => c.accessToken);

    // Load all data in parallel
    const [projects, tasks, expenses, payroll, contacts] = await Promise.all([
      base44.entities.Project.list('-created_date'),
      base44.entities.Task.list('-created_date'),
      base44.entities.Expense.list('-date'),
      base44.entities.Payroll.list('-payment_date'),
      base44.entities.Contact.list('name'),
    ]);

    // --- Helper ---
    const getProjectName = (id) => projects.find(p => p.id === id)?.name || '';

    // --- Sheet 1: Projects Overview ---
    const projectsSheet = [
      ['Έργο', 'Κατάσταση', 'Τύπος', 'Διεύθυνση', 'Προϋπολογισμός (€)', 'Έναρξη', 'Ολοκλήρωση', 'Πρόοδος (%)', 'Εργατικά (€)', 'Υλικά (€)', 'Υπεργολάβοι (€)', 'Εξοπλισμός (€)', 'Γενικά Έξοδα (€)', 'Σύνολο Εξόδων (€)'],
      ...projects.map(p => {
        const projExpenses = expenses.filter(e => e.project_id === p.id);
        const byCategory = (cat) => projExpenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0);
        const total = projExpenses.reduce((s, e) => s + (e.amount || 0), 0);
        return [
          p.name || '',
          p.status || '',
          p.property_type || '',
          p.address || '',
          p.budget || 0,
          p.start_date || '',
          p.target_completion || '',
          p.progress || 0,
          byCategory('labor'),
          byCategory('materials'),
          byCategory('subcontractor'),
          byCategory('equipment'),
          byCategory('general_expenses'),
          total,
        ];
      }),
    ];

    // --- Sheet 2: Tasks per Project ---
    const tasksSheet = [
      ['Έργο', 'Τίτλος', 'Φάση', 'Κατάσταση', 'Προτεραιότητα', 'Ανατεθειμένος', 'Προθεσμία', 'Ώρες'],
      ...tasks.map(t => [
        getProjectName(t.project_id),
        t.title || '',
        t.phase || '',
        t.status || '',
        t.priority || '',
        t.assignee || '',
        t.due_date || '',
        t.estimated_hours || 0,
      ]),
    ];

    // --- Sheet 3: Expenses per Project ---
    const expensesSheet = [
      ['Έργο', 'Ημερομηνία', 'Κατηγορία', 'Υποκατηγορία', 'Δικαιούχος', 'Περιγραφή', 'Ποσό (€)', 'Πηγή Πληρωμής'],
      ...expenses.map(e => [
        getProjectName(e.project_id),
        e.date || '',
        e.category || '',
        e.subcategory || '',
        e.payee || '',
        e.description || '',
        e.amount || 0,
        e.payment_source || '',
      ]),
    ];

    // --- Sheet 4: Payroll / Team ---
    const payrollSheet = [
      ['Εργαζόμενος', 'ΑΦΜ', 'Ειδικότητα', 'Περίοδος', 'Τύπος', 'Ημ. Πληρωμής', 'Βασικός Μισθός', 'Μικτές Αποδοχές', 'Καθαρές Αποδοχές', 'Εργοδ. Εισφορές', 'Έργο'],
      ...payroll.map(pr => [
        pr.employee_name || '',
        pr.employee_afm || '',
        pr.specialty || '',
        pr.period || '',
        pr.period_type || '',
        pr.payment_date || '',
        pr.basic_salary || 0,
        pr.gross_salary || 0,
        pr.net_salary || 0,
        pr.employer_insurance_amount || 0,
        pr.project_name || getProjectName(pr.project_id),
      ]),
    ];

    // --- Sheet 5: Contacts / Suppliers ---
    const contactsSheet = [
      ['Όνομα', 'ΑΦΜ', 'Επωνυμία', 'Κατηγορία', 'ΔΟΥ', 'Διεύθυνση', 'Πόλη', 'Email', 'Τηλέφωνο', 'IBAN', 'Website', 'Σημειώσεις'],
      ...contacts.map(c => [
        c.name || '',
        c.afm || '',
        c.eponymia || c.company || '',
        c.category || '',
        c.doy || '',
        c.address || '',
        c.city || '',
        c.emails?.join(', ') || '',
        c.phones?.join(', ') || '',
        c.iban || '',
        c.website || '',
        c.notes || '',
      ]),
    ];

    // --- Get or create spreadsheet ---
    let spreadsheetId = user.team_sheets_id;

    const sheetNames = ['Projects Overview', 'Tasks', 'Expenses', 'Payroll & Team', 'Contacts'];

    if (!spreadsheetId) {
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: { title: 'PRVK - Projects & Team' },
          sheets: sheetNames.map(title => ({ properties: { title } })),
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.text();
        return Response.json({ error: `Failed to create spreadsheet: ${err}` }, { status: 500 });
      }
      const sheet = await createRes.json();
      spreadsheetId = sheet.spreadsheetId;
      await base44.asServiceRole.entities.User.update(user.id, { team_sheets_id: spreadsheetId });
    } else {
      // Ensure all tabs exist
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const meta = await metaRes.json();
      const existingTitles = (meta.sheets || []).map(s => s.properties.title);
      const missingSheets = sheetNames.filter(n => !existingTitles.includes(n));
      if (missingSheets.length > 0) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: missingSheets.map(title => ({ addSheet: { properties: { title } } })),
          }),
        });
      }
    }

    // --- Write all sheets ---
    const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Projects Overview!A1', values: projectsSheet },
          { range: 'Tasks!A1', values: tasksSheet },
          { range: 'Expenses!A1', values: expensesSheet },
          { range: 'Payroll & Team!A1', values: payrollSheet },
          { range: 'Contacts!A1', values: contactsSheet },
        ],
      }),
    });

    if (!batchRes.ok) {
      const err = await batchRes.text();
      return Response.json({ error: `Failed to update sheets: ${err}` }, { status: 500 });
    }

    return Response.json({
      success: true,
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      synced: {
        projects: projects.length,
        tasks: tasks.length,
        expenses: expenses.length,
        payroll: payroll.length,
        contacts: contacts.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
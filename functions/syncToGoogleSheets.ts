import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Google Sheets access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Fetch all data
    const [expenses, income, projects, tasks, contacts, subcategories, paymentSources] = await Promise.all([
      base44.asServiceRole.entities.Expense.list('-date'),
      base44.asServiceRole.entities.Income.list('-date'),
      base44.asServiceRole.entities.Project.list('-created_date'),
      base44.asServiceRole.entities.Task.list('-created_date'),
      base44.asServiceRole.entities.Contact.list('name'),
      base44.asServiceRole.entities.Subcategory.list('name'),
      base44.asServiceRole.entities.PaymentSource.list('name')
    ]);

    // Get or create spreadsheet ID from user data
    let spreadsheetId = user.google_sheets_backup_id;

    if (!spreadsheetId) {
      // Create new spreadsheet
      const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: 'PRVK Financial Backup'
          },
          sheets: [
            { properties: { title: 'Expenses' } },
            { properties: { title: 'Income' } },
            { properties: { title: 'Projects' } },
            { properties: { title: 'Tasks' } },
            { properties: { title: 'Contacts' } },
            { properties: { title: 'Subcategories' } },
            { properties: { title: 'Payment Sources' } }
          ]
        })
      });

      const spreadsheet = await createResponse.json();
      spreadsheetId = spreadsheet.spreadsheetId;

      // Save spreadsheet ID to user
      await base44.auth.updateMe({
        google_sheets_backup_id: spreadsheetId
      });
    }

    // Prepare data for each sheet
    const getProjectName = (projectId) => {
      return projects.find(p => p.id === projectId)?.name || '';
    };

    const expensesData = [
      ['Date', 'Project', 'Category', 'Subcategory', 'Payee', 'Description', 'Amount', 'Payment Source'],
      ...expenses.map(e => [
        e.date || '',
        getProjectName(e.project_id),
        e.category || '',
        e.subcategory || '',
        e.payee || '',
        e.description || '',
        e.amount || 0,
        e.payment_source || ''
      ])
    ];

    const incomeData = [
      ['Date', 'Project', 'Category', 'Source', 'Description', 'Amount', 'Payment Source'],
      ...income.map(i => [
        i.date || '',
        getProjectName(i.project_id),
        i.category || '',
        i.source || '',
        i.description || '',
        i.amount || 0,
        i.payment_source || ''
      ])
    ];

    const projectsData = [
      ['Name', 'Status', 'Property Type', 'Address', 'Budget', 'Start Date', 'Target Completion', 'Progress'],
      ...projects.map(p => [
        p.name || '',
        p.status || '',
        p.property_type || '',
        p.address || '',
        p.budget || 0,
        p.start_date || '',
        p.target_completion || '',
        p.progress || 0
      ])
    ];

    const tasksData = [
      ['Title', 'Project', 'Phase', 'Status', 'Priority', 'Assignee', 'Due Date'],
      ...tasks.map(t => [
        t.title || '',
        getProjectName(t.project_id),
        t.phase || '',
        t.status || '',
        t.priority || '',
        t.assignee || '',
        t.due_date || ''
      ])
    ];

    const contactsData = [
      ['Name', 'Category', 'Company', 'Position', 'Emails', 'Phones'],
      ...contacts.map(c => [
        c.name || '',
        c.category || '',
        c.company || '',
        c.position || '',
        c.emails?.join(', ') || '',
        c.phones?.join(', ') || ''
      ])
    ];

    const subcategoriesData = [
      ['Name'],
      ...subcategories.map(s => [s.name || ''])
    ];

    const paymentSourcesData = [
      ['Name'],
      ...paymentSources.map(ps => [ps.name || ''])
    ];

    // Update all sheets
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Expenses!A1', values: expensesData },
          { range: 'Income!A1', values: incomeData },
          { range: 'Projects!A1', values: projectsData },
          { range: 'Tasks!A1', values: tasksData },
          { range: 'Contacts!A1', values: contactsData },
          { range: 'Subcategories!A1', values: subcategoriesData },
          { range: 'Payment Sources!A1', values: paymentSourcesData }
        ]
      })
    });

    return Response.json({
      success: true,
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      synced: {
        expenses: expenses.length,
        income: income.length,
        projects: projects.length,
        tasks: tasks.length,
        contacts: contacts.length,
        subcategories: subcategories.length,
        paymentSources: paymentSources.length
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
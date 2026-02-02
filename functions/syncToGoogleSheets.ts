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
    const [expenses, income, projects, tasks, contacts, subcategories, paymentSources, notes, boards, items, dropdownLists, phases] = await Promise.all([
      base44.entities.Expense.list('-date'),
      base44.entities.Income.list('-date'),
      base44.entities.Project.list('-created_date'),
      base44.entities.Task.list('-created_date'),
      base44.entities.Contact.list('name'),
      base44.entities.Subcategory.list('name'),
      base44.entities.PaymentSource.list('name'),
      base44.entities.ConstructionNote.list('-date'),
      base44.entities.Board.list('-created_date'),
      base44.entities.Item.list('-created_date'),
      base44.entities.DropdownList.list('list_name'),
      base44.entities.ProjectPhase.list('order')
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
            { properties: { title: 'Construction Notes' } },
            { properties: { title: 'Boards' } },
            { properties: { title: 'Board Items' } },
            { properties: { title: 'Project Phases' } },
            { properties: { title: 'Subcategories' } },
            { properties: { title: 'Payment Sources' } },
            { properties: { title: 'Units' } },
            { properties: { title: 'Expense Categories' } },
            { properties: { title: 'Income Categories' } },
            { properties: { title: 'Property Types' } },
            { properties: { title: 'Project Status' } },
            { properties: { title: 'Task Status' } },
            { properties: { title: 'Task Phases' } },
            { properties: { title: 'Priority Levels' } },
            { properties: { title: 'Contact Categories' } }
          ]
        })
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        return Response.json({ error: `Failed to create spreadsheet: ${error}` }, { status: 500 });
      }

      const spreadsheet = await createResponse.json();
      spreadsheetId = spreadsheet.spreadsheetId;
      
      if (!spreadsheetId) {
        return Response.json({ error: 'Spreadsheet ID not returned from Google' }, { status: 500 });
      }

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

    const getPhaseName = (phaseId) => {
      return phases.find(p => p.id === phaseId)?.name || '';
    };

    const phasesData = [
      ['Name', 'Order', 'Color'],
      ...phases.map(p => [
        p.name || '',
        p.order || 0,
        p.color || ''
      ])
    ];

    const subcategoriesData = [
      ['Name', 'Phase'],
      ...subcategories.map(s => [
        s.name || '',
        getPhaseName(s.phase_id)
      ])
    ];

    const paymentSourcesData = [
      ['Name'],
      ...paymentSources.map(ps => [ps.name || ''])
    ];

    const notesData = [
      ['Date', 'Project', 'Weather', 'Technicians', 'Engineers', 'Subcontractors', 'Work Performed', 'Issues', 'Notes'],
      ...notes.map(n => [
        n.date || '',
        getProjectName(n.project_id),
        n.weather?.description || '',
        n.technicians?.join(', ') || '',
        n.engineers?.join(', ') || '',
        n.subcontractors?.join(', ') || '',
        n.work_performed || '',
        n.issues || '',
        n.notes || ''
      ])
    ];

    const boardsData = [
      ['Title', 'Description', 'Visibility', 'View Type', 'Color'],
      ...boards.map(b => [
        b.title || '',
        b.description || '',
        b.visibility || '',
        b.view_type || '',
        b.color || ''
      ])
    ];

    const itemsData = [
      ['Board ID', 'Group ID', 'Title', 'Priority', 'Order'],
      ...items.map(i => [
        i.board_id || '',
        i.group_id || '',
        i.title || '',
        i.priority || '',
        i.order_index || 0
      ])
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

    const getDropdownListData = (listName) => {
      const list = dropdownLists.find(l => l.list_name === listName);
      const options = list?.options || DEFAULT_LISTS[listName] || [];
      return [['Option'], ...options.map(opt => [opt])];
    };

    const unitsData = getDropdownListData('units');
    const expenseCategoriesData = getDropdownListData('expense_categories');
    const incomeCategoriesData = getDropdownListData('income_categories');
    const propertyTypesData = getDropdownListData('property_types');
    const projectStatusData = getDropdownListData('project_status');
    const taskStatusData = getDropdownListData('task_status');
    const taskPhasesData = getDropdownListData('task_phases');
    const priorityLevelsData = getDropdownListData('priority_levels');
    const contactCategoriesData = getDropdownListData('contact_categories');

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
          { range: 'Construction Notes!A1', values: notesData },
          { range: 'Boards!A1', values: boardsData },
          { range: 'Board Items!A1', values: itemsData },
          { range: 'Project Phases!A1', values: phasesData },
          { range: 'Subcategories!A1', values: subcategoriesData },
          { range: 'Payment Sources!A1', values: paymentSourcesData },
          { range: 'Units!A1', values: unitsData },
          { range: 'Expense Categories!A1', values: expenseCategoriesData },
          { range: 'Income Categories!A1', values: incomeCategoriesData },
          { range: 'Property Types!A1', values: propertyTypesData },
          { range: 'Project Status!A1', values: projectStatusData },
          { range: 'Task Status!A1', values: taskStatusData },
          { range: 'Task Phases!A1', values: taskPhasesData },
          { range: 'Priority Levels!A1', values: priorityLevelsData },
          { range: 'Contact Categories!A1', values: contactCategoriesData }
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
        notes: notes.length,
        boards: boards.length,
        items: items.length,
        phases: phases.length,
        subcategories: subcategories.length,
        paymentSources: paymentSources.length,
        dropdownLists: dropdownLists.length
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
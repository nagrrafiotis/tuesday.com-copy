import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const spreadsheetId = user.google_sheets_backup_id;
    if (!spreadsheetId) {
      return Response.json({ error: 'No Google Sheet connected' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Fetch all sheets data
    const rangeParams = [
      'ranges=Expenses!A2:H',
      'ranges=Income!A2:G',
      'ranges=Projects!A2:H',
      'ranges=Tasks!A2:G',
      'ranges=Contacts!A2:F',
      'ranges=Construction Notes!A2:I',
      'ranges=Subcategories!A2:A',
      'ranges=Payment Sources!A2:A',
      'ranges=Units!A2:A',
      'ranges=Expense Categories!A2:A',
      'ranges=Income Categories!A2:A',
      'ranges=Property Types!A2:A',
      'ranges=Project Status!A2:A',
      'ranges=Task Status!A2:A',
      'ranges=Task Phases!A2:A',
      'ranges=Priority Levels!A2:A',
      'ranges=Contact Categories!A2:A'
    ].join('&');
    
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangeParams}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ error: 'Failed to fetch from Google Sheets', details: errorText }, { status: 500 });
    }

    const data = await response.json();
    const [
      expensesRange, 
      incomeRange, 
      projectsRange, 
      tasksRange, 
      contactsRange, 
      notesRange,
      subcategoriesRange, 
      paymentSourcesRange,
      unitsRange,
      expenseCategoriesRange,
      incomeCategoriesRange,
      propertyTypesRange,
      projectStatusRange,
      taskStatusRange,
      taskPhasesRange,
      priorityLevelsRange,
      contactCategoriesRange
    ] = data.valueRanges;

    // Get existing data to match by name/attributes
    const [
      projects, 
      existingSubcategories, 
      existingPaymentSources, 
      existingExpenses, 
      existingIncome,
      existingTasks,
      existingContacts,
      existingNotes,
      existingDropdownLists
    ] = await Promise.all([
      base44.entities.Project.list(),
      base44.entities.Subcategory.list(),
      base44.entities.PaymentSource.list(),
      base44.entities.Expense.list(),
      base44.entities.Income.list(),
      base44.entities.Task.list(),
      base44.entities.Contact.list(),
      base44.entities.ConstructionNote.list(),
      base44.entities.DropdownList.list()
    ]);

    let imported = {
      expenses: 0,
      income: 0,
      projects: 0,
      tasks: 0,
      contacts: 0,
      notes: 0,
      subcategories: 0,
      paymentSources: 0,
      dropdownLists: 0
    };

    // Import Subcategories in batch
    const subcategoriesData = subcategoriesRange.values || [];
    const newSubcategories = [];
    for (const row of subcategoriesData) {
      const name = row[0]?.trim();
      if (name && !existingSubcategories.find(s => s.name === name)) {
        newSubcategories.push({ name });
      }
    }
    if (newSubcategories.length > 0) {
      await base44.entities.Subcategory.bulkCreate(newSubcategories);
      imported.subcategories = newSubcategories.length;
    }

    // Import Payment Sources in batch
    const paymentSourcesData = paymentSourcesRange.values || [];
    const newPaymentSources = [];
    for (const row of paymentSourcesData) {
      const name = row[0]?.trim();
      if (name && !existingPaymentSources.find(ps => ps.name === name)) {
        newPaymentSources.push({ name });
      }
    }
    if (newPaymentSources.length > 0) {
      await base44.entities.PaymentSource.bulkCreate(newPaymentSources);
      imported.paymentSources = newPaymentSources.length;
    }

    // Import Expenses in batch
    const expensesData = expensesRange.values || [];
    const newExpenses = [];
    for (const row of expensesData) {
      const [date, projectName, category, subcategory, payee, description, amount, paymentSource] = row;
      
      if (!date || !payee || !amount) continue;

      const project = projects.find(p => p.name === projectName);
      if (!project) continue;

      // Check if expense already exists (match by date, project, payee, amount)
      const exists = existingExpenses.find(e => 
        e.date === date && 
        e.project_id === project.id && 
        e.payee === payee && 
        e.amount === parseFloat(amount)
      );

      if (!exists) {
        newExpenses.push({
          date,
          project_id: project.id,
          category: category || 'general_expenses',
          subcategory: subcategory || '',
          payee,
          description: description || '',
          amount: parseFloat(amount) || 0,
          payment_source: paymentSource || ''
        });
      }
    }
    if (newExpenses.length > 0) {
      await base44.entities.Expense.bulkCreate(newExpenses);
      imported.expenses = newExpenses.length;
    }

    // Import Income in batch
    const incomeData = incomeRange.values || [];
    const newIncome = [];
    for (const row of incomeData) {
      const [date, projectName, category, source, description, amount, paymentSource] = row;
      
      if (!date || !source || !amount) continue;

      const project = projects.find(p => p.name === projectName);
      if (!project) continue;

      // Check if income already exists
      const exists = existingIncome.find(i => 
        i.date === date && 
        i.project_id === project.id && 
        i.source === source && 
        i.amount === parseFloat(amount)
      );

      if (!exists) {
        newIncome.push({
          date,
          project_id: project.id,
          category: category || 'other',
          source,
          description: description || '',
          amount: parseFloat(amount) || 0,
          payment_source: paymentSource || ''
        });
      }
    }
    if (newIncome.length > 0) {
      await base44.entities.Income.bulkCreate(newIncome);
      imported.income = newIncome.length;
    }

    // Import Projects in batch
    const projectsData = projectsRange.values || [];
    const newProjects = [];
    for (const row of projectsData) {
      const [name, status, propertyType, address, budget, startDate, targetCompletion, progress] = row;
      if (!name) continue;
      
      const exists = projects.find(p => p.name === name);
      if (!exists) {
        newProjects.push({
          name,
          status: status || 'planning',
          property_type: propertyType || 'residential',
          address: address || '',
          budget: parseFloat(budget) || 0,
          start_date: startDate || null,
          target_completion: targetCompletion || null,
          progress: parseFloat(progress) || 0
        });
      }
    }
    if (newProjects.length > 0) {
      await base44.entities.Project.bulkCreate(newProjects);
      imported.projects = newProjects.length;
    }

    // Import Tasks in batch
    const tasksData = tasksRange.values || [];
    const newTasks = [];
    for (const row of tasksData) {
      const [title, projectName, phase, status, priority, assignee, dueDate] = row;
      if (!title || !projectName) continue;
      
      const project = projects.find(p => p.name === projectName);
      if (!project) continue;
      
      const exists = existingTasks.find(t => t.title === title && t.project_id === project.id);
      if (!exists) {
        newTasks.push({
          title,
          project_id: project.id,
          phase: phase || null,
          status: status || 'todo',
          priority: priority || 'medium',
          assignee: assignee || null,
          due_date: dueDate || null
        });
      }
    }
    if (newTasks.length > 0) {
      await base44.entities.Task.bulkCreate(newTasks);
      imported.tasks = newTasks.length;
    }

    // Import Contacts in batch
    const contactsData = contactsRange.values || [];
    const newContacts = [];
    for (const row of contactsData) {
      const [name, category, company, position, emails, phones] = row;
      if (!name) continue;
      
      const exists = existingContacts.find(c => c.name === name);
      if (!exists) {
        newContacts.push({
          name,
          category: category || 'other',
          company: company || '',
          position: position || '',
          emails: emails ? emails.split(',').map(e => e.trim()) : [],
          phones: phones ? phones.split(',').map(p => p.trim()) : []
        });
      }
    }
    if (newContacts.length > 0) {
      await base44.entities.Contact.bulkCreate(newContacts);
      imported.contacts = newContacts.length;
    }

    // Import Construction Notes in batch
    const notesData = notesRange.values || [];
    const newNotes = [];
    for (const row of notesData) {
      const [date, projectName, weather, technicians, engineers, subcontractors, workPerformed, issues, notes] = row;
      if (!date || !projectName) continue;
      
      const project = projects.find(p => p.name === projectName);
      if (!project) continue;
      
      const exists = existingNotes.find(n => n.date === date && n.project_id === project.id);
      if (!exists) {
        newNotes.push({
          date,
          project_id: project.id,
          weather: weather ? { description: weather } : null,
          technicians: technicians ? technicians.split(',').map(t => t.trim()) : [],
          engineers: engineers ? engineers.split(',').map(e => e.trim()) : [],
          subcontractors: subcontractors ? subcontractors.split(',').map(s => s.trim()) : [],
          work_performed: workPerformed || '',
          issues: issues || '',
          notes: notes || ''
        });
      }
    }
    if (newNotes.length > 0) {
      await base44.entities.ConstructionNote.bulkCreate(newNotes);
      imported.notes = newNotes.length;
    }

    // Import Dropdown Lists
    const dropdownListsToImport = [
      { name: 'units', range: unitsRange },
      { name: 'expense_categories', range: expenseCategoriesRange },
      { name: 'income_categories', range: incomeCategoriesRange },
      { name: 'property_types', range: propertyTypesRange },
      { name: 'project_status', range: projectStatusRange },
      { name: 'task_status', range: taskStatusRange },
      { name: 'task_phases', range: taskPhasesRange },
      { name: 'priority_levels', range: priorityLevelsRange },
      { name: 'contact_categories', range: contactCategoriesRange }
    ];

    for (const { name, range } of dropdownListsToImport) {
      const values = range.values || [];
      const options = values.map(row => row[0]).filter(Boolean);
      
      if (options.length > 0) {
        const existingList = existingDropdownLists.find(l => l.list_name === name);
        if (existingList) {
          const newOptions = [...new Set([...existingList.options, ...options])];
          if (newOptions.length !== existingList.options.length) {
            await base44.entities.DropdownList.update(existingList.id, { options: newOptions });
            imported.dropdownLists++;
          }
        } else {
          await base44.entities.DropdownList.create({ list_name: name, options });
          imported.dropdownLists++;
        }
      }
    }

    return Response.json({
      success: true,
      imported
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
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
      'ranges=Subcategories!A2:A',
      'ranges=Payment Sources!A2:A'
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
    const [expensesRange, incomeRange, subcategoriesRange, paymentSourcesRange] = data.valueRanges;

    // Get existing data to match by name/attributes
    const [projects, existingSubcategories, existingPaymentSources, existingExpenses, existingIncome] = await Promise.all([
      base44.entities.Project.list(),
      base44.entities.Subcategory.list(),
      base44.entities.PaymentSource.list(),
      base44.entities.Expense.list(),
      base44.entities.Income.list()
    ]);

    let imported = {
      expenses: 0,
      income: 0,
      subcategories: 0,
      paymentSources: 0
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

    return Response.json({
      success: true,
      imported
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
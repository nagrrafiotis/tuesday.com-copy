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
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?` +
      new URLSearchParams({
        ranges: ['Expenses!A2:H', 'Income!A2:G', 'Subcategories!A2:A', 'Payment Sources!A2:A']
      }),
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch from Google Sheets' }, { status: 500 });
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

    // Import Subcategories
    const subcategoriesData = subcategoriesRange.values || [];
    for (const row of subcategoriesData) {
      const name = row[0]?.trim();
      if (name && !existingSubcategories.find(s => s.name === name)) {
        await base44.entities.Subcategory.create({ name });
        imported.subcategories++;
      }
    }

    // Import Payment Sources
    const paymentSourcesData = paymentSourcesRange.values || [];
    for (const row of paymentSourcesData) {
      const name = row[0]?.trim();
      if (name && !existingPaymentSources.find(ps => ps.name === name)) {
        await base44.entities.PaymentSource.create({ name });
        imported.paymentSources++;
      }
    }

    // Import Expenses
    const expensesData = expensesRange.values || [];
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
        await base44.entities.Expense.create({
          date,
          project_id: project.id,
          category: category || 'general_expenses',
          subcategory: subcategory || '',
          payee,
          description: description || '',
          amount: parseFloat(amount) || 0,
          payment_source: paymentSource || ''
        });
        imported.expenses++;
      }
    }

    // Import Income
    const incomeData = incomeRange.values || [];
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
        await base44.entities.Income.create({
          date,
          project_id: project.id,
          category: category || 'other',
          source,
          description: description || '',
          amount: parseFloat(amount) || 0,
          payment_source: paymentSource || ''
        });
        imported.income++;
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
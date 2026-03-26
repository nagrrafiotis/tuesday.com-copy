import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spreadsheetId } = await req.json();
    
    if (!spreadsheetId) {
      return Response.json({ error: 'Spreadsheet ID is required' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Fetch expenses from the sheet
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Expenses!A2:H`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ 
        error: 'Failed to access Google Sheet. Please check the URL and ensure you have access to the file.',
        details: errorText 
      }, { status: 500 });
    }

    const data = await response.json();
    const expensesData = data.values || [];

    if (expensesData.length === 0) {
      return Response.json({ error: 'No expense data found in sheet' }, { status: 400 });
    }

    // Get existing data
    const [projects, existingExpenses] = await Promise.all([
      base44.entities.Project.list(),
      base44.entities.Expense.list()
    ]);

    // Import expenses in batch
    const newExpenses = [];
    for (const row of expensesData) {
      const [date, projectName, category, subcategory, payee, description, amount, paymentSource] = row;
      
      if (!date || !payee || !amount) continue;

      const project = projects.find(p => p.name === projectName);
      if (!project) continue;

      // Check if expense already exists
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
    }

    return Response.json({
      success: true,
      imported: newExpenses.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
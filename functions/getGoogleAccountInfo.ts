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

    // Fetch user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!userInfoResponse.ok) {
      return Response.json({ connected: false });
    }

    const userInfo = await userInfoResponse.json();

    return Response.json({
      connected: true,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture
    });
  } catch (error) {
    return Response.json({ connected: false, error: error.message });
  }
});
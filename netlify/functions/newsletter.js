const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://rswhedtgkfdbhsicllrj.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { email, source } = JSON.parse(event.body || '{}');

    if (!email || !email.includes('@') || !email.includes('.')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'A valid email address is required' })
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Upsert — if email already exists, update subscribed_at (no duplicate error)
    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert(
        [{
          email: normalizedEmail,
          source: source || 'website',
          subscribed_at: new Date().toISOString(),
          active: true
        }],
        { onConflict: 'email' }
      );

    if (error) {
      console.error('Newsletter insert error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to save subscription' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Subscribed successfully' })
    };
  } catch (err) {
    console.error('Newsletter function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

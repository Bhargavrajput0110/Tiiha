const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://rswhedtgkfdbhsicllrj.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { query, order_id } = event.queryStringParameters;
    if (!query || !order_id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Order ID and Email/Phone are required' }) };
    }

    const { data, error } = await supabase.from('ORDERS')
        .select('*')
        .eq('id', order_id.trim())
        .limit(1)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
             // No rows returned
             return { statusCode: 200, body: JSON.stringify([]) };
        }
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
    
    // JS-side verification to prevent PostgREST string injection in .or()
    const safeQuery = query.trim().toLowerCase();
    const emailMatch = data.customer_email && data.customer_email.toLowerCase() === safeQuery;
    const phoneMatch = data.customer_phone && data.customer_phone === safeQuery;

    if (!emailMatch && !phoneMatch) {
         // Return empty array to simulate 'not found' without revealing existence
         return { statusCode: 200, body: JSON.stringify([]) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify([data])
    };
  } catch (err) {
    console.error('Track order error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

const crypto = require('crypto');

exports.handler = async (event, context) => {
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
    const { action, amount, currency, receipt, razorpay_order_id, razorpay_payment_id, razorpay_signature } = JSON.parse(event.body || '{}');

    const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID;
    const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

    if (!RZP_KEY_ID || !RZP_KEY_SECRET) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Razorpay credentials not configured in environment variables.' })
      };
    }

    // ── CREATE ORDER ──────────────────────────────────────────────────────────
    if (action === 'create') {
      const auth = Buffer.from(`${RZP_KEY_ID}:${RZP_KEY_SECRET}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Math.round(amount), // in paise
          currency: currency || 'INR',
          receipt: receipt || `rcpt_${Date.now()}`,
          payment_capture: 1
        })
      });

      const data = await response.json();
      if (data.id) {
        return { statusCode: 200, headers, body: JSON.stringify({ order_id: data.id, amount: data.amount, currency: data.currency }) };
      } else {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Failed to create Razorpay order', details: data }) };
      }
    }

    // ── VERIFY PAYMENT ────────────────────────────────────────────────────────
    if (action === 'verify') {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing verification parameters' }) };
      }
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto.createHmac('sha256', RZP_KEY_SECRET).update(body).digest('hex');

      if (expectedSignature === razorpay_signature) {
        return { statusCode: 200, headers, body: JSON.stringify({ verified: true }) };
      } else {
        return { statusCode: 400, headers, body: JSON.stringify({ verified: false, error: 'Signature mismatch' }) };
      }
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action. Use "create" or "verify".' }) };

  } catch (err) {
    console.error('Razorpay function error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', message: err.message }) };
  }
};

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://rswhedtgkfdbhsicllrj.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Fallback catalog prices if database query is unavailable
const CATALOG_PRICES = {
  'TII-506': 3500,
  'TII-507': 5400,
  'TII-508': 3500,
  'TII-509': 3000,
  'TII-502': 2250,
  'TII-05': 3500,
  'TII-06': 3500,
  'TII-501': 2250,
  'TII-503': 1500,
  'TII-505': 1500,
  'TII-04': 2100,
  'TII-01': 2500,
  'TII-02': 1500,
  'TII-03': 1999,
  'TII-504': 2499
};

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
    const { action, amount, currency, receipt, items, razorpay_order_id, razorpay_payment_id, razorpay_signature } = JSON.parse(event.body || '{}');

    const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID;
    const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

    if (!RZP_KEY_ID || !RZP_KEY_SECRET) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Razorpay credentials not configured in environment variables.' })
      };
    }

    // ── CREATE ORDER (WITH SERVER-SIDE PRICE VALIDATION) ──────────────────────
    if (action === 'create') {
      let finalAmountPaise = 0;

      if (Array.isArray(items) && items.length > 0) {
        let calculatedTotal = 0;
        const itemIds = items.map(i => i.id).filter(Boolean);

        let dbProducts = [];
        try {
          const { data } = await supabase.from('products').select('id, price').in('id', itemIds);
          dbProducts = data || [];
        } catch (dbErr) {
          console.warn('DB lookup fallback to catalog prices:', dbErr.message);
        }

        const priceMap = {};
        dbProducts.forEach(p => { priceMap[p.id] = Number(p.price); });

        for (const item of items) {
          const unitPrice = priceMap[item.id] ?? CATALOG_PRICES[item.id] ?? Number(item.price) ?? 0;
          const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
          calculatedTotal += unitPrice * qty;
        }

        const serverCalculatedPaise = Math.round(calculatedTotal * 100);

        // Security check: If client passed an amount, reject any attempt to underpay
        if (amount && Number(amount) < serverCalculatedPaise) {
          console.warn(`Price tampering blocked! Client sent ${amount} paise, server calculated ${serverCalculatedPaise} paise`);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Price mismatch detected. Order creation rejected.' })
          };
        }

        finalAmountPaise = serverCalculatedPaise;
      } else {
        finalAmountPaise = Math.round(Number(amount) || 0);
      }

      if (finalAmountPaise <= 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid order amount.' })
        };
      }

      const auth = Buffer.from(`${RZP_KEY_ID}:${RZP_KEY_SECRET}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: finalAmountPaise,
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

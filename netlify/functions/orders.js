const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://rswhedtgkfdbhsicllrj.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

function generateOrderId() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `ORD-${yyyy}${mm}${dd}-${hh}${min}${ss}-${Math.floor(Math.random() * 1000)}`;
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body);
    const { 
      customer_name, customer_email, customer_phone, 
      shipping_address, city, state, country, pincode, 
      items, total_amount, shipping_amount, discount_amount, 
      payment_id, razorpay_signature, razorpay_order_id 
    } = body;

    if (!customer_name || !customer_email || !customer_phone || !shipping_address || !city || !state || !pincode || !items || !total_amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Verify Razorpay signature — BOTH payment_id AND razorpay_signature required
    if (payment_id || razorpay_signature) {
      // If either is present, BOTH must be present
      if (!payment_id || !razorpay_signature) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Both payment_id and razorpay_signature are required for payment verification' })
        };
      }
      // Verify signature using correct Razorpay format: order_id|payment_id
      if (!RAZORPAY_KEY_SECRET) {
        console.error('RAZORPAY_KEY_SECRET not configured');
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Payment verification not configured on server' })
        };
      }
      if (!razorpay_order_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'razorpay_order_id is required for signature verification' })
        };
      }
      const payload = `${razorpay_order_id}|${payment_id}`;
      const expectedSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(payload).digest('hex');
      if (expectedSignature !== razorpay_signature) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid payment signature — payment not verified' })
        };
      }
    } else if (!process.env.DISABLE_PAYMENT) {
      // No payment info provided at all
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Payment verification required — payment_id, razorpay_order_id, and razorpay_signature must be provided' })
      };
    }

    const orderId = generateOrderId();

    const orderData = {
      id: orderId,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      city,
      state,
      country: country || 'India',
      pincode,
      items: Array.isArray(items) ? items : JSON.stringify(items),
      total_amount: Number(total_amount),
      shipping_amount: Number(shipping_amount) || 0,
      discount_amount: Number(discount_amount) || 0,
      payment_method: 'razorpay',
      payment_status: 'paid',
      status: 'pending',
      payment_id: payment_id || null,
      razorpay_order_id: razorpay_order_id || null,
      notes: body.notes || null
    };

    const { error } = await supabase.from('ORDERS').insert([orderData]);

    if (error) {
      console.error('Order insert error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create order', details: error.message })
      };
    }

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, order_id: orderId })
    };
  } catch (err) {
    console.error('Create order error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

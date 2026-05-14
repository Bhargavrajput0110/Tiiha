require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Serve static frontend files
const path = require('path');
app.use(express.static(path.join(__dirname, '')));

// Supabase client (service role for admin operations)
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://rswhedtgkfdbhsicllrj.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Securely store these in your hosting provider (Vercel/Netlify/Render) environment variables
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_YOUR_KEY_HERE';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', shiprocket: SHIPROCKET_EMAIL ? 'configured' : 'missing credentials' });
});

app.post('/api/create-shipment', async (req, res) => {
    try {
        if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
            return res.status(500).json({ error: 'Shiprocket credentials not configured' });
        }
        
        const { orderData, cart, total } = req.body;

        // 1. Authenticate with Shiprocket
        const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: SHIPROCKET_EMAIL, password: SHIPROCKET_PASSWORD })
        });
        const authData = await authRes.json();

        if (!authData.token) {
            return res.status(401).json({ error: 'Shiprocket authentication failed' });
        }

        // 2. Format Order Items
        const orderItems = cart.map(item => ({
            name: item.name,
            sku: item.id || 'SKU-UNKNOWN',
            units: 1,
            selling_price: item.price
        }));

        // Format Date
        const d = new Date();
        const orderDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

        // 3. Create Payload
        const payload = {
            order_id: `TIIHA-${Date.now()}`,
            order_date: orderDateStr,
            pickup_location: "Primary", // Must match exactly with Shiprocket dashboard pickup location name
            billing_customer_name: orderData.customer_name,
            billing_address: orderData.address,
            billing_city: orderData.city,
            billing_pincode: orderData.zip,
            billing_state: orderData.state,
            billing_country: "India",
            billing_email: orderData.customer_email,
            billing_phone: orderData.phone,
            shipping_is_billing: true,
            order_items: orderItems,
            payment_method: "Prepaid",
            sub_total: total,
            length: 30, breadth: 25, height: 5, weight: 0.5
        };

        // 4. Create Adhoc Shipment
        const shipRes = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authData.token}`
            },
            body: JSON.stringify(payload)
        });
        const shipData = await shipRes.json();

        if (shipData.status_code === 1) {
            res.status(200).json({ success: true, shipment_id: shipData.shipment_id });
        } else {
            console.error("Shiprocket error:", shipData);
            res.status(400).json({ error: 'Shiprocket rejected payload', details: shipData });
        }
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3000;

// Helper: Generate order ID
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', shiprocket: SHIPROCKET_EMAIL ? 'configured' : 'missing credentials' });
});

// Create order (called after Razorpay payment success)
app.post('/api/orders', async (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, shipping_address, city, state, country, pincode, items, total_amount, shipping_amount, discount_amount, payment_id, razorpay_signature } = req.body;

    if (!customer_name || !customer_email || !customer_phone || !shipping_address || !city || !state || !pincode || !items || !total_amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify Razorpay signature if provided
    if (payment_id && razorpay_signature && RAZORPAY_KEY_SECRET) {
      const crypto = require('crypto');
      const payload = payment_id + '|' + total_amount;
      const expectedSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(payload).digest('hex');
      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ error: 'Invalid payment signature' });
      }
    } else if (!payment_id && !process.env.DISABLE_PAYMENT) {
      return res.status(400).json({ error: 'Payment verification required' });
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
      notes: req.body.notes || null
    };

    const { error } = await supabase.from('orders').insert([orderData]);

    if (error) {
      console.error('Order insert error:', error);
      return res.status(500).json({ error: 'Failed to create order', details: error.message });
    }

    res.status(201).json({ success: true, order_id: orderId });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Razorpay Order Creation and Verification
const Razorpay = require('razorpay');

let razorpay;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  });
}

app.post('/api/razorpay-order', async (req, res) => {
  try {
    const { action, amount, currency, receipt, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || RAZORPAY_KEY_ID === 'rzp_live_YOUR_KEY_HERE') {
      return res.status(200).json({ error: 'Razorpay keys not configured - running in fallback mode' });
    }

    if (action === 'create') {
      const options = {
        amount: amount,
        currency: currency || 'INR',
        receipt: receipt,
      };
      const order = await razorpay.orders.create(options);
      return res.status(200).json({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency
      });
    }

    if (action === 'verify') {
      const crypto = require('crypto');
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');
      
      const isAuthentic = expectedSignature === razorpay_signature;
      return res.status(200).json({ verified: isAuthentic });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('Razorpay Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fallback for SPA routing if needed
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


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

// ⚠️ LOCALHOST TEST ONLY — visit http://localhost:3000/test-email to send a real test email
app.get('/test-email', async (req, res) => {
  const nodemailer = require('nodemailer');
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'tiha.clothing@gmail.com';
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.send('❌ SMTP not configured in .env');
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  try {
    await transporter.sendMail({
      from: `"TIIHA" <tiha.clothing@gmail.com>`,
      to: ADMIN_EMAIL,
      subject: '🧪 Tiiha Test Email — Server Working!',
      html: `<div style="font-family:sans-serif;padding:32px;border:2px solid #A6957A;max-width:500px">
        <h2 style="color:#A6957A">✅ Email System Working!</h2>
        <p>This is a test email from your localhost server.</p>
        <p>Sent to: <strong>${ADMIN_EMAIL}</strong></p>
        <p>Time: <strong>${new Date().toLocaleString('en-IN')}</strong></p>
        <p style="color:#888;font-size:12px">TIIHA Order Notification System — Brevo SMTP</p>
      </div>`
    });
    res.send(`✅ Test email sent to <strong>${ADMIN_EMAIL}</strong> — check your inbox (and spam folder)!`);
  } catch(err) {
    console.error('Test email error:', err);
    res.send(`❌ Email failed: ${err.message}`);
  }
});

// Configuration endpoint
app.get('/api/get-config', (req, res) => {
  res.json({
    razorpay_key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_fallback_id',
    ga_measurement_id: process.env.GA_MEASUREMENT_ID || process.env.GOOGLE_ANALYTICS_ID || ''
  });
});


// /api/create-shipment endpoint has been removed to enforce backend-verified shipments.
// Shiprocket creation now securely happens inside /api/orders after successful payment.


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

// Create order (called after Razorpay payment success)
app.post('/api/orders', async (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, shipping_address, city, state, country, pincode, items, total_amount, shipping_amount, discount_amount, payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!customer_name || !customer_email || !customer_phone || !shipping_address || !city || !state || !pincode || !items || !total_amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify Razorpay signature if provided
    if (payment_id && razorpay_order_id && razorpay_signature && RAZORPAY_KEY_SECRET) {
      const crypto = require('crypto');
      const payload = razorpay_order_id + '|' + payment_id;
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

    // Automatically create Shiprocket Shipment if paid and credentials exist
    if (payment_id && SHIPROCKET_EMAIL && SHIPROCKET_PASSWORD) {
        try {
            const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: SHIPROCKET_EMAIL, password: SHIPROCKET_PASSWORD })
            });
            const authData = await authRes.json();
            
            if (authData.token) {
                const parsedItems = Array.isArray(items) ? items : JSON.parse(items);
                const orderItems = parsedItems.map(item => ({
                    name: item.name,
                    sku: item.id || 'SKU-UNKNOWN',
                    units: item.quantity || 1,
                    selling_price: item.price
                }));
                const d = new Date();
                const orderDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                
                const payload = {
                    order_id: orderId,
                    order_date: orderDateStr,
                    pickup_location: "Primary",
                    billing_customer_name: customer_name,
                    billing_address: shipping_address,
                    billing_city: city,
                    billing_pincode: pincode,
                    billing_state: state,
                    billing_country: country || 'India',
                    billing_email: customer_email,
                    billing_phone: customer_phone,
                    shipping_is_billing: true,
                    order_items: orderItems,
                    payment_method: "Prepaid",
                    sub_total: total_amount,
                    length: 30, breadth: 25, height: 5, weight: 0.5
                };
                
                const shipRes = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authData.token}` },
                    body: JSON.stringify(payload)
                });
                const shipData = await shipRes.json();
                
                if (shipData.status_code === 1) {
                    await supabase.from('orders').update({ shipment_id: String(shipData.shipment_id) }).eq('id', orderId);
                } else {
                    console.error("Shiprocket error in order creation:", shipData);
                }
            }
        } catch (e) { console.error("Shiprocket integration error:", e); }
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

// ─── Order Tracking Endpoint (Secure) ─────────────────────────────────────────
app.get('/api/track-order', async (req, res) => {
  try {
    const { query, order_id } = req.query; // query is email or phone
    if (!query || !order_id) return res.status(400).json({ error: 'Query and order_id parameters required' });
    
    // We use service role key so this bypasses RLS, but we validate ownership with query + order_id
    const { data, error } = await supabase.from('ORDERS')
        .select('*')
        .eq('id', order_id.trim())
        .limit(1)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
             return res.json([]);
        }
        return res.status(500).json({ error: error.message });
    }

    const safeQuery = query.trim().toLowerCase();
    const emailMatch = data.customer_email && data.customer_email.toLowerCase() === safeQuery;
    const phoneMatch = data.customer_phone && data.customer_phone === safeQuery;

    if (!emailMatch && !phoneMatch) {
         return res.json([]);
    }

    res.json([data]); 
  } catch (err) {
    console.error('Order tracking error:', err.message);
    res.status(404).json({ error: 'Order not found or unauthorized' });
  }
});

// ─── Products API (read-only, used by the storefront) ────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Products fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Product fetch error:', err);
    res.status(404).json({ error: 'Product not found' });
  }
});

// ─── Email Confirmation Endpoint ─────────────────────────────────────────────
// Email Confirmation Endpoint
const nodemailer = require('nodemailer');

// Helper to send admin WhatsApp notifications using Meta Cloud API template messages
async function sendWhatsAppNotification({ customer_name, customer_phone, total_amount, shipping_address, order_items }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipient = process.env.ADMIN_PHONE;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'tiiha_new_order';

  if (!token || !phoneId || !recipient) {
    console.log('WhatsApp credentials or recipient missing, skipping WhatsApp notification.');
    return { success: false, reason: 'Credentials missing' };
  }

  // Format parameters: items list like "Product A (M), Product B (L)"
  const itemsSummary = order_items.map(i => `${i.name} (${i.size || 'N/A'})`).join(', ');

  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "template",
          template: {
            name: templateName,
            language: {
              code: "en"
            },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: customer_name || 'N/A' },
                  { type: "text", text: itemsSummary || 'N/A' },
                  { type: "text", text: `₹${Number(total_amount).toLocaleString('en-IN')}` },
                  { type: "text", text: shipping_address || 'N/A' },
                  { type: "text", text: customer_phone || 'N/A' }
                ]
              }
            ]
          }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('WhatsApp API Error Response:', data);
      return { success: false, error: data };
    }

    console.log('WhatsApp notification sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('WhatsApp fetch error:', error);
    return { success: false, error: error.message };
  }
}

app.post('/api/send-confirmation', async (req, res) => {
  try {
    const { customer_name, customer_email, customer_phone, shipping_address, order_items, total_amount } = req.body;

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'tiha.clothing@gmail.com';

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(200).json({ message: 'SMTP not configured, skipping email.' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const itemsTableHtml = order_items.map(i =>
      `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${i.name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${i.size || 'N/A'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">₹${Number(i.price).toLocaleString('en-IN')}</td>
      </tr>`
    ).join('');

    // 1. Send Customer email confirmation
    const customerMailOptions = {
      from: `"TIIHA" <tiha.clothing@gmail.com>`,
      to: customer_email,
      subject: 'Order Confirmed — TIIHA ✓',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;border:1px solid #eee;">
          <h1 style="font-family:Georgia,serif;color:#A6957A;letter-spacing:0.1em;">TIIHA</h1>
          <h2 style="color:#222;">Thank you, ${customer_name}! 🎉</h2>
          <p style="color:#555;">Your order has been placed successfully. We'll notify you once it ships.</p>
          <hr style="border:0;border-top:1px solid #eee;margin:20px 0;">
          <h3 style="color:#222;">Order Summary</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f9f9f9;">
              <th style="padding:8px;text-align:left;font-size:11px;color:#999;">ITEM</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#999;">SIZE</th>
              <th style="padding:8px;text-align:right;font-size:11px;color:#999;">PRICE</th>
            </tr></thead>
            <tbody>${itemsTableHtml}</tbody>
          </table>
          <p style="text-align:right;font-size:18px;font-family:Georgia,serif;color:#A6957A;margin-top:12px;"><strong>Total: ₹${Number(total_amount).toLocaleString('en-IN')}</strong></p>
          <hr style="border:0;border-top:1px solid #eee;margin:20px 0;">
          <p style="color:#888;font-size:12px;">Estimated delivery: 5–7 business days · Free shipping across India</p>
          <p style="color:#888;">Warm regards,<br><strong style="color:#A6957A;">TIIHA Team</strong></p>
        </div>
      `
    };

    await transporter.sendMail(customerMailOptions);

    // 2. Send Admin notification email
    const adminMailOptions = {
      from: `"TIIHA" <tiha.clothing@gmail.com>`,
      to: ADMIN_EMAIL,
      subject: `🛍️ New Order — ₹${Number(total_amount).toLocaleString('en-IN')} from ${customer_name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;border:2px solid #A6957A;">
          <h2 style="color:#A6957A;">🛍️ New Order Received!</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <tr><td style="padding:6px;color:#999;font-size:12px;">Customer Name</td><td style="padding:6px;font-weight:bold;">${customer_name}</td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:6px;color:#999;font-size:12px;">Email</td><td style="padding:6px;">${customer_email}</td></tr>
            <tr><td style="padding:6px;color:#999;font-size:12px;">Phone</td><td style="padding:6px;">${customer_phone || 'N/A'}</td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:6px;color:#999;font-size:12px;">Address</td><td style="padding:6px;">${shipping_address || 'N/A'}</td></tr>
            <tr><td style="padding:6px;color:#999;font-size:12px;">Total Paid</td><td style="padding:6px;font-size:20px;font-weight:bold;color:#A6957A;">₹${Number(total_amount).toLocaleString('en-IN')}</td></tr>
          </table>
          <h3 style="color:#222;">Items Ordered:</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f9f9f9;">
              <th style="padding:8px;text-align:left;font-size:11px;color:#999;">ITEM</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#999;">SIZE</th>
              <th style="padding:8px;text-align:right;font-size:11px;color:#999;">PRICE</th>
            </tr></thead>
            <tbody>${itemsTableHtml}</tbody>
          </table>
          <p style="margin-top:20px;color:#888;font-size:12px;">Login to your admin panel to manage this order.</p>
        </div>
      `
    };

    await transporter.sendMail(adminMailOptions).catch(e => console.error('Admin email error:', e));

    // 3. Send WhatsApp notification to Admin/Client
    await sendWhatsAppNotification({ customer_name, customer_phone, total_amount, shipping_address, order_items })
      .catch(e => console.error('WhatsApp error:', e));

    res.status(200).json({ success: true, message: 'Notification emails and WhatsApp sent.' });
  } catch (err) {
    console.error('Email/Notification error:', err);
    res.status(500).json({ error: 'Failed to send confirmation', details: err.message });
  }
});

// Fallback for SPA routing if needed
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Only listen when running locally (not on Vercel)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;

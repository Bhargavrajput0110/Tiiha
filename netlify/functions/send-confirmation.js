const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'tilokanihari4@gmail.com';

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

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { customer_name, customer_email, customer_phone, order_items, total_amount, shipping_address } = JSON.parse(event.body);

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return { 
        statusCode: 200, 
        body: JSON.stringify({ message: 'SMTP not configured, skipping email.' }) 
      };
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

    const itemsHtml = order_items.map(i =>
      `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${i.name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${i.size || 'N/A'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">₹${Number(i.price).toLocaleString('en-IN')}</td>
      </tr>`
    ).join('');

    // Sender address (must be a valid email, not Brevo SMTP login ID)
    const senderEmail = process.env.SENDER_EMAIL || 'tiha.clothing@gmail.com';

    // 1. Customer confirmation email
    await transporter.sendMail({
      from: `"TIIHA" <${senderEmail}>`,
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
            <tbody>${itemsHtml}</tbody>
          </table>
          <p style="text-align:right;font-size:18px;font-family:Georgia,serif;color:#A6957A;margin-top:12px;"><strong>Total: ₹${Number(total_amount).toLocaleString('en-IN')}</strong></p>
          <hr style="border:0;border-top:1px solid #eee;margin:20px 0;">
          <p style="color:#888;font-size:12px;">Estimated delivery: 5–7 business days · Free shipping across India</p>
          <p style="color:#888;">Warm regards,<br><strong style="color:#A6957A;">TIIHA Team</strong></p>
        </div>
      `
    });

    // 2. Admin notification to client
    await transporter.sendMail({
      from: `"TIIHA Orders" <${senderEmail}>`,
      to: ADMIN_EMAIL,
      subject: `🛍️ NEW ORDER — ₹${Number(total_amount).toLocaleString('en-IN')} from ${customer_name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;border:2px solid #A6957A;background:#ffffff;">
          <h2 style="color:#A6957A;margin-top:0;">🛍️ New Order Received!</h2>
          <p style="color:#555;font-size:14px;">A new prepaid order has been placed on Tiiha.</p>

          <div style="background:#f4f1ea;padding:16px;border-radius:8px;margin:20px 0;">
            <h3 style="margin:0 0 10px 0;color:#A6957A;font-size:14px;text-transform:uppercase;letter-spacing:1px;">📦 Shipping Details (Copy-Paste Ready)</h3>
            <p style="margin:4px 0;font-size:15px;color:#222;"><strong>Name:</strong> ${customer_name}</p>
            <p style="margin:4px 0;font-size:15px;color:#222;"><strong>Phone:</strong> <a href="tel:${customer_phone}" style="color:#A6957A;">${customer_phone || 'N/A'}</a></p>
            <p style="margin:4px 0;font-size:15px;color:#222;"><strong>Email:</strong> ${customer_email}</p>
            <p style="margin:8px 0 0 0;font-size:15px;color:#222;line-height:1.4;"><strong>Address:</strong><br>${shipping_address || 'N/A'}</p>
          </div>

          <h3 style="color:#222;margin-top:24px;">Items Ordered:</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <thead><tr style="background:#f9f9f9;">
              <th style="padding:8px;text-align:left;font-size:11px;color:#999;">ITEM</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#999;">SIZE</th>
              <th style="padding:8px;text-align:right;font-size:11px;color:#999;">PRICE</th>
            </tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          
          <div style="text-align:right;font-size:18px;color:#A6957A;margin-top:12px;">
            <strong>Total Amount Paid: ₹${Number(total_amount).toLocaleString('en-IN')}</strong>
          </div>

          <hr style="border:0;border-top:1px solid #eee;margin:20px 0;">
          <p style="color:#888;font-size:12px;margin-bottom:0;">View and manage this order anytime in your <a href="https://tiiha.in/admin.html" style="color:#A6957A;">Tiiha Admin Dashboard</a>.</p>
        </div>
      `
    });

    // 3. Send WhatsApp notification to Admin/Client
    await sendWhatsAppNotification({ customer_name, customer_phone, total_amount, shipping_address, order_items })
      .catch(e => console.error('WhatsApp error:', e));

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Emails and WhatsApp notification sent.' })
    };

  } catch (err) {
    console.error('Email error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send notification', details: err.message })
    };
  }
};

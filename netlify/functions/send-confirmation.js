const nodemailer = require('nodemailer');

const ADMIN_EMAIL = 'tilokanihari4@gmail.com';

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

    // 1. Customer confirmation email
    await transporter.sendMail({
      from: `"TIIHA" <${process.env.SMTP_USER}>`,
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
      from: `"TIIHA Orders" <${process.env.SMTP_USER}>`,
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
            <tbody>${itemsHtml}</tbody>
          </table>
          <p style="margin-top:20px;color:#888;font-size:12px;">Login to your admin panel to manage this order.</p>
        </div>
      `
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Emails sent to customer and admin.' })
    };

  } catch (err) {
    console.error('Email error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email', details: err.message })
    };
  }
};

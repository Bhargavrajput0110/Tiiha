const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { customer_name, customer_email, order_items, total_amount } = JSON.parse(event.body);

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

    let itemsHtml = order_items.map(i => `<li>${i.name} (Size: ${i.size || 'N/A'}) - ₹${i.price.toLocaleString('en-IN')}</li>`).join('');

    const mailOptions = {
      from: `"TIIHA" <${process.env.SMTP_USER}>`,
      to: customer_email,
      subject: 'Order Confirmation — TIIHA',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #A6957A;">Thank you for your order, ${customer_name}!</h2>
          <p>We have successfully received your payment of <strong>₹${total_amount.toLocaleString('en-IN')}</strong>.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <h3>Order Details:</h3>
          <ul>${itemsHtml}</ul>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p>We will notify you once your order is shipped.</p>
          <p>Warm regards,<br><strong>TIIHA Team</strong></p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Email sent successfully' })
    };
  } catch (err) {
    console.error('Email error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email', details: err.message })
    };
  }
};

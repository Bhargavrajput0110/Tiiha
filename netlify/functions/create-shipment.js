const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL || 'admin@tiiha.in';
    const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD || 'AV%lJE3251@bv5YN9Jy8pFJXPEZSGz4G';

    if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Shiprocket credentials not configured' })
      };
    }

    const { orderData, cart, total } = JSON.parse(event.body);

    // 1. Authenticate with Shiprocket
    const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: SHIPROCKET_EMAIL, password: SHIPROCKET_PASSWORD })
    });
    const authData = await authRes.json();

    if (!authData.token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Shiprocket authentication failed' })
      };
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
      pickup_location: "Primary",
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
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, shipment_id: shipData.shipment_id })
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Shiprocket rejected payload', details: shipData })
      };
    }
  } catch (error) {
    console.error("Server Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

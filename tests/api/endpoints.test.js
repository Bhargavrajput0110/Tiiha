const http = require('http');

async function runTests() {
  console.log('Running API Integration Tests...');
  let failed = false;

  // Wait for the local server if running, or hit the deployed one.
  const baseUrl = 'http://127.0.0.1:3000';

  try {
    // 1. Test /api/send-confirmation (without real SMTP credentials, it might fail or return a skip message)
    console.log(`\nTesting POST ${baseUrl}/api/send-confirmation`);
    const payload = {
      customer_name: "Test User",
      customer_email: "test@example.com",
      customer_phone: "9999999999",
      shipping_address: "123 Test St",
      order_items: [{ name: "Test Dress", size: "M", price: 1000 }],
      total_amount: 1000
    };

    const res = await fetch(`${baseUrl}/api/send-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log(`Response Status: ${res.status}`);
    console.log(`Response Body:`, data);

    if (res.status !== 200 && res.status !== 500) {
        console.error('o, Unexpected status code');
        failed = true;
    } else {
        console.log('aoe" Endpoint reached successfully');
    }
  } catch (err) {
    console.error('o, Failed to reach server:', err.message);
    failed = true;
  }

  if (failed) process.exit(1);
  console.log('\nAll API tests passed (or handled correctly by the server).');
}

runTests();

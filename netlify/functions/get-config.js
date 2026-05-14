exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      razorpay_key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_fallback_id'
    })
  };
};

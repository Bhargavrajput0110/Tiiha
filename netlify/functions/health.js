exports.handler = async (event, context) => {
  const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
  
  return {
    statusCode: 200,
    body: JSON.stringify({ 
      status: 'ok', 
      shiprocket: SHIPROCKET_EMAIL ? 'configured' : 'missing credentials',
      timestamp: new Date().toISOString()
    })
  };
};

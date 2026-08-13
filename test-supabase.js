const fetch = require('node-fetch');

async function test() {
  const url = 'https://rswhedtgkfdbhsicllrj.supabase.co/rest/v1/products?select=id,gallery';
  const headers = {
    'apikey': 'sb_publishable_oPYNdCQ6g3PMEoGE6kGyHw_dVmKFoiF',
    'Authorization': 'Bearer sb_publishable_oPYNdCQ6g3PMEoGE6kGyHw_dVmKFoiF'
  };
  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.log("no fetch, trying global fetch");
    try {
      const res = await globalThis.fetch(url, { headers });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } catch(err) {
      console.error(err);
    }
  }
}
test();

const { createClient } = require('@supabase/supabase-js');

async function checkStockType() {
  const supabaseUrl = 'https://rswhedtgkfdbhsicllrj.supabase.co';
  const supabaseKey = 'sb_publishable_oPYNdCQ6g3PMEoGE6kGyHw_dVmKFoiF';
  
  const sb = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await sb.from('products').select('stock').limit(1);
  console.log(data, error);
}

checkStockType();

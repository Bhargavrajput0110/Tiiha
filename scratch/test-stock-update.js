const { createClient } = require('@supabase/supabase-js');

async function checkStockType() {
  const supabaseUrl = 'https://rswhedtgkfdbhsicllrj.supabase.co';
  const supabaseKey = 'sb_publishable_oPYNdCQ6g3PMEoGE6kGyHw_dVmKFoiF';
  
  const sb = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await sb.from('products').update({ stock: { S: 5, M: 0 } }).eq('id', 'TII-01');
  console.log(data, error);
}

checkStockType();

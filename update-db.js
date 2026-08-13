const { createClient } = require('@supabase/supabase-js');

async function updateProducts() {
  const supabaseUrl = 'https://rswhedtgkfdbhsicllrj.supabase.co';
  const supabaseKey = 'sb_publishable_oPYNdCQ6g3PMEoGE6kGyHw_dVmKFoiF';
  
  const sb = createClient(supabaseUrl, supabaseKey);

  const t3Updates = {
    image: 'https://res.cloudinary.com/dlxiy6aiq/image/upload/q_auto/f_auto/v1779694923/IMG_6706_pwwawx.jpg',
    hoverImage: 'https://res.cloudinary.com/dlxiy6aiq/image/upload/q_auto/f_auto/v1779694926/IMG_6704_nejgv1.jpg',
    gallery: '["https://res.cloudinary.com/dlxiy6aiq/image/upload/q_auto/f_auto/v1779694923/IMG_6706_pwwawx.jpg","https://res.cloudinary.com/dlxiy6aiq/image/upload/q_auto/f_auto/v1779694926/IMG_6704_nejgv1.jpg","https://res.cloudinary.com/dlxiy6aiq/image/upload/q_auto/f_auto/v1779694921/IMG_6707_f31zrz.jpg","https://res.cloudinary.com/dlxiy6aiq/image/upload/q_auto/f_auto/v1779694921/IMG_6711_gsjvmi.jpg","https://res.cloudinary.com/dlxiy6aiq/image/upload/q_auto/f_auto/v1779694921/IMG_6708_eal5kc.jpg"]'
  };

  const t6Updates = {
    image: 'https://res.cloudinary.com/dlxiy6aiq/image/upload/q_auto/f_auto/v1779694712/IMG_6712_lj3skh.jpg',
    hoverImage: 'https://res.cloudinary.com/dlxiy6aiq/image/upload/q_auto/f_auto/v1779694711/IMG_6718_cnzo53.jpg',
    gallery: '["https://res.cloudinary.com/dlxiy6aiq/image/upload/q_auto/f_auto/v1779694712/IMG_6712_lj3skh.jpg","https://res.cloudinary.com/dlxiy6aiq/image/upload/q_auto/f_auto/v1779694711/IMG_6718_cnzo53.jpg","https://res.cloudinary.com/dlxiy6aiq/image/upload/q_auto/f_auto/v1779694711/IMG_6717_frho8n.jpg","https://res.cloudinary.com/dlxiy6aiq/image/upload/q_auto/f_auto/v1779694712/IMG_6716_w19s0m.jpg"]'
  };

  try {
    const { data: d1, error: e1 } = await sb.from('products').update(t3Updates).eq('id', 'TII-03');
    if (e1) console.error('Error TII-03:', e1);
    else console.log('TII-03 updated in DB');

    const { data: d2, error: e2 } = await sb.from('products').update(t6Updates).eq('id', 'TII-06');
    if (e2) console.error('Error TII-06:', e2);
    else console.log('TII-06 updated in DB');

  } catch (error) {
    console.error('Update failed:', error);
  }
}

updateProducts();

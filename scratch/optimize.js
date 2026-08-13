const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Switch React from development → production builds
html = html.replace(
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react@18/umd/react.production.min.js'
);
html = html.replace(
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'
);
console.log('✅ 1. Switched React to production builds');

// 2. Remove unused Lucide CDN script
html = html.replace(
  '    <script src="https://unpkg.com/lucide@latest"></script>\n',
  ''
);
console.log('✅ 2. Removed unused Lucide CDN script');

// 3. Fix all unoptimized Cloudinary URLs — add q_auto/f_auto
// Pattern: /image/upload/ followed by IMG_ (no optimization params)
const before = (html.match(/res\.cloudinary\.com\/dlxiy6aiq\/image\/upload\/IMG_/g) || []).length;
html = html.replace(
  /\/image\/upload\/IMG_/g,
  '/image/upload/q_auto/f_auto/IMG_'
);
const after = (html.match(/res\.cloudinary\.com\/dlxiy6aiq\/image\/upload\/q_auto\/f_auto\/IMG_/g) || []).length;
console.log(`✅ 3. Optimized ${before} Cloudinary image URLs (q_auto/f_auto added)`);

// 4. Add DNS prefetch & preconnect hints for CDN domains
const preconnectBlock = `    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`;
const preconnectBlockNew = `    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="dns-prefetch" href="https://unpkg.com">
    <link rel="dns-prefetch" href="https://cdn.tailwindcss.com">
    <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
    <link rel="dns-prefetch" href="https://res.cloudinary.com">
    <link rel="dns-prefetch" href="https://checkout.razorpay.com">`;
html = html.replace(preconnectBlock, preconnectBlockNew);
console.log('✅ 4. Added DNS prefetch hints for all CDN domains');

// 5. Add loading="lazy" to img tags that are missing it
// Only add to non-hero images (skip ones that already have loading attr)
let lazyCount = 0;
html = html.replace(/<img(?![^>]*loading=)([^>]*)(src="https:\/\/res\.cloudinary[^"]*")([^>]*)>/g, (match) => {
  lazyCount++;
  // Insert loading="lazy" before the closing >
  return match.replace('>', ' loading="lazy">');
});
console.log(`✅ 5. Added loading="lazy" to ${lazyCount} missing image tags`);

// Verify
const remaining = (html.match(/res\.cloudinary\.com\/dlxiy6aiq\/image\/upload\/(?!q_auto)(?!f_auto)[^"'\s]+/g) || []);
console.log('');
console.log('=== VERIFICATION ===');
console.log('Remaining unoptimized Cloudinary URLs:', remaining.length);
if (remaining.length > 0) remaining.forEach(u => console.log(' REMAINING:', u));

const reactProd = html.includes('react.production.min.js');
const reactDomProd = html.includes('react-dom.production.min.js');
const lucideGone = !html.includes('unpkg.com/lucide@latest');
const dnsFetch = html.includes('dns-prefetch');
console.log('React production build:', reactProd);
console.log('ReactDOM production build:', reactDomProd);
console.log('Lucide CDN removed:', lucideGone);
console.log('DNS prefetch hints added:', dnsFetch);

fs.writeFileSync('index.html', html, 'utf8');
console.log('');
console.log('✅ index.html saved successfully!');

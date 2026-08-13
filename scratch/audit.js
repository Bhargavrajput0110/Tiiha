const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Check React build type
const isDevReact = html.includes('react.development.js');
const isDevReactDOM = html.includes('react-dom.development.js');

// Check for unused Lucide CDN
const lucideCDN = html.includes('unpkg.com/lucide@latest');
const lucideUsed = html.includes('lucide.') || html.includes('window.lucide');

// Count unoptimized Cloudinary image URLs
const allCloudinary = (html.match(/res\.cloudinary\.com\/dlxiy6aiq\/image\/upload\/[^\s"']+/g) || []);
const unoptimized = allCloudinary.filter(u => !u.includes('q_auto') && !u.includes('f_auto'));
const optimized = allCloudinary.filter(u => u.includes('q_auto'));

// Check lazy loading
const imgTags = (html.match(/<img[^>]+>/g) || []);
const withoutLazy = imgTags.filter(t => !t.includes('loading='));

// Check preconnects already present
const preconnects = (html.match(/rel="preconnect"[^>]+>/g) || []);

console.log('=== OPTIMIZATION AUDIT ===');
console.log('React dev build loaded:', isDevReact, '-> should be production min');
console.log('ReactDOM dev build loaded:', isDevReactDOM, '-> should be production min');
console.log('');
console.log('Lucide CDN script loaded:', lucideCDN);
console.log('Lucide window object used:', lucideUsed, '-> UNUSED, safe to remove');
console.log('');
console.log('Total Cloudinary image URLs:', allCloudinary.length);
console.log('Already optimized (q_auto):', optimized.length);
console.log('UNOPTIMIZED (missing q_auto/f_auto):', unoptimized.length);
console.log('');
console.log('Unoptimized URLs:');
unoptimized.forEach(u => console.log(' -', u));
console.log('');
console.log('img tags without loading=lazy:', withoutLazy.length);
console.log('Existing preconnects:', preconnects.length);
preconnects.forEach(p => console.log(' -', p));

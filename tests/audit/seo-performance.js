const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../index.html');

console.log('Running SEO & Performance Audit...');
let errors = 0;
let warnings = 0;

try {
  const html = fs.readFileSync(filePath, 'utf8');

  // 1. Check Title & Meta Description
  if (!html.includes('<title>')) {
    console.error('o, Missing <title> tag');
    errors++;
  } else {
    console.log('aoe" <title> tag present');
  }

  if (!html.includes('meta name="description"')) {
    console.error('o, Missing meta description');
    errors++;
  } else {
    console.log('aoe" Meta description present');
  }

  // 2. Check Open Graph tags
  if (!html.includes('property="og:title"')) {
    console.warn('a   Missing og:title tag');
    warnings++;
  } else {
    console.log('aoe" Open Graph tags present');
  }

  // 3. Image Performance (Lazy Loading)
  const imgMatches = [...html.matchAll(/<img[^>]*>/g)];
  let imgCount = imgMatches.length;
  let lazyCount = 0;
  
  imgMatches.forEach(match => {
    if (match[0].includes('loading="lazy"')) {
      lazyCount++;
    }
  });

  console.log(`aoe" Images analyzed: ${imgCount}. Lazy loaded: ${lazyCount}.`);
  if (lazyCount < imgCount / 2) {
    console.warn('a   Warning: Less than half of images are lazy-loaded. Consider adding loading="lazy".');
    warnings++;
  }

  // 4. Broken Links / Placeholders
  if (html.includes('href="#"') || html.includes("href='#'")) {
    console.warn('a   Found placeholder href="#" links in the document.');
    warnings++;
  } else {
    console.log('aoe" No placeholder links found.');
  }

  console.log(`\nAudit Complete: ${errors} Errors, ${warnings} Warnings.`);
  if (errors > 0) process.exit(1);

} catch (e) {
  console.error('Failed to read index.html', e);
  process.exit(1);
}

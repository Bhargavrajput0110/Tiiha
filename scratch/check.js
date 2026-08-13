const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`PAGE LOG [${msg.type()}]:`, msg.text());
  });
  
  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.toString());
  });

  page.on('requestfailed', request => {
    console.log(`REQUEST FAILED: ${request.url()} - ${request.failure().errorText}`);
  });

  try {
    await page.goto('https://tiiha.in', { waitUntil: 'networkidle0' });
    console.log('Page loaded completely.');
  } catch (err) {
    console.error('Error navigating:', err);
  }

  await browser.close();
})();

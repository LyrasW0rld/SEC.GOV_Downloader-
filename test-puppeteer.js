const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('Testing puppeteer...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto('https://example.com');
    console.log('Puppeteer success!');
    await browser.close();
  } catch (e) {
    console.error('Puppeteer error:', e);
  }
})();

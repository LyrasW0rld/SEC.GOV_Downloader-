import puppeteer from 'puppeteer';

export async function generatePdf(url: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('SEC-Filing-App user@example.com');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Some SEC filings have a lot of navigation or headers, we could hide them here if needed
    // await page.evaluate(() => { ... });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

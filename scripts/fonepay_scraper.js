const puppeteer = require('puppeteer');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

(async () => {
  console.log('Launching browser...');
  // Launching in non-headless mode so you can see the screen and log in.
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  console.log('Navigating to Fonepay login...');
  await page.goto('https://login.fonepay.com/#/payments', { waitUntil: 'domcontentloaded' });

  console.log('\n======================================================');
  console.log('ACTION REQUIRED:');
  console.log('1. Log in to your Fonepay account in the opened browser window.');
  console.log('2. Complete any OTP / Two-Factor Authentication if required.');
  console.log('3. Go to the page/tab where your Payment/Transaction table is visible.');
  console.log('4. Select the desired date range so all records are on screen.');
  console.log('======================================================\n');

  rl.question('Press ENTER here in this terminal ONLY AFTER you see the transaction data on the browser screen...', async () => {
    console.log('Extracting data from the page...');

    try {
      // Extract data directly from the DOM tables
      const extractedData = await page.evaluate(() => {
        const tables = Array.from(document.querySelectorAll('table'));
        if (tables.length === 0) return null;

        // Find the table with the most rows, assuming that's the data table
        const dataTable = tables.reduce((prev, current) => {
            return (prev.querySelectorAll('tr').length > current.querySelectorAll('tr').length) ? prev : current;
        });

        const rows = Array.from(dataTable.querySelectorAll('tr'));
        const csvData = rows.map(row => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          return cells.map(cell => {
             // Clean up formatting to make it valid CSV
             let text = cell.innerText.trim();
             // Remove newlines and extra spaces
             text = text.replace(/[\n\r]+/g, ' ').replace(/\s{2,}/g, ' ');
             // Escape quotes and wrap in quotes if there are commas
             if (text.includes(',') || text.includes('"')) {
                 text = `"${text.replace(/"/g, '""')}"`;
             }
             return text;
          }).join(',');
        }).join('\n');

        return csvData;
      });

      if (extractedData) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = path.join(__dirname, `scraped_fonepay_${timestamp}.csv`);
        fs.writeFileSync(filename, extractedData);
        console.log(`\n✅ SUCCESS! Data extracted successfully.`);
        console.log(`📁 File saved at: ${filename}`);
      } else {
        console.log('\n❌ ERROR: No tables found on the page. Are you sure the data was visible?');
      }
    } catch (err) {
      console.error('\n❌ Error extracting data:', err.message);
    } finally {
      console.log('Closing browser in 3 seconds...');
      setTimeout(async () => {
        await browser.close();
        rl.close();
        process.exit(0);
      }, 3000);
    }
  });
})();

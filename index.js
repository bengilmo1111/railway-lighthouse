import express from 'express';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

async function runLighthouse(url) {
  const chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] });
  const options = {
    logLevel: 'info',
    output: 'json',
    port: chrome.port,
    emulatedFormFactor: 'desktop',
    maxWaitForLoad: 60000,
  };

  const runnerResult = await lighthouse(url, options);
  await chrome.kill();

  return runnerResult.lhr;
}

function convertToCSV(data) {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const rows = [headers.join(',')];
  data.forEach(row => {
    rows.push(headers.map(header => `"${row[header] ?? ''}"`).join(','));
  });
  return rows.join('\n');
}

// Static list of URLs (update as needed)
const urls = [
  'https://central.xero.com/s/',
  'https://central.xero.com/s/topiccatalog',
  // Add your full list of URLs here
];

app.get('/run-lighthouse', async (req, res) => {
  const csvData = [];

  for (const url of urls) {
    try {
      console.log(`Processing: ${url}`);
      const result = await runLighthouse(url);
      csvData.push({
        url,
        performance: result.categories.performance.score,
        accessibility: result.categories.accessibility.score,
        bestPractices: result.categories['best-practices'].score,
        seo: result.categories.seo.score,
        pwa: result.categories.pwa.score,
      });
    } catch (error) {
      console.error(`Error on ${url}: ${error.message}`);
      csvData.push({ url, error: error.message });
    }
  }

  const csvString = convertToCSV(csvData);
  res.header('Content-Type', 'text/csv');
  res.attachment('lighthouse-results.csv');
  res.send(csvString);
});

app.listen(PORT, () => {
  console.log(`🚀 Lighthouse server running on port ${PORT}`);
});
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../docs/images');
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

async function capture(fruitType, filename) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const url = `http://127.0.0.1:5173/capture/?fruit=${fruitType}`;
  console.log('Capturing', url);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.__CAPTURE_READY__ === true, { timeout: 120000 });
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const file = path.join(outDir, filename);
  await page.screenshot({ path: file, type: 'png' });
  console.log('Saved', file);
  await page.close();
}

await capture('apple', 'preview-apple.png');
await capture('glassBall', 'preview-glass-ball.png');

await browser.close();
console.log('Done.');

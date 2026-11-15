// Refreshes the forward-pass image used in the README.
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
await page.goto('http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Output 1, value/ }).click();
await page.getByRole('button', { name: 'Run forward pass' }).click();
await page.waitForFunction(
  () => document.querySelector('.playback-steps li[aria-current="step"]')?.textContent === 'Multiply',
  null,
  { timeout: 12000 },
);
await page.waitForTimeout(500);
await page.locator('.diagram-panel').screenshot({ path: '../docs/screenshots/forward-pass.png' });
await browser.close();
console.log('forward-pass.png refreshed');

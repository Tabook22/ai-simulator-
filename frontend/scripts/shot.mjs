// Visual check helper: captures the main classroom states for review.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env.SHOT_BASE ?? 'http://127.0.0.1:8000';
const out = process.env.SHOT_DIR ?? 'shots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 1 });

await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/01-explore.png` });
await page.screenshot({ path: `${out}/01-explore-full.png`, fullPage: true });
await page.locator('.diagram-panel').screenshot({ path: `${out}/02-diagram.png` });

await page.getByRole('button', { name: /Output 1, value/ }).click();
await page.waitForTimeout(500);
await page.locator('.diagram-panel').screenshot({ path: `${out}/03-calc.png` });
await page.locator('.inspector').screenshot({ path: `${out}/04-inspector.png` });

await page.getByRole('button', { name: /Output 1, value/ }).click();
await page.getByRole('button', { name: 'Run forward pass' }).click();
await page.waitForTimeout(1700);
await page.getByRole('button', { name: 'Pause', exact: true }).click().catch(() => {});
await page.locator('.diagram-panel').screenshot({ path: `${out}/05-animation.png` });

await page.getByRole('button', { name: 'Teach the network' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Load AND gate' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'One training step' }).click();
await page.waitForTimeout(900);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/06-training.png`, fullPage: true });

await page.setViewportSize({ width: 420, height: 900 });
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/07-mobile.png`, fullPage: true });

await page.setViewportSize({ width: 1440, height: 940 });
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Presentation view' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/08-presentation.png` });
await page.getByRole('button', { name: 'Exit presentation' }).click();

await page.getByRole('button', { name: 'Glossary' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/09-glossary.png` });
await page.getByRole('button', { name: 'Close dialog' }).click();

await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/10-laptop.png` });

await page.setViewportSize({ width: 1920, height: 1080 });
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/11-projector.png` });

await browser.close();
console.log('shots written to', out);

// Focused checks that are awkward to express in the classroom spec.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env.SHOT_BASE ?? 'http://127.0.0.1:8000';
const out = process.env.SHOT_DIR ?? 'shots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });

// 1. Reduced motion still advances the forward pass.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Run forward pass' }).click();
  const started = Date.now();
  await page.getByText('Forward pass complete').waitFor({ timeout: 15000 });
  console.log('reduced motion: finished in', Date.now() - started, 'ms');
  console.log('reduced motion output:', await page.locator('.output-value strong').first().textContent());
  await page.close();
}

// 2. Stage captures with a neuron open, plus confetti.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Output 1, value/ }).click();
  await page.getByRole('button', { name: 'Run forward pass' }).click();
  for (const [stage, name] of [['Add the products', 'sum'], ['Apply the activation rule', 'activate']]) {
    await page.getByText(stage, { exact: true }).waitFor({ timeout: 12000 });
    await page.waitForTimeout(350);
    await page.locator('.diagram-panel').screenshot({ path: `${out}/stage-${name}.png` });
  }
  await page.getByText('Forward pass complete').waitFor({ timeout: 8000 });

  await page.getByRole('button', { name: 'Teach the network' }).click();
  await page.getByRole('button', { name: 'Load AND gate' }).click();
  await page.getByRole('button', { name: 'One training step' }).click();
  await page.waitForTimeout(320);
  await page.screenshot({ path: `${out}/confetti.png` });

  await page.getByRole('button', { name: 'Lessons', exact: true }).click();
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${out}/lessons-dialog.png` });
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.close();
}

await browser.close();
console.log('verification shots written to', out);

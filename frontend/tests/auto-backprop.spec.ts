import { expect, test } from '@playwright/test';

test('auto-trains, keeps the best step, and applies it', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Target 1').fill('1');
  await page.getByRole('button', { name: 'Auto-train' }).click();

  await expect(page.locator('.auto-backprop')).toBeVisible();
  await expect(page.locator('.auto-applied')).toContainText('Best result applied');
  await expect(page.locator('.auto-chart svg')).toBeVisible();
  await expect(page.locator('.auto-best-text')).toContainText('best 1 · step 1');
  await expect(page.locator('.output-value strong').first()).toHaveText('0');

  await page.getByRole('button', { name: 'Run again' }).click();
  await expect(page.locator('.auto-backprop')).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(page.locator('.backprop-setup')).toBeVisible();
});

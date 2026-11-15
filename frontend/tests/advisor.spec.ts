import { expect, test } from '@playwright/test';

test('builds the advisor for the 2 to 3 to 1 house network', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Advisor' }).click();
  await expect(page.locator('.advisor-hero h1')).toContainText('computer and tools');
  await page.getByRole('button', { name: 'Use the house-price setup' }).first().click();

  await expect(page.locator('.advisor-glance h2')).toHaveText('2 → 3 → 1 network');
  const metrics = page.locator('.advisor-metric');
  await expect(metrics.nth(1)).toContainText('13');
  await expect(metrics.nth(1)).toContainText('9 weights + 4 biases');
  await expect(metrics.nth(2)).toContainText('10');
  await expect(metrics.nth(3)).toContainText('200');
  await expect(metrics.nth(4)).toContainText('52 B');
  await expect(page.locator('.advisor-table')).toContainText('linear');
  await expect(page.locator('.advisor-verdict-card.gpu')).toContainText('Unnecessary');
  await expect(page.locator('.advisor-memory .advisor-memory-lead')).toContainText('52 B');
  await expect(page.locator('.advisor-worked')).toContainText('13');
  await expect(page.getByRole('link', { name: /PyTorch install guide/ })).toBeVisible();

  await page.getByLabel('Training examples').fill('1005');
  await expect(metrics.nth(2)).toContainText('11');
  await expect(metrics.nth(3)).toContainText('220');
  await page.getByLabel('Numeric precision').selectOption('float16');
  await expect(metrics.nth(4)).toContainText('26 B');
});
